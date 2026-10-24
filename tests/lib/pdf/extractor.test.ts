// @vitest-environment node
import { describe, expect, it } from "vitest";
import { extractPdfText } from "@/lib/pdf/extractor";
import { MAX_FILE_SIZE_BYTES } from "@/lib/limits/config";

describe("extractPdfText", () => {
  it("rejects files larger than the 5 MB limit", async () => {
    const file = new File([new Uint8Array(MAX_FILE_SIZE_BYTES + 1)], "large.pdf", {
      type: "application/pdf",
    });
    await expect(extractPdfText(file)).rejects.toMatchObject({ code: "FILE_TOO_LARGE" });
  });

  it("rejects unsupported file types", async () => {
    const file = new File([new Uint8Array(8)], "note.txt", { type: "text/plain" });
    await expect(extractPdfText(file)).rejects.toMatchObject({ code: "UNSUPPORTED_TYPE" });
  });

  it("rejects corrupt PDFs", async () => {
    const content = Buffer.from("%PDF-1.4\nthis document is corrupt and not valid");
    const file = new File([content], "corrupt.pdf", { type: "application/pdf" });
    await expect(extractPdfText(file)).rejects.toMatchObject({ code: "CORRUPT" });
  });

  it("rejects password-protected PDFs", async () => {
    const content = Buffer.from("%PDF-1.4\n/Encrypt");
    const file = new File([content], "protected.pdf", { type: "application/pdf" });
    await expect(extractPdfText(file)).rejects.toMatchObject({ code: "PASSWORD_PROTECTED" });
  });
});
