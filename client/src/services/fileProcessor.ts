// Lazy imports for file processing libraries
// These will be loaded dynamically when needed to avoid blocking app startup
let pdfjsLib: typeof import("pdfjs-dist") | null = null;
let mammoth: typeof import("mammoth") | null = null;
let XLSX: typeof import("xlsx") | null = null;
let csvParse: typeof import("csv-parse/sync") | null = null;

// Lazy load PDF.js
async function getPdfjsLib() {
  if (!pdfjsLib) {
    pdfjsLib = await import("pdfjs-dist");
    // Configure PDF.js worker
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    } catch {
      // Fallback to local worker if CDN fails
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.js",
        import.meta.url
      ).toString();
    }
  }
  return pdfjsLib;
}

// Lazy load mammoth
async function getMammoth() {
  if (!mammoth) {
    mammoth = await import("mammoth");
  }
  return mammoth;
}

// Lazy load XLSX
async function getXLSX() {
  if (!XLSX) {
    XLSX = await import("xlsx");
  }
  return XLSX;
}

// Lazy load csv-parse
async function getCsvParse() {
  if (!csvParse) {
    csvParse = await import("csv-parse/sync");
  }
  return csvParse;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_TEXT_SIZE = 1 * 1024 * 1024; // 1MB
const MAX_EXTRACTED_TEXT_CHARS = 200000;

export interface ProcessedFile {
  type: "image" | "document" | "text";
  data: string; // base64 or text content
  mimeType?: string;
}

/**
 * Convert File to base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convert File to text string
 */
function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Process an image file into a base64 content block
 */
async function processImage(file: File): Promise<ProcessedFile> {
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Image exceeds 5MB limit");
  }

  const base64 = await fileToBase64(file);
  return {
    type: "image",
    data: base64,
    mimeType: file.type,
  };
}

/**
 * Process a PDF file into a document content block or text
 */
async function processPDF(file: File): Promise<ProcessedFile> {
  if (file.size > MAX_DOCUMENT_SIZE) {
    throw new Error("PDF exceeds 5MB limit");
  }

  try {
    const pdfjs = await getPdfjsLib();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

    // Claude API has a 100 page limit for PDF documents
    // If over 100 pages, extract text instead
    if (pdf.numPages > 100) {
      let fullText = "";
      for (let i = 1; i <= Math.min(pdf.numPages, 200); i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ");
        fullText += pageText + "\n";
      }

      let truncated = false;
      if (fullText.length > MAX_EXTRACTED_TEXT_CHARS) {
        fullText = fullText.substring(0, MAX_EXTRACTED_TEXT_CHARS);
        truncated = true;
      }

      const header = `PDF Document (${pdf.numPages} pages - text extracted due to page limit${truncated ? ", content truncated to fit context limits" : ""}):\n\n`;

      return {
        type: "text",
        data: header + fullText + (truncated ? "\n\n[Content truncated - document too large]" : ""),
      };
    }

    // For PDFs under 100 pages, send as document
    const base64 = await fileToBase64(file);
    return {
      type: "document",
      data: base64,
      mimeType: "application/pdf",
    };
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Process a plain text file into a text content block
 */
async function processText(file: File): Promise<ProcessedFile> {
  if (file.size > MAX_TEXT_SIZE) {
    throw new Error("Text file exceeds 1MB limit");
  }

  let text = await fileToText(file);

  if (text.length > MAX_EXTRACTED_TEXT_CHARS) {
    text = text.substring(0, MAX_EXTRACTED_TEXT_CHARS) + "\n\n[Content truncated - file too large]";
  }

  return {
    type: "text",
    data: text,
  };
}

/**
 * Process a CSV file into a formatted text content block
 */
async function processCSV(file: File): Promise<ProcessedFile> {
  if (file.size > MAX_TEXT_SIZE) {
    throw new Error("CSV file exceeds 1MB limit");
  }

  const csvParseLib = await getCsvParse();
  const content = await fileToText(file);
  const records = csvParseLib.parse(content, {
    columns: true,
    skip_empty_lines: true,
  });

  // Format as a readable table
  let formattedText = "CSV Data:\n\n";
  if (records.length > 0) {
    // Add headers
    const headers = Object.keys(records[0]);
    formattedText += headers.join(" | ") + "\n";
    formattedText += headers.map(() => "---").join(" | ") + "\n";

    // Add rows (limit to 100 rows for readability)
    const rowsToShow = Math.min(records.length, 100);
    for (let i = 0; i < rowsToShow; i++) {
      const row = records[i];
      formattedText += headers.map((h) => row[h] || "").join(" | ") + "\n";
    }

    if (records.length > 100) {
      formattedText += `\n... and ${records.length - 100} more rows`;
    }
  }

  // Check for truncation
  if (formattedText.length > MAX_EXTRACTED_TEXT_CHARS) {
    formattedText =
      formattedText.substring(0, MAX_EXTRACTED_TEXT_CHARS) +
      "\n\n[Content truncated - file too large]";
  }

  return {
    type: "text",
    data: formattedText,
  };
}

/**
 * Process a Word document (DOCX) into a text content block
 */
async function processWord(file: File): Promise<ProcessedFile> {
  if (file.size > MAX_TEXT_SIZE) {
    throw new Error("Word document exceeds 1MB limit");
  }

  const mammothLib = await getMammoth();
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammothLib.extractRawText({ arrayBuffer });
  let text = result.value;
  let truncated = false;

  if (text.length > MAX_EXTRACTED_TEXT_CHARS) {
    text = text.substring(0, MAX_EXTRACTED_TEXT_CHARS);
    truncated = true;
  }

  return {
    type: "text",
    data: `Word Document Content${truncated ? " (truncated)" : ""}:\n\n${text}${truncated ? "\n\n[Content truncated - document too large]" : ""}`,
  };
}

/**
 * Process an Excel spreadsheet into a formatted text content block
 */
async function processExcel(file: File): Promise<ProcessedFile> {
  if (file.size > MAX_TEXT_SIZE) {
    throw new Error("Excel file exceeds 1MB limit");
  }

  const XLSXLib = await getXLSX();
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSXLib.read(arrayBuffer, { type: "array" });
  let formattedText = "Excel Spreadsheet Content:\n\n";

  // Process each sheet
  for (let index = 0; index < workbook.SheetNames.length; index++) {
    const sheetName = workbook.SheetNames[index];
    if (index > 0) formattedText += "\n\n";
    formattedText += `Sheet: ${sheetName}\n`;
    formattedText += "---\n";

    const sheet = workbook.Sheets[sheetName];
    const data = XLSXLib.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

    // Limit rows for readability
    const rowsToShow = Math.min(data.length, 50);
    for (let i = 0; i < rowsToShow; i++) {
      const row = data[i];
      if (row && row.length > 0) {
        formattedText += row.join(" | ") + "\n";
      }
    }

    if (data.length > 50) {
      formattedText += `\n... and ${data.length - 50} more rows in this sheet`;
    }
  }

  // Check for truncation
  if (formattedText.length > MAX_EXTRACTED_TEXT_CHARS) {
    formattedText =
      formattedText.substring(0, MAX_EXTRACTED_TEXT_CHARS) +
      "\n\n[Content truncated - document too large]";
  }

  return {
    type: "text",
    data: formattedText,
  };
}

/**
 * Main file processor function that routes to the appropriate handler
 * based on file MIME type
 */
export async function processFile(file: File): Promise<ProcessedFile> {
  const { type, name } = file;

  try {
    // Images
    if (type.startsWith("image/")) {
      return await processImage(file);
    }

    // PDFs
    if (type === "application/pdf") {
      return await processPDF(file);
    }

    // Plain text
    if (type === "text/plain") {
      return await processText(file);
    }

    // CSV
    if (type === "text/csv") {
      return await processCSV(file);
    }

    // Word documents (.docx only)
    if (
      type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      return await processWord(file);
    }

    // Excel spreadsheets (.xlsx only)
    if (
      type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      return await processExcel(file);
    }

    throw new Error(`Unsupported file type: ${type}`);
  } catch (error) {
    // Re-throw with file context
    throw new Error(`Failed to process ${name}: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
