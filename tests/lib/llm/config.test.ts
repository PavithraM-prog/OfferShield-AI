import { describe, expect, it } from "vitest";
import {
  DEFAULT_LLM_TIMEOUT_MS,
  MAX_LLM_TIMEOUT_MS,
  MIN_LLM_TIMEOUT_MS,
  readLlmConfig,
} from "@/lib/llm/config";

const completeEnv = {
  LLM_BASE_URL: "https://llm.example.com/v1",
  LLM_API_KEY: "test-api-key",
  LLM_MODEL: "test-model",
};

describe("readLlmConfig", () => {
  it("reports missing configuration when nothing is set", () => {
    const result = readLlmConfig({});
    expect(result.configured).toBe(false);
    if (!result.configured) {
      expect(result.missing).toEqual(["LLM_BASE_URL", "LLM_API_KEY", "LLM_MODEL"]);
    }
  });

  it("reports which variables are missing", () => {
    const result = readLlmConfig({ LLM_API_KEY: "test-api-key" });
    expect(result.configured).toBe(false);
    if (!result.configured) {
      expect(result.missing).toEqual(["LLM_BASE_URL", "LLM_MODEL"]);
    }
  });

  it("rejects an invalid base URL", () => {
    const result = readLlmConfig({ ...completeEnv, LLM_BASE_URL: "not a url" });
    expect(result.configured).toBe(false);
  });

  it("rejects a non-http(s) base URL", () => {
    const result = readLlmConfig({ ...completeEnv, LLM_BASE_URL: "file:///etc/passwd" });
    expect(result.configured).toBe(false);
  });

  it("accepts a complete configuration and normalises the base URL", () => {
    const result = readLlmConfig({ ...completeEnv, LLM_BASE_URL: "https://llm.example.com/v1/" });
    expect(result.configured).toBe(true);
    if (result.configured) {
      expect(result.config.baseUrl).toBe("https://llm.example.com/v1");
      expect(result.config.apiKey).toBe("test-api-key");
      expect(result.config.model).toBe("test-model");
      expect(result.config.timeoutMs).toBe(DEFAULT_LLM_TIMEOUT_MS);
      expect(result.config.jsonMode).toBe(false);
    }
  });

  it("clamps the timeout to the supported range", () => {
    const tooSmall = readLlmConfig({ ...completeEnv, LLM_TIMEOUT_MS: "10" });
    expect(tooSmall.configured).toBe(true);
    if (tooSmall.configured) {
      expect(tooSmall.config.timeoutMs).toBe(MIN_LLM_TIMEOUT_MS);
    }

    const tooLarge = readLlmConfig({ ...completeEnv, LLM_TIMEOUT_MS: "999999" });
    expect(tooLarge.configured).toBe(true);
    if (tooLarge.configured) {
      expect(tooLarge.config.timeoutMs).toBe(MAX_LLM_TIMEOUT_MS);
    }
  });

  it("enables JSON mode only when explicitly requested by the operator", () => {
    const without = readLlmConfig(completeEnv);
    expect(without.configured).toBe(true);
    if (without.configured) {
      expect(without.config.jsonMode).toBe(false);
    }

    const withJsonMode = readLlmConfig({ ...completeEnv, LLM_JSON_MODE: "json_object" });
    expect(withJsonMode.configured).toBe(true);
    if (withJsonMode.configured) {
      expect(withJsonMode.config.jsonMode).toBe(true);
    }
  });
});
