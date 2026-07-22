// Usage protection for the one optional AI call: burst limit, daily quota,
// and privacy-conscious visitor keys that never store a raw IP.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  anonymousKey,
  checkRateLimit,
  resetRateLimitStore,
} from "../guide/guideRateLimit";

beforeEach(() => resetRateLimitStore());
afterEach(() => vi.unstubAllEnvs());

describe("anonymousKey", () => {
  it("hashes the address — the key never contains the raw IP", () => {
    const key = anonymousKey("203.0.113.9, 10.0.0.1");
    expect(key).toHaveLength(32);
    expect(key).not.toContain("203.0.113.9");
    expect(anonymousKey("203.0.113.9")).toBe(key);
    expect(anonymousKey("203.0.113.10")).not.toBe(key);
  });

  it("tolerates a missing address", () => {
    expect(anonymousKey(null)).toHaveLength(32);
    expect(anonymousKey(undefined)).toBe(anonymousKey(null));
  });
});

describe("checkRateLimit", () => {
  it("enforces the burst limit inside one minute", () => {
    const start = Date.parse("2026-07-22T12:00:00Z");
    for (let i = 0; i < 4; i += 1) {
      expect(checkRateLimit("visitor", start + i * 1000).allowed).toBe(true);
    }
    expect(checkRateLimit("visitor", start + 5_000)).toEqual({
      allowed: false,
      reason: "burst",
    });
    // The window rolls — a minute later requests flow again.
    expect(checkRateLimit("visitor", start + 70_000).allowed).toBe(true);
  });

  it("enforces the configurable daily quota", () => {
    vi.stubEnv("CROSSHEARTPRAY_GUIDE_DAILY_ANONYMOUS_LIMIT", "2");
    const start = Date.parse("2026-07-22T12:00:00Z");
    expect(checkRateLimit("visitor", start).allowed).toBe(true);
    expect(checkRateLimit("visitor", start + 120_000).allowed).toBe(true);
    expect(checkRateLimit("visitor", start + 240_000)).toEqual({
      allowed: false,
      reason: "daily_quota",
    });
    // A new UTC day resets the quota.
    expect(checkRateLimit("visitor", start + 24 * 3_600_000).allowed).toBe(true);
  });

  it("tracks visitors independently", () => {
    vi.stubEnv("CROSSHEARTPRAY_GUIDE_DAILY_ANONYMOUS_LIMIT", "1");
    const now = Date.parse("2026-07-22T12:00:00Z");
    expect(checkRateLimit("a", now).allowed).toBe(true);
    expect(checkRateLimit("a", now + 120_000).allowed).toBe(false);
    expect(checkRateLimit("b", now + 120_000).allowed).toBe(true);
  });
});
