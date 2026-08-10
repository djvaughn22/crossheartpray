// Protected-architecture proof, Aug 9 2026 follow-up pass.
//
// The 1-Year (52-week) and 2-Year (104-week) Bible Reading Plans must share
// one seven-lane structure: the same seven lane identities, in the same
// order, every week, in both plans — with whole-chapter boundaries only and
// complete Bible coverage. Existing tests (bibleReadingPlan104.test.ts) prove
// the 104-week plan is a faithful chapter-boundary split of the 52-week
// source. This file proves the properties the owner asked for directly and
// independently, rather than only by inference from the derivation tests:
// exact lane count/identity/order for EVERY week of BOTH plans, whole-chapter
// boundaries for the 52-week source itself (the 104-week file already checks
// its own output), and full 66-book canon coverage for both plans.
import { describe, expect, it } from "vitest";
import {
  BIBLE_READING_PLAN_WEEKS,
  bibleReadingPlanAssignmentForReading,
} from "../bibleReadingPlan";
import {
  BIBLE_READING_PLAN_104_WEEKS,
  isCatchUpReading,
} from "../bibleReadingPlan104";
import { SCRIPTURE_BOOKS, getScriptureBook } from "../scripture/books";

const CANONICAL_LANES = [
  "Epistles",
  "The Law",
  "History",
  "Psalms",
  "Poetry",
  "Prophecy",
  "Gospels",
] as const;

const CANONICAL_DAY_SLUGS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const PLANS = [
  { name: "1 Year · 52 Weeks", weeks: BIBLE_READING_PLAN_WEEKS },
  { name: "2 Years · 104 Weeks", weeks: BIBLE_READING_PLAN_104_WEEKS },
] as const;

describe("seven-lane contract holds for every week of both plans", () => {
  for (const plan of PLANS) {
    it(`${plan.name}: every week has exactly 7 lanes`, () => {
      for (const week of plan.weeks) {
        expect(week.days).toHaveLength(7);
      }
    });

    it(`${plan.name}: every week uses the same 7 lane identities, same order`, () => {
      for (const week of plan.weeks) {
        expect(week.days.map((d) => d.category)).toEqual(CANONICAL_LANES);
      }
    });

    it(`${plan.name}: every week uses the same day-slug order`, () => {
      for (const week of plan.weeks) {
        expect(week.days.map((d) => d.daySlug)).toEqual(CANONICAL_DAY_SLUGS);
      }
    });
  }

  it("both plans use the identical lane identity set and order (no invention, removal, merge, rename, or reorder)", () => {
    const oneYearLanes = BIBLE_READING_PLAN_WEEKS[0].days.map((d) => d.category);
    const twoYearLanes = BIBLE_READING_PLAN_104_WEEKS[0].days.map((d) => d.category);
    expect(oneYearLanes).toEqual(CANONICAL_LANES);
    expect(twoYearLanes).toEqual(CANONICAL_LANES);
    expect(new Set(CANONICAL_LANES).size).toBe(7);
  });
});

describe("whole-chapter boundaries only — the 52-week source", () => {
  it("never contains a verse-level split anywhere in the source plan", () => {
    for (const week of BIBLE_READING_PLAN_WEEKS) {
      for (const day of week.days) {
        expect(day.reading, `verse split in ${day.reading}`).not.toMatch(/:/);
      }
    }
  });

  it("every non-catch-up reading resolves to a valid, non-reversed integer chapter range", () => {
    for (const week of BIBLE_READING_PLAN_WEEKS) {
      for (const day of week.days) {
        const range = bibleReadingPlanAssignmentForReading(day.reading);
        expect(range, `unreadable reading ${day.reading}`).not.toBeNull();
        if (!range) continue;
        expect(Number.isInteger(range.startChapter)).toBe(true);
        expect(Number.isInteger(range.endChapter)).toBe(true);
        expect(range.startChapter).toBeGreaterThanOrEqual(1);
        expect(range.endChapter).toBeGreaterThanOrEqual(range.startChapter);
      }
    }
  });
});

describe("whole-chapter boundaries only — the 104-week derived plan", () => {
  it("never contains a verse-level split anywhere in the derived plan", () => {
    for (const week of BIBLE_READING_PLAN_104_WEEKS) {
      for (const day of week.days) {
        if (isCatchUpReading(day.reading)) continue;
        expect(day.reading, `verse split in ${day.reading}`).not.toMatch(/:/);
      }
    }
  });

  it("no chapter was fractionally split merely to force an even half", () => {
    // A fractional split would show up as a non-integer chapter number in the
    // reading label itself (e.g. "Gen 1.5") — the shared parser only ever
    // accepts whole integers, so a fraction fails to resolve at all.
    for (const week of BIBLE_READING_PLAN_104_WEEKS) {
      for (const day of week.days) {
        if (isCatchUpReading(day.reading)) continue;
        expect(day.reading).not.toMatch(/\d+\.\d+/);
        const range = bibleReadingPlanAssignmentForReading(day.reading);
        expect(range, `unreadable derived reading ${day.reading}`).not.toBeNull();
      }
    }
  });
});

function chapterKeysForReading(reading: string): string[] {
  const range = bibleReadingPlanAssignmentForReading(reading);
  if (!range) return [];
  const book = getScriptureBook(range.code);
  if (!book) return [];
  const start = Math.min(range.startChapter, book.chapters);
  const end = Math.min(range.endChapter, book.chapters);
  const keys: string[] = [];
  for (let chapter = start; chapter <= end; chapter += 1) {
    keys.push(`${range.code} ${chapter}`);
  }
  return keys;
}

describe("complete Bible coverage — both plans read every chapter of all 66 books", () => {
  const fullCanon = new Set<string>();
  for (const book of SCRIPTURE_BOOKS) {
    for (let chapter = 1; chapter <= book.chapters; chapter += 1) {
      fullCanon.add(`${book.usfm} ${chapter}`);
    }
  }

  it("the canon table itself covers all 66 books", () => {
    expect(SCRIPTURE_BOOKS).toHaveLength(66);
  });

  for (const plan of PLANS) {
    it(`${plan.name}: covers every chapter of every book, nothing missing`, () => {
      const covered = new Set<string>();
      for (const week of plan.weeks) {
        for (const day of week.days) {
          if (isCatchUpReading(day.reading)) continue;
          for (const key of chapterKeysForReading(day.reading)) {
            covered.add(key);
          }
        }
      }

      const missing = [...fullCanon].filter((key) => !covered.has(key));
      expect(missing).toEqual([]);
      expect(covered.size).toBe(fullCanon.size);
    });
  }
});

describe("the 104-week plan is the same seven-lane journey, not a separate methodology", () => {
  it("each 104-week lane's full chapter sequence equals the 52-week lane's full chapter sequence", () => {
    for (let laneIndex = 0; laneIndex < 7; laneIndex += 1) {
      const oneYearSequence = BIBLE_READING_PLAN_WEEKS.flatMap((week) =>
        chapterKeysForReading(week.days[laneIndex].reading),
      );
      const twoYearSequence = BIBLE_READING_PLAN_104_WEEKS.flatMap((week) =>
        isCatchUpReading(week.days[laneIndex].reading)
          ? []
          : chapterKeysForReading(week.days[laneIndex].reading),
      );
      expect(twoYearSequence, `lane ${CANONICAL_DAY_SLUGS[laneIndex]}`).toEqual(
        oneYearSequence,
      );
    }
  });
});
