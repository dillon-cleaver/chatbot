import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { processFile } from "./fileProcessor";

/**
 * Helper to create a File object with the given content, name, and MIME type.
 */
function createFile(
  content: string | ArrayBuffer,
  name: string,
  type: string
): File {
  const blob =
    typeof content === "string" ? new Blob([content], { type }) : new Blob([content], { type });
  return new File([blob], name, { type });
}

describe("processFile", () => {
  describe("file type routing", () => {
    it("should process plain text files", async () => {
      const file = createFile("hello world", "test.txt", "text/plain");
      const result = await processFile(file);
      expect(result.type).toBe("text");
      expect(result.data).toBe("hello world");
    });

    it("should process image files", async () => {
      const file = createFile("fake-image-data", "photo.png", "image/png");
      const result = await processFile(file);
      expect(result.type).toBe("image");
      expect(result.mimeType).toBe("image/png");
      // data should be base64 encoded
      expect(typeof result.data).toBe("string");
      expect(result.data.length).toBeGreaterThan(0);
    });

    it("should reject unsupported MIME types", async () => {
      const file = createFile("data", "test.xyz", "application/octet-stream");
      await expect(processFile(file)).rejects.toThrow("Unsupported file type");
    });
  });

  describe("extension fallback", () => {
    it("should fall back to extension when MIME type is empty", async () => {
      const file = createFile("hello", "readme.txt", "");
      const result = await processFile(file);
      expect(result.type).toBe("text");
      expect(result.data).toBe("hello");
    });

    it("should infer image/png from .png extension", async () => {
      const file = createFile("fake-png", "image.png", "");
      const result = await processFile(file);
      expect(result.type).toBe("image");
      expect(result.mimeType).toBe("image/png");
    });

    it("should throw for unknown extension with empty MIME type", async () => {
      const file = createFile("data", "file.xyz", "");
      await expect(processFile(file)).rejects.toThrow("Unsupported file type");
    });
  });

  describe("size limits", () => {
    it("should reject images over 5MB", async () => {
      const largeContent = new ArrayBuffer(6 * 1024 * 1024);
      const file = new File([largeContent], "big.png", { type: "image/png" });
      await expect(processFile(file)).rejects.toThrow("Image exceeds 5MB limit");
    });

    it("should reject text files over 1MB", async () => {
      const largeText = "x".repeat(1.5 * 1024 * 1024);
      const file = createFile(largeText, "big.txt", "text/plain");
      await expect(processFile(file)).rejects.toThrow(
        "Text file exceeds 1MB limit"
      );
    });

    it("should reject CSV files over 1MB", async () => {
      const largeCSV = "a,b\n" + "x,y\n".repeat(500000);
      const file = createFile(largeCSV, "big.csv", "text/csv");
      await expect(processFile(file)).rejects.toThrow(
        "CSV file exceeds 1MB limit"
      );
    });
  });

  describe("text truncation", () => {
    it("should truncate text files exceeding character limit", async () => {
      // MAX_EXTRACTED_TEXT_CHARS = 200000
      const longText = "a".repeat(250000);
      const file = createFile(longText, "long.txt", "text/plain");
      const result = await processFile(file);
      expect(result.data).toContain("[Content truncated");
      expect(result.data.length).toBeLessThan(longText.length);
    });
  });

  describe("CSV processing", () => {
    it("should format CSV as markdown table", async () => {
      const csv = "name,age\nAlice,30\nBob,25";
      const file = createFile(csv, "data.csv", "text/csv");
      const result = await processFile(file);
      expect(result.type).toBe("text");
      expect(result.data).toContain("name");
      expect(result.data).toContain("Alice");
      expect(result.data).toContain("---");
    });

    it("should escape pipe characters in CSV cells", async () => {
      const csv = "col1,col2\nfoo|bar,baz";
      const file = createFile(csv, "pipes.csv", "text/csv");
      const result = await processFile(file);
      expect(result.data).toContain("foo\\|bar");
      expect(result.data).not.toMatch(/foo\|bar/);
    });

    it("should normalize newlines in CSV cells", async () => {
      // csv-parse handles quoted fields with newlines
      const csv = 'col1,col2\n"line1\nline2",value';
      const file = createFile(csv, "newlines.csv", "text/csv");
      const result = await processFile(file);
      // The newline inside the cell should be replaced with a space
      expect(result.data).toContain("line1 line2");
    });
  });

  describe("PPTX processing", () => {
    async function createPptx(slides: string[][]): Promise<ArrayBuffer> {
      const zip = new JSZip();
      slides.forEach((texts, i) => {
        const slideXml = `<?xml version="1.0" encoding="UTF-8"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree>${texts
    .map(
      (t) => `<p:sp><p:txBody><a:p><a:r><a:t>${t}</a:t></a:r></a:p></p:txBody></p:sp>`
    )
    .join("")}</p:spTree></p:cSld>
</p:sld>`;
        zip.file(`ppt/slides/slide${i + 1}.xml`, slideXml);
      });
      return zip.generateAsync({ type: "arraybuffer" });
    }

    it("should extract text from PPTX slides", async () => {
      const buffer = await createPptx([["Hello World"], ["Second Slide"]]);
      const file = new File([buffer], "test.pptx", {
        type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      });
      const result = await processFile(file);
      expect(result.type).toBe("text");
      expect(result.data).toContain("Hello World");
      expect(result.data).toContain("Second Slide");
      expect(result.data).toContain("Slide 1");
      expect(result.data).toContain("Slide 2");
      expect(result.data).toContain("2 slides");
    });

    it("should handle PPTX with multiple text elements per slide", async () => {
      const buffer = await createPptx([["Title", "Subtitle", "Body text"]]);
      const file = new File([buffer], "multi.pptx", {
        type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      });
      const result = await processFile(file);
      expect(result.data).toContain("Title");
      expect(result.data).toContain("Subtitle");
      expect(result.data).toContain("Body text");
    });

    it("should throw for PPTX with no slides", async () => {
      const zip = new JSZip();
      zip.file("ppt/presentation.xml", "<presentation/>");
      const buffer = await zip.generateAsync({ type: "arraybuffer" });
      const file = new File([buffer], "empty.pptx", {
        type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      });
      await expect(processFile(file)).rejects.toThrow("No slides found");
    });
  });

  describe("error context", () => {
    it("should include filename in error messages", async () => {
      const file = createFile("data", "mystery.xyz", "application/unknown");
      await expect(processFile(file)).rejects.toThrow("mystery.xyz");
    });
  });
});
