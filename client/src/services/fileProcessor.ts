import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_TEXT_SIZE = 1 * 1024 * 1024; // 1MB
// Rough estimate: 1 token ≈ 4 characters
// Limit extracted text to ~50k tokens (200k chars) to leave room for conversation
const MAX_EXTRACTED_TEXT_CHARS = 200000;

// Lazy-loaded libraries
let pdfjsLib: typeof import("pdfjs-dist") | null = null;
let mammoth: typeof import("mammoth") | null = null;
let XLSX: typeof import("xlsx") | null = null;
let csvParse: typeof import("csv-parse/sync") | null = null;

async function getPdfjsLib() {
  if (!pdfjsLib) {
    pdfjsLib = await import("pdfjs-dist");
    // Configure worker for PDF.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
  }
  return pdfjsLib;
}

async function getMammoth() {
  if (!mammoth) {
    mammoth = await import("mammoth");
  }
  return mammoth;
}

async function getXLSX() {
  if (!XLSX) {
    XLSX = await import("xlsx");
  }
  return XLSX;
}

async function getCsvParse() {
  if (!csvParse) {
    csvParse = await import("csv-parse/sync");
  }
  return csvParse;
}

export interface ProcessedFile {
  type: "image" | "document" | "text";
  data: string; // base64 for images/PDFs, extracted text for others
  mimeType?: string; // only for images and PDFs
}

/**
 * Helper to read a file as ArrayBuffer
 */
function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Helper to read a file as text
 */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

/**
 * Helper to convert ArrayBuffer to base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Process an image file into a Claude-compatible image content block
 */
async function processImage(
  file: File,
  mimeType: string,
): Promise<ProcessedFile> {
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Image exceeds 5MB limit");
  }

  const buffer = await readFileAsArrayBuffer(file);
  const base64 = arrayBufferToBase64(buffer);

  return {
    type: "image",
    data: base64,
    mimeType,
  };
}

/**
 * Process a PDF file into a Claude-compatible document content block
 * For PDFs over 100 pages, extract text content instead
 */
async function processPDF(file: File): Promise<ProcessedFile> {
  if (file.size > MAX_DOCUMENT_SIZE) {
    throw new Error("PDF exceeds 5MB limit");
  }

  const pdfjs = await getPdfjsLib();

  // Create a blob URL for the file
  const url = URL.createObjectURL(file);

  // Load PDF document
  let pdfDoc;
  try {
    const loadingTask = pdfjs.getDocument({
      url: url,
      verbosity: 0 // Suppress warnings
    });
    pdfDoc = await loadingTask.promise;
  } catch (error) {
    URL.revokeObjectURL(url);
    throw new Error(
      `Failed to parse PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  const numPages = pdfDoc.numPages;

  // Claude API has a 100 page limit for PDF documents
  // Also extract text for files >100KB to avoid token limit issues with base64 encoding
  // Base64 encoding increases size by ~33%, and each base64 char ≈ 1 token
  // 100KB → 133KB base64 → ~136k tokens (leaving room for other content)
  const shouldExtractText = numPages > 100 || file.size > 100 * 1024;

  if (shouldExtractText) {
    let text = "";

    // Extract text from all pages
    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(" ");
      text += pageText + "\n";
    }

    // Clean up blob URL
    URL.revokeObjectURL(url);

    let truncated = false;

    // Check if extracted text exceeds token limits
    if (text.length > MAX_EXTRACTED_TEXT_CHARS) {
      text = text.substring(0, MAX_EXTRACTED_TEXT_CHARS);
      truncated = true;
    }

    const reason = numPages > 100 ? "page limit" : "file size";
    const header = `PDF Document (${numPages} pages - text extracted due to ${reason}${truncated ? ", content truncated to fit context limits" : ""}):\n\n`;

    return {
      type: "text",
      data:
        header +
        text +
        (truncated ? "\n\n[Content truncated - document too large]" : ""),
    };
  }

  // For PDFs under 100 pages, send as document
  // Read file as ArrayBuffer for base64 encoding
  const arrayBuffer = await file.arrayBuffer();
  URL.revokeObjectURL(url);

  const base64 = arrayBufferToBase64(arrayBuffer);

  return {
    type: "document",
    data: base64,
    mimeType: "application/pdf",
  };
}

/**
 * Process a plain text file into a text content block
 */
async function processText(file: File): Promise<ProcessedFile> {
  if (file.size > MAX_TEXT_SIZE) {
    throw new Error("Text file exceeds 1MB limit");
  }

  let text = await readFileAsText(file);

  if (text.length > MAX_EXTRACTED_TEXT_CHARS) {
    text =
      text.substring(0, MAX_EXTRACTED_TEXT_CHARS) +
      "\n\n[Content truncated - file too large]";
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

  const content = await readFileAsText(file);
  const csvParse = await getCsvParse();

  const records = csvParse.parse(content, {
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

  const buffer = await readFileAsArrayBuffer(file);
  const mammoth = await getMammoth();

  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
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

  const buffer = await readFileAsArrayBuffer(file);
  const XLSX = await getXLSX();

  const workbook = XLSX.read(buffer, { type: "array" });
  let formattedText = "Excel Spreadsheet Content:\n\n";

  // Process each sheet
  workbook.SheetNames.forEach((sheetName, index) => {
    if (index > 0) formattedText += "\n\n";
    formattedText += `Sheet: ${sheetName}\n`;
    formattedText += "---\n";

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Limit rows for readability
    const rowsToShow = Math.min(data.length, 50);
    for (let i = 0; i < rowsToShow; i++) {
      const row = data[i] as unknown[];
      if (row && row.length > 0) {
        formattedText += row.join(" | ") + "\n";
      }
    }

    if (data.length > 50) {
      formattedText += `\n... and ${data.length - 50} more rows in this sheet`;
    }
  });

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
 * Process a PowerPoint file (PPTX) into a text content block
 * Note: This is a basic implementation. PowerPoint text extraction
 * requires more complex parsing. For now, we'll provide a placeholder.
 */
async function processPowerPoint(): Promise<ProcessedFile> {
  // For MVP, we'll return a message explaining the limitation
  // In a production system, you'd use a library like officegen or a similar parser
  return {
    type: "text",
    data: "PowerPoint Presentation: [Text extraction from PowerPoint files is not yet fully implemented. Please export your presentation as a PDF for full content analysis.]",
  };
}

/**
 * Main file processor function that routes to the appropriate handler
 * based on file MIME type
 */
export async function processFile(file: File): Promise<ProcessedFile> {
  const mimeType = file.type;
  const fileName = file.name;

  try {
    // Images
    if (mimeType.startsWith("image/")) {
      return await processImage(file, mimeType);
    }

    // PDFs
    if (mimeType === "application/pdf") {
      return await processPDF(file);
    }

    // Plain text
    if (mimeType === "text/plain") {
      return await processText(file);
    }

    // CSV
    if (mimeType === "text/csv") {
      return await processCSV(file);
    }

    // Word documents (.docx only)
    if (
      mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      return await processWord(file);
    }

    // Excel spreadsheets (.xlsx only)
    if (
      mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      return await processExcel(file);
    }

    // PowerPoint presentations (.pptx only)
    if (
      mimeType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ) {
      return await processPowerPoint();
    }

    throw new Error(`Unsupported file type: ${mimeType}`);
  } catch (error) {
    // Re-throw with file context
    throw new Error(
      `Failed to process ${fileName}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
