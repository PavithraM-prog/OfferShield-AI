import type { LlmConfig } from "@/lib/llm/config";

export type LlmErrorCode =
  | "MISSING_CONFIGURATION"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "AUTHENTICATION_ERROR"
  | "RATE_LIMITED"
  | "HTTP_ERROR"
  | "MALFORMED_RESPONSE"
  | "EMPTY_RESPONSE";

/**
 * User-facing, non-leaking messages. They never include provider bodies,
 * credentials, prompts, or offer text.
 */
export const LLM_ERROR_MESSAGES: Record<LlmErrorCode, string> = {
  MISSING_CONFIGURATION:
    "AI review is unavailable because the server is not configured with an AI provider.",
  TIMEOUT: "AI review timed out before the provider responded.",
  NETWORK_ERROR: "AI review could not reach the configured provider.",
  AUTHENTICATION_ERROR: "AI review is unavailable because the provider rejected the configured credentials.",
  RATE_LIMITED: "AI review is unavailable because the provider rate limit was reached.",
  HTTP_ERROR: "AI review is unavailable because the provider returned an error response.",
  MALFORMED_RESPONSE: "AI review is unavailable because the provider response could not be read.",
  EMPTY_RESPONSE: "AI review is unavailable because the provider returned no usable output.",
};

export interface LlmPrompt {
  system: string;
  user: string;
}

export type LlmResult =
  | { ok: true; content: string }
  | { ok: false; code: LlmErrorCode; message: string };

function failure(code: LlmErrorCode): LlmResult {
  return { ok: false, code, message: LLM_ERROR_MESSAGES[code] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractContent(data: unknown): string | null {
  if (!isRecord(data) || !Array.isArray(data.choices) || data.choices.length === 0) {
    return null;
  }
  const choice = data.choices[0];
  if (!isRecord(choice) || !isRecord(choice.message)) {
    return null;
  }
  const content = choice.message.content;
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    const text = content
      .map((part) => (isRecord(part) && typeof part.text === "string" ? part.text : ""))
      .join("");
    return text.length > 0 ? text : null;
  }
  return null;
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

/**
 * Calls an administrator-configured OpenAI-compatible chat completions
 * endpoint. No tools, browsing, or URL fetching are requested. The model is
 * instructed to return JSON; if the administrator enabled `LLM_JSON_MODE`,
 * a json_object response format is also requested.
 */
export async function requestLlmCompletion(
  config: LlmConfig,
  prompt: LlmPrompt,
  fetchImpl: typeof fetch = fetch,
): Promise<LlmResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const body: Record<string, unknown> = {
      model: config.model,
      temperature: 0,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
    };

    if (config.jsonMode) {
      body.response_format = { type: "json_object" };
    }

    const response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (response.status === 401 || response.status === 403) {
      return failure("AUTHENTICATION_ERROR");
    }
    if (response.status === 429) {
      return failure("RATE_LIMITED");
    }
    if (!response.ok) {
      return failure("HTTP_ERROR");
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return failure("MALFORMED_RESPONSE");
    }

    const content = extractContent(data);
    if (content === null || content.trim().length === 0) {
      return failure("EMPTY_RESPONSE");
    }

    return { ok: true, content };
  } catch (error) {
    return failure(isAbortError(error) ? "TIMEOUT" : "NETWORK_ERROR");
  } finally {
    clearTimeout(timeout);
  }
}
