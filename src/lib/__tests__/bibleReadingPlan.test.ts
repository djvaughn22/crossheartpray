import { describe, expect, it } from "vitest";
import {
  BIBLE_READING_PLAN_WEEKS,
  bibleReadingPlanDayForReference,
  bibleReadingPlanDayHref,
  bibleReadingPlanHrefForReference,
} from "../bibleReadingPlan";
import { LIFE_ESSENTIALS_PRINCIPLES } from "../geneGetzLifeEssentials";

describe("bibleReadingPlanDayForReference", () => {
  it("matches a chapter inside a numbered reading range", () => {
    const day = bibleReadingPlanDayForReference("GEN", 2);
    expect(day).not.toBeNull();
    expect(day?.week).toBe(1);
    expect(day?.daySlug).toBe("monday");
    expect(day?.reading).toBe("Gen 1-3");
  });

  it("matches every chapter of a whole-book reading (no chapter numbers)", () => {
    // "Ruth" appears in the plan without chapter numbers; Ruth has 4 chapters.
    for (const chapter of [1, 2, 3, 4]) {
      const day = bibleReadingPlanDayForReference("RUT", chapter);
      expect(day?.reading).toBe("Ruth");
    }
  });

  it("matches concatenated abbreviations used by the plan data", () => {
    // These reading spellings previously fell through the book-code map.
    expect(bibleReadingPlanDayForReference("1KI", 3)?.reading).toBe("1Ki 1-4");
    expect(bibleReadingPlanDayForReference("2CH", 30)?.reading).toBe("2Chr 29-32");
    expect(bibleReadingPlanDayForReference("1JN", 4)?.reading).toBe("1John 4-5");
    expect(bibleReadingPlanDayForReference("1TH", 2)?.reading).toBe("1Thes 1-3");
  });

  it("returns null for a reference outside the plan", () => {
    expect(bibleReadingPlanDayForReference("XYZ", 1)).toBeNull();
    expect(bibleReadingPlanDayForReference("", 1)).toBeNull();
  });

  it("uses the first plan entry when scanning weeks in order", () => {
    const day = bibleReadingPlanDayForReference("ROM", 1);
    expect(day?.week).toBe(1);
    expect(day?.daySlug).toBe("sunday");
  });
});

describe("bibleReadingPlanDayHref", () => {
  it("builds the week/day deep link used by the Reading Plan page", () => {
    const day = BIBLE_READING_PLAN_WEEKS[0].days[1];
    expect(bibleReadingPlanDayHref(day)).toBe(
      `/bible-reading-plan?week=${day.week}&day=${day.daySlug}#week-${day.week}-${day.daySlug}`,
    );
  });

  it("backs bibleReadingPlanHrefForReference for matched references", () => {
    expect(bibleReadingPlanHrefForReference("GEN", 1)).toBe(
      "/bible-reading-plan?week=1&day=monday#week-1-monday",
    );
    expect(bibleReadingPlanHrefForReference("XYZ", 1)).toBe("/bible-reading-plan");
  });
});

describe("Life Essentials principles vs the 52-week plan", () => {
  it("resolves a real plan day for every principle's starting chapter", () => {
    const unmatched = LIFE_ESSENTIALS_PRINCIPLES.filter(
      (p) => !bibleReadingPlanDayForReference(p.code, p.startChapter),
    );
    expect(
      unmatched.map((p) => `${p.book} ${p.startChapter} #${p.principleNumber}`),
    ).toEqual([]);
  });
});
