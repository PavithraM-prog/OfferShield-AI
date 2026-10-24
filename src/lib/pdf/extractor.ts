import { PDFParse, PasswordException } from "pdf-parse";
import {
  MAX_FILE_SIZE_BYTES,
  MAX_PAGES,
  MAX_TEXT_LENGTH,
  PDF_PARSE_TIMEOUT_MS,
} from "@/lib/limits/config";
import { getErrorMessage, type SubmissionErrorCode } from "@/lib/validation/errors";

export class PdfError extends Error {
  readonly code: SubmissionErrorCode;
  readonly status: number;

  constructor(code: SubmissionErrorCode, message: string, status = 400) {
    super(message);
    this.name = "PdfError";
    this.code = code;
    this.status = status;
  }
}

export interface PdfExtractionResult {
  text: string;
  pageCount: number;
}

/**
 * Bounds how long a caller waits for PDF parsing. This does not guarantee that
 * the underlying parser's CPU work stops immediately; parser.destroy() is the
 * best-effort cleanup available from this library.
 */
async function withParseTimeout<T>(work: Promise<T>): Promise<T> {
  // Mark late rejections as handled so a timed-out parse cannot crash the
  // process with an unhandled rejection.
  work.catch(() => undefined);

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(new PdfError("PARSE_TIMEOUT", getErrorMessage("PARSE_TIMEOUT")));
        }, PDF_PARSE_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

export async function extractPdfText(file: File): Promise<PdfExtractionResult> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new PdfError("FILE_TOO_LARGE", getErrorMessage("FILE_TOO_LARGE"));
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Content-based check: the PDF header must be present near the start of the
  // file. The declared MIME type and filename are not trusted on their own.
  const header = buffer.subarray(0, 1024).toString("latin1");
  if (!header.includes("%PDF-")) {
    throw new PdfError("UNSUPPORTED_TYPE", getErrorMessage("UNSUPPORTED_TYPE"));
  }

  if (buffer.includes("/Encrypt")) {
    throw new PdfError("PASSWORD_PROTECTED", getErrorMessage("PASSWORD_PROTECTED"));
  }

  const parser = new PDFParse({ data: buffer });
  try {
    // Read document metadata first so an oversized document is rejected before
    // extracting text from every page.
    const info = await withParseTimeout(parser.getInfo());
    if (info.total > MAX_PAGES) {
      throw new PdfError("TOO_MANY_PAGES", getErrorMessage("TOO_MANY_PAGES"));
    }

    const result = await withParseTimeout(parser.getText({ first: MAX_PAGES }));
    const pageCount = info.total > 0 ? info.total : result.pages.length;
    const text = result.text;

    if (!text || text.trim().length === 0) {
      throw new PdfError("NO_TEXT", getErrorMessage("NO_TEXT"));
    }

    if (text.length > MAX_TEXT_LENGTH) {
      throw new PdfError("TEXT_TOO_LONG", getErrorMessage("TEXT_TOO_LONG"));
    }

    return { text, pageCount };
  } catch (error) {
    if (error instanceof PasswordException) {
      throw new PdfError("PASSWORD_PROTECTED", getErrorMessage("PASSWORD_PROTECTED"));
    }
    if (error instanceof PdfError) {
      throw error;
    }
    throw new PdfError("CORRUPT", getErrorMessage("CORRUPT"));
  } finally {
    // Cleanup is best effort: a destroy failure must not replace the safe
    // user-facing error with a generic 500.
    try {
      await parser.destroy();
    } catch {
      // Ignore cleanup failures.
    }
  }
}
