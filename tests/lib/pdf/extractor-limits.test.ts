// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_PAGES, MAX_TEXT_LENGTH } from "@/lib/limits/config";

const parserMocks = vi.hoisted(() => ({
  getInfo: vi.fn(),
  getText: vi.fn(),
  destroy: vi.fn(),
}));

vi.mock("pdf-parse", () => ({
  PDFParse: class {
    getInfo = parserMocks.getInfo;
    getText = parserMocks.getText;
    destroy = parserMocks.destroy;
  },
  PasswordException: class PasswordException extends Error {},
}));

import { extractPdfText } from "@/lib/pdf/extractor";

function pdfFile(): File {
  return new File([Buffer.from("%PDF-1.4\nfake body")], "offer.pdf", {
    type: "application/pdf",
  });
}

beforeEach(() => {
  parserMocks.getInfo.mockReset();
  parserMocks.getText.mockReset();
  parserMocks.destroy.mockReset();
  parserMocks.destroy.mockResolvedValue(undefined);
});

describe("extractPdfText limits", () => {
  it("rejects documents over the page limit before extracting text", async () => {
    parserMocks.getInfo.mockResolvedValue({ total: MAX_PAGES + 1 });

    await expect(extractPdfText(pdfFile())).rejects.toMatchObject({
      code: "TOO_MANY_PAGES",
    });
    expect(parserMocks.getText).not.toHaveBeenCalled();
    expect(parserMocks.destroy).toHaveBeenCalled();
  });

  it("extracts at most the configured number of pages", async () => {
    parserMocks.getInfo.mockResolvedValue({ total: MAX_PAGES });
    parserMocks.getText.mockResolvedValue({
      text: "We are pleased to offer you the role.",
      pages: Array.from({ length: MAX_PAGES }, () => ({})),
    });

    const result = await extractPdfText(pdfFile());

    expect(parserMocks.getText).toHaveBeenCalledWith({ first: MAX_PAGES });
    expect(result.pageCount).toBe(MAX_PAGES);
  });

  it("rejects extracted text over the documented character limit", async () => {
    parserMocks.getInfo.mockResolvedValue({ total: 1 });
    parserMocks.getText.mockResolvedValue({
      text: "a".repeat(MAX_TEXT_LENGTH + 1),
      pages: [{}],
    });

    await expect(extractPdfText(pdfFile())).rejects.toMatchObject({
      code: "TEXT_TOO_LONG",
    });
  });

  it("rejects image-only PDFs with no extractable text", async () => {
    parserMocks.getInfo.mockResolvedValue({ total: 1 });
    parserMocks.getText.mockResolvedValue({ text: "   \n  ", pages: [{}] });

    await expect(extractPdfText(pdfFile())).rejects.toMatchObject({
      code: "NO_TEXT",
    });
  });

  it("destroys the parser when extraction fails", async () => {
    parserMocks.getInfo.mockResolvedValue({ total: 1 });
    parserMocks.getText.mockRejectedValue(new Error("parser exploded"));

    await expect(extractPdfText(pdfFile())).rejects.toMatchObject({
      code: "CORRUPT",
    });
    expect(parserMocks.destroy).toHaveBeenCalled();
  });
});
