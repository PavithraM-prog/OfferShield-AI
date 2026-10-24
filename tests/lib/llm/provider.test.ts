import { describe, expect, it, vi } from "vitest";
import type { LlmConfig } from "@/lib/llm/config";
import { requestLlmCompletion } from "@/lib/llm/provider";

const config: LlmConfig = {
  baseUrl: "https://llm.example.com/v1",
  apiKey: "test-api-key",
  model: "test-model",
  timeoutMs: 5_000,
  jsonMode: false,
};

const prompt = { system: "system prompt", user: "user prompt" };

function responseWith(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function chatResponse(content: unknown): Response {
  return responseWith({ choices: [{ message: { content } }] });
}

describe("requestLlmCompletion", () => {
  it("posts to the configured chat completions endpoint and returns content", async () => {
    const fetchImpl = vi.fn(async () => chatResponse('{"ok":true}'));

    const result = await requestLlmCompletion(config, prompt, fetchImpl as unknown as typeof fetch);

    expect(result).toEqual({ ok: true, content: '{"ok":true}' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://llm.example.com/v1/chat/completions");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-api-key");

    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.model).toBe("test-model");
    expect(body.temperature).toBe(0);
    expect(body.response_format).toBeUndefined();
    expect(body.tools).toBeUndefined();
  });

  it("requests JSON response format only when the operator enabled it", async () => {
    const fetchImpl = vi.fn(async () => chatResponse("{}"));

    await requestLlmCompletion({ ...config, jsonMode: true }, prompt, fetchImpl as unknown as typeof fetch);

    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string).response_format).toEqual({ type: "json_object" });
  });

  it("accepts array-style message content", async () => {
    const fetchImpl = vi.fn(async () =>
      chatResponse([
        { type: "text", text: "first " },
        { type: "text", text: "second" },
      ]),
    );

    const result = await requestLlmCompletion(config, prompt, fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: true, content: "first second" });
  });

  it("maps authentication failures without leaking credentials", async () => {
    const fetchImpl = vi.fn(async () => responseWith({ error: "bad key" }, 401));

    const result = await requestLlmCompletion(config, prompt, fetchImpl as unknown as typeof fetch);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("AUTHENTICATION_ERROR");
      expect(result.message).not.toContain("test-api-key");
      expect(result.message).not.toContain("bad key");
    }
  });

  it("maps rate limits", async () => {
    const fetchImpl = vi.fn(async () => responseWith({}, 429));
    const result = await requestLlmCompletion(config, prompt, fetchImpl as unknown as typeof fetch);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("RATE_LIMITED");
    }
  });

  it("maps other non-success responses", async () => {
    const fetchImpl = vi.fn(async () => responseWith({}, 500));
    const result = await requestLlmCompletion(config, prompt, fetchImpl as unknown as typeof fetch);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("HTTP_ERROR");
    }
  });

  it("maps malformed provider JSON", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("bad json");
      },
    }) as unknown as Response);

    const result = await requestLlmCompletion(config, prompt, fetchImpl as unknown as typeof fetch);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("MALFORMED_RESPONSE");
    }
  });

  it("maps empty model output", async () => {
    const fetchImpl = vi.fn(async () => chatResponse("   "));
    const result = await requestLlmCompletion(config, prompt, fetchImpl as unknown as typeof fetch);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("EMPTY_RESPONSE");
    }
  });

  it("times out when the provider does not respond", async () => {
    const fetchImpl = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        }),
    );

    const result = await requestLlmCompletion(
      { ...config, timeoutMs: 20 },
      prompt,
      fetchImpl as unknown as typeof fetch,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("TIMEOUT");
    }
  });

  it("maps network failures", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });

    const result = await requestLlmCompletion(config, prompt, fetchImpl as unknown as typeof fetch);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("NETWORK_ERROR");
    }
  });
});
