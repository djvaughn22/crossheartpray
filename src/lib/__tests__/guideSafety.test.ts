// Safety routing: crisis language is caught by a simple local check, shown a
// compassionate message, and never handed to a model.
import { describe, expect, it } from "vitest";
import {
  CRISIS_SUPPORT_MESSAGE,
  detectCrisisLanguage,
} from "../guide/guideSafety";

describe("detectCrisisLanguage", () => {
  it("flags language suggesting immediate danger", () => {
    expect(detectCrisisLanguage("I want to kill myself")).toBe(true);
    expect(detectCrisisLanguage("thinking about suicide")).toBe(true);
    expect(detectCrisisLanguage("I don't want to be alive")).toBe(true);
    expect(detectCrisisLanguage("I keep hurting myself with self-harm")).toBe(true);
    expect(detectCrisisLanguage("my husband hits me")).toBe(true);
    expect(detectCrisisLanguage("I think I'm having a heart attack")).toBe(true);
  });

  it("does not flag ordinary worry, sadness, or Scripture requests", () => {
    expect(detectCrisisLanguage("I'm worried about tomorrow")).toBe(false);
    expect(detectCrisisLanguage("I feel sad and need encouragement")).toBe(false);
    expect(detectCrisisLanguage("five minutes to pray before work")).toBe(false);
    expect(detectCrisisLanguage("I want to read about hope")).toBe(false);
    expect(detectCrisisLanguage("")).toBe(false);
  });
});

describe("the support message", () => {
  it("points to real help without judgment or counseling", () => {
    expect(CRISIS_SUPPORT_MESSAGE.body).toContain("988");
    expect(CRISIS_SUPPORT_MESSAGE.body).toContain("911");
    expect(CRISIS_SUPPORT_MESSAGE.body).toMatch(/emergency services/i);
    // It never claims to counsel, diagnose, or speak for God.
    expect(CRISIS_SUPPORT_MESSAGE.body).not.toMatch(/God (wants|is telling|says)/i);
    expect(CRISIS_SUPPORT_MESSAGE.body).not.toMatch(/diagnos/i);
  });
});
