export const ERROR_MESSAGES = {
  INVALID_TEXT: "Please paste the offer text before submitting.",
  NO_FILE: "No PDF file was provided.",
  UNSUPPORTED_CONTENT_TYPE: "Unsupported request format. Please submit offer text or a PDF file.",
  FILE_TOO_LARGE: "The PDF exceeds the 5 MB size limit.",
  TOO_MANY_PAGES: "The PDF exceeds the 10 page limit.",
  TEXT_TOO_LONG: "The extracted text exceeds the 20,000 character limit. Paste a shorter excerpt instead.",
  REQUEST_TOO_LARGE: "The request is too large. Reduce the offer text or PDF size and try again.",
  RATE_LIMITED: "Too many requests. Please wait a moment and try again.",
  PARSE_TIMEOUT: "The PDF took too long to process. Try a smaller PDF or paste the text instead.",
  UNSUPPORTED_TYPE: "Unsupported file type. Please upload a PDF file.",
  CORRUPT: "The PDF could not be read. It may be corrupt. Please try re-exporting it or pasting the text directly.",
  PASSWORD_PROTECTED: "The PDF is password-protected. Remove the password protection and try again, or paste the text directly.",
  NO_TEXT: "No extractable text was found in this PDF. Text extraction is not supported for scanned or image-only PDFs yet — please paste the text instead.",
  INTERNAL_ERROR: "Something went wrong while processing your submission.",
} as const;

export type SubmissionErrorCode = keyof typeof ERROR_MESSAGES;

export function getErrorMessage(code: string): string {
  const key = code as SubmissionErrorCode;
  const message = ERROR_MESSAGES[key];
  return message ?? "Something went wrong while processing your submission.";
}
