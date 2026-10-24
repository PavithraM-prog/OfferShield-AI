// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/analyze/route";
import { REVIEW_MODES } from "@/lib/analysis/types";
import { MAX_JSON_BODY_BYTES, MAX_FILE_SIZE_BYTES } from "@/lib/limits/config";
import { resetRateLimitStateForTests } from "@/lib/security/rateLimit";

const ENV_KEYS = [
  "LLM_BASE_URL",
  "LLM_API_KEY",
  "LLM_MODEL",
  "LLM_TIMEOUT_MS",
  "LLM_JSON_MODE",
  "TRUST_PROXY",
] as const;

let savedEnv: Record<string, string | undefined> = {};

const offerText = "We are pleased to offer you the internship at Acme Labs.";

function rawRequest(body: string, contentType = "application/json"): NextRequest {
  return new NextRequest("http://localhost:3000/api/analyze", {
    method: "POST",
    headers: { "content-type": contentType },
    body,
  });
}

function jsonRequest(body: unknown): NextRequest {
  return rawRequest(JSON.stringify(body));
}

interface ErrorBody {
  error: { code: string; message: string };
}

interface SuccessBody {
  text: string;
  result: { mode: string; modeLabel: string; limitations: string[] };
}

beforeEach(() => {
  resetRateLimitStateForTests();
  savedEnv = {};
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /api/analyze", () => {
  it("returns validated text and a rule-only result with no-store caching", async () => {
    const response = await POST(jsonRequest({ text: offerText }));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");

    const body = (await response.json()) as SuccessBody;
    expect(body.text).toBe(offerText);
    expect(body.result.mode).toBe(REVIEW_MODES.RULE_ONLY);
  });

  it("rejects an oversized JSON body before parsing it", async () => {
    const oversized = "x".repeat(MAX_JSON_BODY_BYTES + 1);
    const response = await POST(rawRequest(oversized));

    expect(response.status).toBe(413);
    const rawBody = await response.text();
    const body = JSON.parse(rawBody) as ErrorBody;
    expect(body.error.code).toBe("REQUEST_TOO_LARGE");
    expect(rawBody).not.toContain("xxxx");
  });

  it("rejects malformed JSON with a safe message", async () => {
    const response = await POST(rawRequest("{not-json"));

    expect(response.status).toBe(400);
    const body = (await response.json()) as ErrorBody;
    expect(body.error.code).toBe("INVALID_TEXT");
  });

  it("rejects text that exceeds the documented character limit", async () => {
    const response = await POST(jsonRequest({ text: "a".repeat(20_001) }));

    expect(response.status).toBe(400);
    const body = (await response.json()) as ErrorBody;
    expect(body.error.code).toBe("INVALID_TEXT");
  });

  it("rejects unsupported content types", async () => {
    const response = await POST(rawRequest("hello", "text/plain"));

    expect(response.status).toBe(415);
    const body = (await response.json()) as ErrorBody;
    expect(body.error.code).toBe("UNSUPPORTED_CONTENT_TYPE");
  });

  it("rate limits repeated analysis requests with Retry-After", async () => {
    for (let index = 0; index < 30; index += 1) {
      const response = await POST(rawRequest("hello", "text/plain"));
      expect(response.status).toBe(415);
    }

    const limited = await POST(rawRequest("hello", "text/plain"));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBeTruthy();
    const body = (await limited.json()) as ErrorBody;
    expect(body.error.code).toBe("RATE_LIMITED");
  });

  it("applies a tighter limit to AI-consented requests", async () => {
    for (let index = 0; index < 10; index += 1) {
      const response = await POST(
        jsonRequest({ text: offerText, aiConsent: true }),
      );
      expect(response.status).toBe(200);
    }

    const limited = await POST(jsonRequest({ text: offerText, aiConsent: true }));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBeTruthy();
  });

  it("does not call the configured provider without explicit consent", async () => {
    process.env.LLM_BASE_URL = "https://llm.example.com/v1";
    process.env.LLM_API_KEY = "test-api-key";
    process.env.LLM_MODEL = "test-model";

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(jsonRequest({ text: offerText }));

    expect(response.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
    const body = (await response.json()) as SuccessBody;
    expect(body.result.mode).toBe(REVIEW_MODES.RULE_ONLY);
  });

  it("keeps rule results and does not leak provider details when AI fails", async () => {
    process.env.LLM_BASE_URL = "https://llm.example.com/v1";
    process.env.LLM_API_KEY = "sk-test-super-secret-value";
    process.env.LLM_MODEL = "test-model";

    const fetchMock = vi.fn(async () => {
      throw new Error(
        "connect failed for sk-test-super-secret-value at https://internal-provider-host.example",
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      jsonRequest({
        text: "To confirm your acceptance, please pay the registration fee.",
        aiConsent: true,
      }),
    );

    expect(response.status).toBe(200);
    const rawBody = await response.text();
    expect(rawBody).not.toContain("sk-test-super-secret-value");
    expect(rawBody).not.toContain("internal-provider-host");

    const body = JSON.parse(rawBody) as SuccessBody;
    expect(body.result.mode).toBe(REVIEW_MODES.AI_UNAVAILABLE);
    expect(body.result.modeLabel).toContain("AI review unavailable");
    // Deterministic findings survive the AI failure.
    expect(body.result.mode).not.toBe(REVIEW_MODES.RULE_AND_AI);
  });

  it("rejects a corrupt PDF with a safe message", async () => {
    const formData = new FormData();
    formData.append(
      "file",
      new File([Buffer.from("%PDF-1.4\nnot a real document")], "offer.pdf", {
        type: "application/pdf",
      }),
    );

    const request = new NextRequest("http://localhost:3000/api/analyze", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = (await response.json()) as ErrorBody;
    expect(body.error.code).toBe("CORRUPT");
    expect(body.error.message).not.toContain("%PDF");
  });

  it("rejects an oversized multipart upload before parsing it", async () => {
    const formData = new FormData();
    formData.append(
      "file",
      new File(
        [new Uint8Array(MAX_FILE_SIZE_BYTES + 512 * 1024)],
        "large.pdf",
        { type: "application/pdf" },
      ),
    );

    const request = new NextRequest("http://localhost:3000/api/analyze", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(413);
    const body = (await response.json()) as ErrorBody;
    expect(body.error.code).toBe("REQUEST_TOO_LARGE");
  });
});
