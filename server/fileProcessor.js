import fs from "fs/promises";
import pdf from "pdf-parse";
import mammoth from "mammoth";
import XLSX from "xlsx";
import { parse } from "csv-parse/sync";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_TEXT_SIZE = 1 * 1024 * 1024; // 1MB
// Rough estimate: 1 token ≈ 4 characters
// Limit extracted text to ~50k tokens (200k chars) to leave room for conversation
const MAX_EXTRACTED_TEXT_CHARS = 200000;

/**
 * Process an image file into a Claude-compatible image content block
 */
async function processImage(filePath, mimeType) {
  const buffer = await fs.readFile(filePath);
  if (buffer.length > MAX_IMAGE_SIZE) {
    throw new Error("Image exceeds 5MB limit");
  }
  return {
    type: "image",
    source: {
      type: "base64",
      media_type: mimeType,
      data: buffer.toString("base64"),
    },
  };
}

/**
 * Process a PDF file into a Claude-compatible document content block
 * For PDFs over 100 pages, extract text content instead
 */
async function processPDF(filePath) {
  const buffer = await fs.readFile(filePath);
  if (buffer.length > MAX_DOCUMENT_SIZE) {
    throw new Error("PDF exceeds 5MB limit");
  }

  // First, check page count using pdf-parse
  let pdfData;
  try {
    pdfData = await pdf(buffer);
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }

  // Claude API has a 100 page limit for PDF documents
  // If over 100 pages, extract text instead
  if (pdfData.numpages > 100) {
    let text = pdfData.text;
    let truncated = false;

    // Check if extracted text exceeds token limits
    if (text.length > MAX_EXTRACTED_TEXT_CHARS) {
      text = text.substring(0, MAX_EXTRACTED_TEXT_CHARS);
      truncated = true;
    }

    const header = `PDF Document (${pdfData.numpages} pages - text extracted due to page limit${truncated ? ", content truncated to fit context limits" : ""}):\n\n`;

    return {
      type: "text",
      text:
        header +
        text +
        (truncated ? "\n\n[Content truncated - document too large]" : ""),
    };
  }

  // For PDFs under 100 pages, send as document
  return {
    type: "document",
    source: {
      type: "base64",
      media_type: "application/pdf",
      data: buffer.toString("base64"),
    },
  };
}

/**
 * Process a plain text file into a text content block
 */
async function processText(filePath) {
  const buffer = await fs.readFile(filePath);
  if (buffer.length > MAX_TEXT_SIZE) {
    throw new Error("Text file exceeds 1MB limit");
  }
  let text = buffer.toString("utf-8");

  if (text.length > MAX_EXTRACTED_TEXT_CHARS) {
    text =
      text.substring(0, MAX_EXTRACTED_TEXT_CHARS) +
      "\n\n[Content truncated - file too large]";
  }

  return {
    type: "text",
    text: text,
  };
}

/**
 * Process a CSV file into a formatted text content block
 */
async function processCSV(filePath) {
  const buffer = await fs.readFile(filePath);
  if (buffer.length > MAX_TEXT_SIZE) {
    throw new Error("CSV file exceeds 1MB limit");
  }

  const content = buffer.toString("utf-8");
  const records = parse(content, {
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
    text: formattedText,
  };
}

/**
 * Process a Word document (DOCX) into a text content block
 */
async function processWord(filePath) {
  const buffer = await fs.readFile(filePath);
  if (buffer.length > MAX_TEXT_SIZE) {
    throw new Error("Word document exceeds 1MB limit");
  }

  const result = await mammoth.extractRawText({ buffer });
  let text = result.value;
  let truncated = false;

  if (text.length > MAX_EXTRACTED_TEXT_CHARS) {
    text = text.substring(0, MAX_EXTRACTED_TEXT_CHARS);
    truncated = true;
  }

  return {
    type: "text",
    text: `Word Document Content${truncated ? " (truncated)" : ""}:\n\n${text}${truncated ? "\n\n[Content truncated - document too large]" : ""}`,
  };
}

/**
 * Process an Excel spreadsheet into a formatted text content block
 */
async function processExcel(filePath) {
  const buffer = await fs.readFile(filePath);
  if (buffer.length > MAX_TEXT_SIZE) {
    throw new Error("Excel file exceeds 1MB limit");
  }

  const workbook = XLSX.read(buffer, { type: "buffer" });
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
      const row = data[i];
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
    text: formattedText,
  };
}

/**
 * Process a PowerPoint file (PPTX) into a text content block
 * Note: This is a basic implementation. PowerPoint text extraction
 * requires more complex parsing. For now, we'll provide a placeholder.
 */
async function processPowerPoint(filePath) {
  const buffer = await fs.readFile(filePath);
  if (buffer.length > MAX_TEXT_SIZE) {
    throw new Error("PowerPoint file exceeds 1MB limit");
  }

  // For MVP, we'll return a message explaining the limitation
  // In a production system, you'd use a library like officegen or a similar parser
  return {
    type: "text",
    text: "PowerPoint Presentation: [Text extraction from PowerPoint files is not yet fully implemented. Please export your presentation as a PDF for full content analysis.]",
  };
}

/**
 * Main file processor function that routes to the appropriate handler
 * based on file MIME type
 */
export async function processFile(fileMetadata, filePath) {
  const { mime_type, original_name } = fileMetadata;

  try {
    // Images
    if (mime_type.startsWith("image/")) {
      return await processImage(filePath, mime_type);
    }

    // PDFs
    if (mime_type === "application/pdf") {
      return await processPDF(filePath);
    }

    // Plain text
    if (mime_type === "text/plain") {
      return await processText(filePath);
    }

    // CSV
    if (mime_type === "text/csv") {
      return await processCSV(filePath);
    }

    // Word documents (.docx only)
    if (
      mime_type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      return await processWord(filePath);
    }

    // Excel spreadsheets (.xlsx only)
    if (
      mime_type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      return await processExcel(filePath);
    }

    // PowerPoint presentations (.pptx only)
    if (
      mime_type ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ) {
      return await processPowerPoint(filePath);
    }

    throw new Error(`Unsupported file type: ${mime_type}`);
  } catch (error) {
    // Re-throw with file context
    throw new Error(`Failed to process ${original_name}: ${error.message}`);
  }
}
