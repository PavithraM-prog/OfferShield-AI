// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import {
  AI_RATE_LIMIT,
  ANALYZE_RATE_LIMIT,
  InMemoryRateLimitStore,
  MAX_CONCURRENT_ANALYSES,
  getActiveAnalysisCount,
  getClientKey,
  releaseAnalysisSlot,
  resetRateLimitStateForTests,
  tryAcquireAnalysisSlot,
} from "@/lib/security/rateLimit";

afterEach(() => {
  resetRateLimitStateForTests();
});

describe("InMemoryRateLimitStore", () => {
  it("allows requests up to the limit and then blocks with a retry delay", () => {
    const store = new InMemoryRateLimitStore();
    const rule = { limit: 2, windowMs: 60_000 };

    expect(store.consume("client", rule, 1_000).allowed).toBe(true);
    expect(store.consume("client", rule, 1_000).allowed).toBe(true);

    const blocked = store.consume("client", rule, 1_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(60);
  });

  it("resets the bucket after the window elapses", () => {
    const store = new InMemoryRateLimitStore();
    const rule = { limit: 1, windowMs: 1_000 };

    expect(store.consume("client", rule, 0).allowed).toBe(true);
    expect(store.consume("client", rule, 500).allowed).toBe(false);
    expect(store.consume("client", rule, 1_000).allowed).toBe(true);
  });

  it("tracks separate keys independently", () => {
    const store = new InMemoryRateLimitStore();
    const rule = { limit: 1, windowMs: 60_000 };

    expect(store.consume("a", rule).allowed).toBe(true);
    expect(store.consume("b", rule).allowed).toBe(true);
    expect(store.consume("a", rule).allowed).toBe(false);
  });

  it("documents a conservative analysis budget", () => {
    expect(ANALYZE_RATE_LIMIT.limit).toBe(30);
    expect(ANALYZE_RATE_LIMIT.windowMs).toBe(60_000);
    expect(AI_RATE_LIMIT.limit).toBe(10);
    expect(AI_RATE_LIMIT.limit).toBeLessThan(ANALYZE_RATE_LIMIT.limit);
  });
});

describe("getClientKey", () => {
  it("ignores forwarded headers unless TRUST_PROXY is explicitly true", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" });
    expect(getClientKey(headers, {})).toBe("local");
    expect(getClientKey(headers, { TRUST_PROXY: "false" })).toBe("local");
  });

  it("uses the first forwarded address only when explicitly trusted", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" });
    expect(getClientKey(headers, { TRUST_PROXY: "true" })).toBe("203.0.113.7");
  });

  it("rejects malformed forwarded values even when trusted", () => {
    const headers = new Headers({ "x-forwarded-for": "not-an-ip" });
    expect(getClientKey(headers, { TRUST_PROXY: "true" })).toBe("local");
  });

  it("falls back to a shared bucket when no forwarded header is present", () => {
    expect(getClientKey(new Headers(), { TRUST_PROXY: "true" })).toBe("local");
  });
});

describe("analysis concurrency slots", () => {
  it("allows only the configured number of concurrent analyses", () => {
    expect(getActiveAnalysisCount()).toBe(0);

    for (let index = 0; index < MAX_CONCURRENT_ANALYSES; index += 1) {
      expect(tryAcquireAnalysisSlot()).toBe(true);
    }
    expect(tryAcquireAnalysisSlot()).toBe(false);

    releaseAnalysisSlot();
    expect(tryAcquireAnalysisSlot()).toBe(true);
  });

  it("never releases below zero", () => {
    releaseAnalysisSlot();
    releaseAnalysisSlot();
    expect(getActiveAnalysisCount()).toBe(0);
  });
});
