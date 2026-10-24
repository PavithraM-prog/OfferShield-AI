/**
 * Server-only configuration for the optional OpenAI-compatible AI provider.
 *
 * These values are read at request time from the server environment. They are
 * never sent to the browser and are never accepted from a user request or an
 * uploaded document.
 */

export const LLM_ENV_KEYS = ["LLM_BASE_URL", "LLM_API_KEY", "LLM_MODEL"] as const;

export const DEFAULT_LLM_TIMEOUT_MS = 15_000;
export const MIN_LLM_TIMEOUT_MS = 2_000;
export const MAX_LLM_TIMEOUT_MS = 60_000;

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  /** Only set when the administrator explicitly enables provider JSON mode. */
  jsonMode: boolean;
}

export type LlmConfigResult =
  | { configured: true; config: LlmConfig }
  | { configured: false; missing: string[] };

function parseTimeoutMs(raw: string | undefined): number {
  if (!raw) {
    return DEFAULT_LLM_TIMEOUT_MS;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LLM_TIMEOUT_MS;
  }
  return Math.min(MAX_LLM_TIMEOUT_MS, Math.max(MIN_LLM_TIMEOUT_MS, Math.trunc(parsed)));
}

function normaliseBaseUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return null;
  }
  // Keep any path the administrator configured (for example /v1) but drop a
  // trailing slash so the adapter can append "/chat/completions" predictably.
  return url.toString().replace(/\/+$/, "");
}

export function readLlmConfig(env: Record<string, string | undefined> = process.env): LlmConfigResult {
  const baseUrlRaw = env.LLM_BASE_URL?.trim() ?? "";
  const apiKey = env.LLM_API_KEY?.trim() ?? "";
  const model = env.LLM_MODEL?.trim() ?? "";

  const missing: string[] = [];
  if (!baseUrlRaw) {
    missing.push("LLM_BASE_URL");
  }
  if (!apiKey) {
    missing.push("LLM_API_KEY");
  }
  if (!model) {
    missing.push("LLM_MODEL");
  }
  if (missing.length > 0) {
    return { configured: false, missing };
  }

  const baseUrl = normaliseBaseUrl(baseUrlRaw);
  if (baseUrl === null) {
    return { configured: false, missing: ["LLM_BASE_URL (must be a valid http(s) URL)"] };
  }

  return {
    configured: true,
    config: {
      baseUrl,
      apiKey,
      model,
      timeoutMs: parseTimeoutMs(env.LLM_TIMEOUT_MS),
      jsonMode: env.LLM_JSON_MODE === "json_object",
    },
  };
}
