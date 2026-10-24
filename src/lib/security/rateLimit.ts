/**
 * Per-process rate limiting and concurrency control.
 *
 * IMPORTANT: this store lives in the memory of a single Node.js process. It is
 * adequate for a local demo or a single long-lived instance, but it is NOT a
 * global limiter across multiple instances, containers, or serverless
 * invocations. Public deployment is blocked until a shared store (for example
 * Redis) is configured behind the RateLimitStore interface below.
 */

export interface RateLimitRule {
  /** Maximum requests allowed per key per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

/** All analysis requests (text or PDF) per client per minute. */
export const ANALYZE_RATE_LIMIT: RateLimitRule = { limit: 30, windowMs: 60_000 };

/** Requests that may trigger an external AI call, per client per minute. */
export const AI_RATE_LIMIT: RateLimitRule = { limit: 10, windowMs: 60_000 };

/** Concurrent expensive requests allowed in this process. */
export const MAX_CONCURRENT_ANALYSES = 4;

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimitStore {
  consume(key: string, rule: RateLimitRule, now?: number): RateLimitDecision;
  reset(): void;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const MAX_TRACKED_KEYS = 5_000;

export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, Bucket>();

  consume(key: string, rule: RateLimitRule, now: number = Date.now()): RateLimitDecision {
    this.prune(now);

    const existing = this.buckets.get(key);
    if (!existing || now >= existing.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + rule.windowMs });
      return { allowed: true, remaining: rule.limit - 1, retryAfterSeconds: 0 };
    }

    if (existing.count >= rule.limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      };
    }

    existing.count += 1;
    return {
      allowed: true,
      remaining: rule.limit - existing.count,
      retryAfterSeconds: 0,
    };
  }

  reset(): void {
    this.buckets.clear();
  }

  private prune(now: number): void {
    if (this.buckets.size < MAX_TRACKED_KEYS) {
      return;
    }
    for (const [key, bucket] of this.buckets) {
      if (now >= bucket.resetAt) {
        this.buckets.delete(key);
      }
    }
  }
}

export const defaultRateLimitStore = new InMemoryRateLimitStore();

/**
 * Resolves the client identity used for rate limiting.
 *
 * Forwarded IP headers are spoofable, so they are only used when the operator
 * explicitly sets TRUST_PROXY=true behind a reverse proxy that overwrites
 * X-Forwarded-For. Otherwise every request shares the conservative "local"
 * bucket instead of trusting a client-supplied header.
 */
export function getClientKey(
  headers: Headers,
  env: Record<string, string | undefined> = process.env,
): string {
  if (env.TRUST_PROXY === "true") {
    const forwarded = headers.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim() ?? "";
      if (/^[0-9a-fA-F:.]{3,45}$/.test(first)) {
        return first;
      }
    }
  }
  return "local";
}

let activeAnalyses = 0;

/** Returns false when this process is already at its concurrency ceiling. */
export function tryAcquireAnalysisSlot(limit: number = MAX_CONCURRENT_ANALYSES): boolean {
  if (activeAnalyses >= limit) {
    return false;
  }
  activeAnalyses += 1;
  return true;
}

export function releaseAnalysisSlot(): void {
  activeAnalyses = Math.max(0, activeAnalyses - 1);
}

export function getActiveAnalysisCount(): number {
  return activeAnalyses;
}

/** Test-only helper; also resets the module-level concurrency counter. */
export function resetRateLimitStateForTests(): void {
  defaultRateLimitStore.reset();
  activeAnalyses = 0;
}
