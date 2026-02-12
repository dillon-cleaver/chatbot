import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_TEXT_SIZE = 1 * 1024 * 1024; // 1MB
// Rough estimate: 1 token ≈ 4 characters
// Limit extracted text to ~50k tokens (200k chars) to leave room for conversation
const MAX_EXTRACTED_TEXT_CHARS = 200000;
const MAX_PDF_PAGES_TO_EXTRACT = 500;

// Lazy-loaded libraries
let pdfjsLib: typeof import("pdfjs-dist") | null = null;
let mammoth: typeof import("mammoth") | null = null;
let XLSX: typeof import("xlsx") | null = null;
let csvParse: typeof import("csv-parse/sync") | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let JSZipCtor: any = null;

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

async function getJSZip(): Promise<typeof import("jszip")> {
  if (!JSZipCtor) {
    const mod = await import("jszip");
    JSZipCtor = mod.default ?? mod;
  }
  return JSZipCtor;
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
/**
 * Escape pipe and newline characters for markdown table cells
 */
function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

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
    let truncated = false;
    const pagesToExtract = Math.min(numPages, MAX_PDF_PAGES_TO_EXTRACT);

    try {
      for (let i = 1; i <= pagesToExtract; i++) {
        const page = await pdfDoc.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(" ");
        text += pageText + "\n";

        if (text.length > MAX_EXTRACTED_TEXT_CHARS) {
          text = text.substring(0, MAX_EXTRACTED_TEXT_CHARS);
          truncated = true;
          break;
        }
      }
    } finally {
      try { (pdfDoc as unknown as { destroy?: () => void })?.destroy?.(); } catch { /* ignore */ }
      URL.revokeObjectURL(url);
    }

    if (pagesToExtract < numPages) {
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
  try { (pdfDoc as unknown as { destroy?: () => void })?.destroy?.(); } catch { /* ignore */ }
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
    formattedText += headers.map(escapeCell).join(" | ") + "\n";
    formattedText += headers.map(() => "---").join(" | ") + "\n";

    // Add rows (limit to 100 rows for readability)
    const rowsToShow = Math.min(records.length, 100);
    for (let i = 0; i < rowsToShow; i++) {
      const row = records[i];
      formattedText += headers.map((h) => escapeCell(row[h] || "")).join(" | ") + "\n";
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
        formattedText += row.map((cell) => escapeCell(String(cell ?? ""))).join(" | ") + "\n";
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
 * Process a PowerPoint file (PPTX) into a text content block.
 * PPTX files are ZIP archives containing XML slides in ppt/slides/slide*.xml.
 * Text content lives in <a:t> tags within the DrawingML namespace.
 */
async function processPowerPoint(file: File): Promise<ProcessedFile> {
  if (file.size > MAX_TEXT_SIZE) {
    throw new Error("PowerPoint file exceeds 1MB limit");
  }

  const buffer = await readFileAsArrayBuffer(file);
  const JSZipLib = await getJSZip();
  const zip = await JSZipLib.loadAsync(buffer);

  // Find all slide XML files and sort by slide number
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] ?? "0");
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] ?? "0");
      return numA - numB;
    });

  if (slideFiles.length === 0) {
    throw new Error("No slides found in PowerPoint file");
  }

  const parser = new DOMParser();
  let text = "";

  for (const slidePath of slideFiles) {
    const slideNum = slidePath.match(/slide(\d+)/)?.[1] ?? "?";
    const xml = await zip.files[slidePath].async("text");
    const doc = parser.parseFromString(xml, "application/xml");

    // Extract text from <a:t> tags (DrawingML text elements)
    const textNodes = doc.getElementsByTagNameNS(
      "http://schemas.openxmlformats.org/drawingml/2006/main",
      "t"
    );

    const slideTexts: string[] = [];
    for (let i = 0; i < textNodes.length; i++) {
      const content = textNodes[i].textContent?.trim();
      if (content) slideTexts.push(content);
    }

    if (slideTexts.length > 0) {
      text += `--- Slide ${slideNum} ---\n${slideTexts.join("\n")}\n\n`;
    }

    if (text.length > MAX_EXTRACTED_TEXT_CHARS) {
      text = text.substring(0, MAX_EXTRACTED_TEXT_CHARS);
      return {
        type: "text",
        data: `PowerPoint Presentation (${slideFiles.length} slides, truncated):\n\n${text}\n\n[Content truncated - presentation too large]`,
      };
    }
  }

  return {
    type: "text",
    data: `PowerPoint Presentation (${slideFiles.length} slides):\n\n${text}`,
  };
}

/**
 * Infer MIME type from file extension when the browser provides an empty or unrecognized type
 */
function inferMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    pdf: "application/pdf",
    txt: "text/plain",
    csv: "text/csv",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };
  return ext ? (mimeMap[ext] ?? "") : "";
}

export async function processFile(file: File): Promise<ProcessedFile> {
  const mimeType = file.type || inferMimeType(file.name);
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
      return await processPowerPoint(file);
    }

    throw new Error(`Unsupported file type: ${mimeType || "(empty)"}`);
  } catch (error) {
    // Re-throw with file context
    throw new Error(
      `Failed to process ${fileName}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
