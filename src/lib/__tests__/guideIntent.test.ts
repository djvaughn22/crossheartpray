// The AI intent parser's guards: strict input validation, whitelist-only
// sanitization (a model can never smuggle a verse, URL, or prayer through),
// and guaranteed null — with zero network activity — whenever AI is off or
// unconfigured.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_INPUT_CHARS,
  parseGuideIntentWithAi,
  sanitizeGuideIntent,
  validateInput,
} from "../guide/guideIntent";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("input validation", () => {
  it("accepts a short real sentence", () => {
    expect(validateInput("I’m worried about tomorrow and have five minutes.")).toBe(true);
  });

  it("rejects empty, non-string, and oversized input", () => {
    expect(validateInput("")).toBe(false);
    expect(validateInput("   ")).toBe(false);
    expect(validateInput(42)).toBe(false);
    expect(validateInput(null)).toBe(false);
    expect(validateInput("x".repeat(MAX_INPUT_CHARS + 1))).toBe(false);
    expect(validateInput("x".repeat(MAX_INPUT_CHARS))).toBe(true);
  });
});

describe("sanitizeGuideIntent — whitelist only", () => {
  it("keeps valid structured output", () => {
    expect(
      sanitizeGuideIntent({
        durationMinutes: 5,
        needs: ["worry", "prayer"],
        preferredResource: ["daily_hope"],
      }),
    ).toEqual({
      durationMinutes: 5,
      needs: ["worry", "prayer"],
      preferredResource: ["daily_hope"],
    });
  });

  it("drops off-whitelist durations, needs, and resources", () => {
    expect(
      sanitizeGuideIntent({
        durationMinutes: 45,
        needs: ["worry", "despair", 7],
        preferredResource: ["tiktok"],
      }),
    ).toEqual({ needs: ["worry"] });
  });

  it("ignores model attempts to inject verses, URLs, or prayers", () => {
    const hostile = sanitizeGuideIntent({
      durationMinutes: 10,
      verse: "John 99:99 says trust me",
      url: "https://evil.example",
      prayer: "generated prayer text",
      scriptureReference: "Hezekiah 3:16",
    });
    expect(hostile).toEqual({ durationMinutes: 10 });
    expect(JSON.stringify(hostile)).not.toMatch(/John|http|prayer|Hezekiah/);
  });

  it("returns null for junk", () => {
    expect(sanitizeGuideIntent(null)).toBeNull();
    expect(sanitizeGuideIntent("a string")).toBeNull();
    expect(sanitizeGuideIntent({})).toBeNull();
    expect(sanitizeGuideIntent({ needs: [] })).toBeNull();
  });
});

describe("parseGuideIntentWithAi fail-safe guards", () => {
  it("returns null without any request when AI is disabled", async () => {
    vi.stubEnv("CROSSHEARTPRAY_GUIDE_AI_ENABLED", "false");
    vi.stubEnv("OPENAI_API_KEY", "test-key-never-used");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(await parseGuideIntentWithAi("ten quiet minutes")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("returns null without any request when the API key is missing", async () => {
    vi.stubEnv("CROSSHEARTPRAY_GUIDE_AI_ENABLED", "true");
    vi.stubEnv("OPENAI_API_KEY", "");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(await parseGuideIntentWithAi("ten quiet minutes")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("returns null for oversized input before any other check", async () => {
    expect(await parseGuideIntentWithAi("x".repeat(500))).toBeNull();
  });
});
