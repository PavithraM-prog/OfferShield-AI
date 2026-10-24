import { NextRequest, NextResponse } from "next/server";
import { AnalyzeRequestSchema } from "@/lib/validation/schemas";
import { getErrorMessage, type SubmissionErrorCode } from "@/lib/validation/errors";
import { extractPdfText, PdfError } from "@/lib/pdf/extractor";
import { runOfferAnalysis } from "@/lib/analysis/run";
import {
  AI_RATE_LIMIT,
  ANALYZE_RATE_LIMIT,
  defaultRateLimitStore,
  getClientKey,
  releaseAnalysisSlot,
  tryAcquireAnalysisSlot,
} from "@/lib/security/rateLimit";
import {
  MAX_JSON_BODY_BYTES,
  MAX_MULTIPART_BODY_BYTES,
} from "@/lib/limits/config";

export const runtime = "nodejs";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

function errorResponse(
  code: SubmissionErrorCode,
  status: number,
  extraHeaders?: Record<string, string>,
): NextResponse {
  return NextResponse.json(
    { error: { code, message: getErrorMessage(code) } },
    { status, headers: { ...NO_STORE_HEADERS, ...extraHeaders } },
  );
}

function tooManyRequests(retryAfterSeconds: number): NextResponse {
  return errorResponse("RATE_LIMITED", 429, {
    "Retry-After": String(Math.max(1, retryAfterSeconds)),
  });
}

class RequestTooLargeError extends Error {
  constructor() {
    super("Request body exceeded the configured limit.");
    this.name = "RequestTooLargeError";
  }
}

/**
 * Reads the request body with a hard byte ceiling.
 *
 * Content-Length is checked first as a cheap early rejection, but it is not
 * trusted on its own: a missing or understated header is caught by counting the
 * streamed bytes.
 */
async function readBodyWithLimit(
  request: NextRequest,
  maxBytes: number,
): Promise<Uint8Array> {
  const declared = request.headers.get("content-length");
  if (declared !== null) {
    const declaredBytes = Number(declared);
    if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
      throw new RequestTooLargeError();
    }
  }

  const body = request.body;
  if (!body) {
    return new Uint8Array(0);
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (!value) {
      continue;
    }
    total += value.byteLength;
    if (total > maxBytes) {
      // Stop reading without cancelling the underlying stream: cancelling a
      // request body mid-read can surface an unhandled stream error in the
      // Node fetch implementation. The connection is discarded instead.
      throw new RequestTooLargeError();
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
}

async function handlePdfUpload(
  request: NextRequest,
  contentType: string,
): Promise<NextResponse> {
  const bytes = await readBodyWithLimit(request, MAX_MULTIPART_BODY_BYTES);
  const formData = await new Response(bytes as unknown as BodyInit, {
    headers: { "content-type": contentType },
  }).formData();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return errorResponse("NO_FILE", 400);
  }

  if (!tryAcquireAnalysisSlot()) {
    return tooManyRequests(1);
  }

  try {
    const result = await extractPdfText(file);
    return NextResponse.json({ text: result.text }, { headers: NO_STORE_HEADERS });
  } finally {
    releaseAnalysisSlot();
  }
}

async function handleJsonRequest(
  request: NextRequest,
  clientKey: string,
): Promise<NextResponse> {
  const bytes = await readBodyWithLimit(request, MAX_JSON_BODY_BYTES);

  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return errorResponse("INVALID_TEXT", 400);
  }

  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_TEXT" satisfies SubmissionErrorCode,
          message:
            parsed.error.issues[0]?.message ?? getErrorMessage("INVALID_TEXT"),
        },
      },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  // Only requests that explicitly opt in can trigger an external AI call, so
  // only those consume the tighter AI budget.
  if (parsed.data.aiConsent === true) {
    const aiDecision = defaultRateLimitStore.consume(
      `ai:${clientKey}`,
      AI_RATE_LIMIT,
    );
    if (!aiDecision.allowed) {
      return tooManyRequests(aiDecision.retryAfterSeconds);
    }
  }

  if (!tryAcquireAnalysisSlot()) {
    return tooManyRequests(1);
  }

  try {
    const analysisResult = await runOfferAnalysis({
      text: parsed.data.text,
      senderEmail: parsed.data.senderEmail,
      employerWebsite: parsed.data.employerWebsite,
      aiConsent: parsed.data.aiConsent === true,
    });

    return NextResponse.json(
      { text: parsed.data.text, result: analysisResult },
      { headers: NO_STORE_HEADERS },
    );
  } finally {
    releaseAnalysisSlot();
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const clientKey = getClientKey(request.headers);

  const decision = defaultRateLimitStore.consume(
    `analyze:${clientKey}`,
    ANALYZE_RATE_LIMIT,
  );
  if (!decision.allowed) {
    return tooManyRequests(decision.retryAfterSeconds);
  }

  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      return await handlePdfUpload(request, contentType);
    }

    if (contentType.includes("application/json")) {
      return await handleJsonRequest(request, clientKey);
    }

    return errorResponse("UNSUPPORTED_CONTENT_TYPE", 415);
  } catch (error) {
    if (error instanceof RequestTooLargeError) {
      return errorResponse("REQUEST_TOO_LARGE", 413);
    }

    if (error instanceof PdfError) {
      return errorResponse(error.code, error.status);
    }

    // Never echo provider or parser details: the response is intentionally
    // generic so stack traces, credentials, and offer text cannot leak. Only a
    // correlation id and the error class name are logged for diagnosis.
    const requestId = crypto.randomUUID();
    console.error(
      `[analyze] unhandled error (request ${requestId}): ${
        error instanceof Error ? error.name : "UnknownError"
      }`,
    );
    return errorResponse("INTERNAL_ERROR", 500, { "X-Request-ID": requestId });
  }
}
