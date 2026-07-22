// The deterministic guide: every result is built from verified local
// Scripture and real existing CrossHeartPray routes — nothing fabricated,
// nothing model-generated, and share links can only carry whitelisted enums.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildGuideSession,
  buildGuideShareHref,
  GUIDE_NEEDS,
  GUIDE_TIMES,
  parseGuideParams,
  type GuideNeed,
  type GuideTime,
} from "../guide/guideSession";
import { LOCAL_BIBLE_VERSES } from "../localBibleVerses";

const verseLabels = new Set(LOCAL_BIBLE_VERSES.map((verse) => verse.label));
const INTERNAL_ROUTES = ["/", "/daily-hope", "/bible-reading-plan", "/explorebible"];

describe("verified Scripture only", () => {
  it("resolves real local verses for every time × need combination", () => {
    for (const time of GUIDE_TIMES) {
      for (const { need } of GUIDE_NEEDS) {
        const session = buildGuideSession({ time, need, seed: "test-seed" });
        expect(session.scripture.passages.length).toBeGreaterThan(0);
        for (const passage of session.scripture.passages) {
          expect(verseLabels.has(passage.label), passage.label).toBe(true);
          expect(passage.text.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("links chapter context through the shared Bible.com builder", () => {
    const session = buildGuideSession({ time: 10, need: "hope", seed: "s" });
    expect(session.scripture.bibleComChapterHref).toMatch(
      /^https:\/\/www\.bible\.com\/bible\/\d+\/[A-Z0-9]{3}\.\d+/,
    );
  });

  it("always lands the reading-plan link on the real plan route", () => {
    for (const { need } of GUIDE_NEEDS) {
      const session = buildGuideSession({ time: 10, need, seed: "s" });
      expect(session.scripture.readingPlan).not.toBeNull();
      expect(session.scripture.readingPlan!.href).toMatch(/^\/bible-reading-plan/);
    }
  });

  it("is deterministic for the same seed and varies content by day seed", () => {
    const a = buildGuideSession({ time: 5, need: "surprise", seed: "2026-07-22" });
    const b = buildGuideSession({ time: 5, need: "surprise", seed: "2026-07-22" });
    expect(a.need).toBe(b.need);
    expect(a.scripture.title).toBe(b.scripture.title);
  });
});

describe("session shape follows the chosen time", () => {
  it("keeps 5 minutes to Scripture, reflection, and prayer", () => {
    const session = buildGuideSession({ time: 5, need: "prayer", seed: "s" });
    expect(session.dailyHope).toBeNull();
    expect(session.bibleBingo).toBeNull();
    expect(session.reflection.length).toBeGreaterThan(0);
  });

  it("adds Daily Hope at 20 minutes and Bible Bingo at 30", () => {
    const twenty = buildGuideSession({
      time: 20,
      need: "hope",
      seed: "s",
      now: new Date("2026-07-22T12:00:00"),
    });
    expect(twenty.dailyHope?.href).toBe("/daily-hope");
    expect(twenty.bibleBingo).toBeNull();

    const thirty = buildGuideSession({ time: 30, need: "hope", seed: "s" });
    expect(thirty.dailyHope?.href).toBe("/daily-hope");
    expect(thirty.bibleBingo?.href).toBe("/explorebible");
  });

  it("uses only neutral reflection prompts that assert no interpretation", () => {
    for (const { need } of GUIDE_NEEDS) {
      const session = buildGuideSession({ time: 5, need, seed: "s" });
      expect(session.reflection).not.toMatch(/God is (telling|saying|showing) you/i);
      expect(session.reflection).not.toMatch(/this (verse|passage) means/i);
    }
  });
});

describe("safe sharing", () => {
  it("builds share links from whitelisted enum values only", () => {
    expect(buildGuideShareHref({ time: 10, need: "hope" })).toBe(
      "/guide?time=10&need=hope",
    );
  });

  it("cannot carry private text — invalid values fall back to defaults", () => {
    const href = buildGuideShareHref({
      time: 999 as unknown as GuideTime,
      need: "my private prayer" as unknown as GuideNeed,
    });
    expect(href).toBe("/guide?time=10&need=begin");
  });

  it("rejects tampered incoming parameters", () => {
    expect(parseGuideParams({ time: "10", need: "hope" })).toEqual({
      time: 10,
      need: "hope",
    });
    expect(parseGuideParams({ time: "11", need: "hope" })).toBeNull();
    expect(parseGuideParams({ time: "10", need: "javascript:alert(1)" })).toBeNull();
    expect(parseGuideParams({})).toBeNull();
  });
});

describe("no model output anywhere in the deterministic guide", () => {
  it("guideSession.ts never imports the OpenAI SDK or intent parser", () => {
    const source = readFileSync(join(__dirname, "..", "guide", "guideSession.ts"), "utf8");
    expect(source).not.toMatch(/openai|guideIntent/i);
  });

  it("every internal link a session produces targets an existing route", () => {
    const session = buildGuideSession({ time: 30, need: "begin", seed: "s" });
    const hrefs = [
      session.scripture.readingPlan?.href,
      session.dailyHope?.href,
      session.bibleBingo?.href,
    ].filter((href): href is string => Boolean(href));
    for (const href of hrefs) {
      const path = href.split(/[?#]/)[0];
      expect(INTERNAL_ROUTES.includes(path), href).toBe(true);
    }
  });
});
