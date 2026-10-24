export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_PAGES = 10;
export const MAX_TEXT_LENGTH = 20_000;

/**
 * Request-body ceilings applied before parsing. JSON is bounded well above the
 * 20,000-character text limit (UTF-8 can use up to four bytes per character);
 * multipart allows the 5 MB file plus form overhead.
 */
export const MAX_JSON_BODY_BYTES = 128 * 1024;
export const MAX_MULTIPART_BODY_BYTES = MAX_FILE_SIZE_BYTES + 256 * 1024;

/**
 * Best-effort ceiling on PDF text extraction. This stops the request from
 * waiting indefinitely, but JavaScript cannot guarantee that synchronous or
 * worker CPU work is terminated at exactly this point.
 */
export const PDF_PARSE_TIMEOUT_MS = 20_000;
