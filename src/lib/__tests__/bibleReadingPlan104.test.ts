// The 104-week plan is a DERIVATION, not a new plan. These tests prove that
// every chapter of the canonical 52-week plan survives the split exactly
// once, in the same order, in the same lane, inside the correct pair of new
// weeks — and that nothing was invented to fill a gap.
import { describe, expect, it } from "vitest";
import {
  BIBLE_READING_PLAN_WEEKS,
  bibleReadingPlanAssignmentForReading,
  type BibleReadingPlanWeek,
} from "../bibleReadingPlan";
import {
  BIBLE_READING_PLAN_104_WEEKS,
  CATCH_UP_READING,
  buildBibleReadingPlan104Weeks,
  isCatchUpReading,
  planWeekPairForSourceWeek,
  splitPlanReading,
} from "../bibleReadingPlan104";
import { getScriptureBook } from "../scripture/books";

const DAY_SLUGS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/**
 * The exact ordered list of chapters a reading label covers, resolved the
 * same way the production reader resolves it (shared plan parser + shared
 * book table). Catch-up cells cover nothing.
 */
function chaptersForReading(reading: string): string[] {
  if (isCatchUpReading(reading)) return [];

  const range = bibleReadingPlanAssignmentForReading(reading);
  expect(range, `unparsable reading: ${reading}`).not.toBeNull();
  if (!range) return [];

  const book = getScriptureBook(range.code);
  expect(book, `unknown book in reading: ${reading}`).toBeTruthy();
  if (!book) return [];

  const start = Math.min(range.startChapter, book.chapters);
  const end = Math.min(range.endChapter, book.chapters);
  expect(end, `reversed range: ${reading}`).toBeGreaterThanOrEqual(start);

  const chapters: string[] = [];
  for (let chapter = start; chapter <= end; chapter += 1) {
    chapters.push(`${range.code} ${chapter}`);
  }
  return chapters;
}

describe("104-week plan shape", () => {
  it("has exactly 104 weeks numbered 1..104 with no gaps", () => {
    expect(BIBLE_READING_PLAN_104_WEEKS).toHaveLength(104);
    BIBLE_READING_PLAN_104_WEEKS.forEach((week, index) => {
      expect(week.week).toBe(index + 1);
    });
  });

  it("keeps the same seven lanes, in order, in every week", () => {
    for (const week of BIBLE_READING_PLAN_104_WEEKS) {
      expect(week.days).toHaveLength(7);
      expect(week.days.map((day) => day.daySlug)).toEqual(DAY_SLUGS);
      for (const day of week.days) {
        expect(day.week).toBe(week.week);
      }
    }
  });

  it("preserves each lane's category from the source week", () => {
    BIBLE_READING_PLAN_WEEKS.forEach((sourceWeek, sourceIndex) => {
      const [firstWeek, secondWeek] = planWeekPairForSourceWeek(sourceIndex + 1);
      for (const target of [firstWeek, secondWeek]) {
        const week = BIBLE_READING_PLAN_104_WEEKS[target - 1];
        expect(week.days.map((day) => day.category)).toEqual(
          sourceWeek.days.map((day) => day.category),
        );
        expect(week.days.map((day) => day.dayLabel)).toEqual(
          sourceWeek.days.map((day) => day.dayLabel),
        );
      }
    });
  });

  it("is deterministic — rebuilding from the same source is identical", () => {
    expect(buildBibleReadingPlan104Weeks()).toEqual(BIBLE_READING_PLAN_104_WEEKS);
  });

  it("opens and closes on the exact readings the source plan opens and closes on", () => {
    const readings = (week: number) =>
      BIBLE_READING_PLAN_104_WEEKS[week - 1].days.map((day) => day.reading);

    // Source week 1: Rom 1-2 | Gen 1-3 | Josh 1-5 | Ps 1-2 | Job 1-2 | Isa 1-6 | Matt 1-2
    expect(readings(1)).toEqual([
      "Rom 1",
      "Gen 1-2",
      "Josh 1-3",
      "Ps 1",
      "Job 1",
      "Isa 1-3",
      "Matt 1",
    ]);
    expect(readings(2)).toEqual([
      "Rom 2",
      "Gen 3",
      "Josh 4-5",
      "Ps 2",
      "Job 2",
      "Isa 4-6",
      "Matt 2",
    ]);

    // Source week 52: Jude | Deut 32-34 | Esther 6-10 | Ps 149-150 | Song 7-8 |
    // Rev 18-22 | Acts 27-28. Jude is one chapter, so week 104 rests there.
    expect(readings(103)).toEqual([
      "Jude",
      "Deut 32-33",
      "Esther 6-8",
      "Ps 149",
      "Song 7",
      "Rev 18-20",
      "Acts 27",
    ]);
    expect(readings(104)).toEqual([
      CATCH_UP_READING,
      "Deut 34",
      "Esther 9-10",
      "Ps 150",
      "Song 8",
      "Rev 21-22",
      "Acts 28",
    ]);
  });
});

describe("104-week plan is faithful to the 52-week source", () => {
  it("maps each source week to exactly its own two consecutive weeks", () => {
    // Lane by lane: the chapters of source week N appear, in order, across
    // 104-week weeks 2N-1 and 2N — and nowhere else.
    BIBLE_READING_PLAN_WEEKS.forEach((sourceWeek, sourceIndex) => {
      const [firstWeek, secondWeek] = planWeekPairForSourceWeek(sourceIndex + 1);
      expect(firstWeek).toBe(sourceIndex * 2 + 1);
      expect(secondWeek).toBe(sourceIndex * 2 + 2);

      sourceWeek.days.forEach((sourceDay, laneIndex) => {
        const sourceChapters = chaptersForReading(sourceDay.reading);
        const splitChapters = [
          ...chaptersForReading(
            BIBLE_READING_PLAN_104_WEEKS[firstWeek - 1].days[laneIndex].reading,
          ),
          ...chaptersForReading(
            BIBLE_READING_PLAN_104_WEEKS[secondWeek - 1].days[laneIndex].reading,
          ),
        ];

        expect(
          splitChapters,
          `lane ${sourceDay.daySlug} of source week ${sourceIndex + 1} (${sourceDay.reading})`,
        ).toEqual(sourceChapters);
      });
    });
  });

  it("loses no chapter and duplicates no chapter across the whole plan", () => {
    // Scripture order is a property of a LANE, not of the flattened grid:
    // 104-week week 1 holds the first half of all seven lanes, so reading the
    // grid week-major interleaves the lanes differently by design. Compare
    // each lane's full sequence end to end.
    const laneSequence = (weeks: readonly BibleReadingPlanWeek[], laneIndex: number) =>
      weeks.flatMap((week) => chaptersForReading(week.days[laneIndex].reading));

    for (let laneIndex = 0; laneIndex < 7; laneIndex += 1) {
      expect(
        laneSequence(BIBLE_READING_PLAN_104_WEEKS, laneIndex),
        `lane ${DAY_SLUGS[laneIndex]} chapter sequence`,
      ).toEqual(laneSequence(BIBLE_READING_PLAN_WEEKS, laneIndex));
    }

    // And the grid as a whole holds exactly the same multiset of chapters —
    // nothing gained, nothing lost, nothing duplicated by the split.
    const tally = (weeks: readonly BibleReadingPlanWeek[]) => {
      const counts = new Map<string, number>();
      for (const week of weeks) {
        for (const day of week.days) {
          for (const chapter of chaptersForReading(day.reading)) {
            counts.set(chapter, (counts.get(chapter) ?? 0) + 1);
          }
        }
      }
      return counts;
    };

    const source = tally(BIBLE_READING_PLAN_WEEKS);
    const derived = tally(BIBLE_READING_PLAN_104_WEEKS);

    expect(derived.size).toBe(source.size);
    for (const [chapter, count] of source) {
      expect(derived.get(chapter), `chapter ${chapter}`).toBe(count);
    }
  });

  it("never splits a chapter and never reverses a range", () => {
    for (const week of BIBLE_READING_PLAN_104_WEEKS) {
      for (const day of week.days) {
        if (isCatchUpReading(day.reading)) continue;

        // No verse-level notation anywhere in the derived plan.
        expect(day.reading, `verse split in ${day.reading}`).not.toMatch(/:/);
        expect(day.reading).not.toMatch(/\d\s*\.\s*\d/);

        const range = bibleReadingPlanAssignmentForReading(day.reading);
        expect(range, `unreadable reading ${day.reading}`).not.toBeNull();
        if (!range) continue;
        expect(Number.isInteger(range.startChapter)).toBe(true);
        expect(range.startChapter).toBeGreaterThanOrEqual(1);
        expect(range.endChapter).toBeGreaterThanOrEqual(range.startChapter);
      }
    }
  });

  it("balances each pair within one chapter of an even split", () => {
    BIBLE_READING_PLAN_WEEKS.forEach((sourceWeek, sourceIndex) => {
      const [firstWeek, secondWeek] = planWeekPairForSourceWeek(sourceIndex + 1);

      sourceWeek.days.forEach((sourceDay, laneIndex) => {
        const first = chaptersForReading(
          BIBLE_READING_PLAN_104_WEEKS[firstWeek - 1].days[laneIndex].reading,
        ).length;
        const second = chaptersForReading(
          BIBLE_READING_PLAN_104_WEEKS[secondWeek - 1].days[laneIndex].reading,
        ).length;

        expect(
          Math.abs(first - second),
          `${sourceDay.reading} split ${first}/${second}`,
        ).toBeLessThanOrEqual(1);
      });
    });
  });
});

describe("Catch-up cells", () => {
  it("only appear where the source reading was a single chapter", () => {
    let catchUpCount = 0;

    BIBLE_READING_PLAN_WEEKS.forEach((sourceWeek, sourceIndex) => {
      const [firstWeek, secondWeek] = planWeekPairForSourceWeek(sourceIndex + 1);

      sourceWeek.days.forEach((sourceDay, laneIndex) => {
        const sourceChapters = chaptersForReading(sourceDay.reading).length;
        const firstReading =
          BIBLE_READING_PLAN_104_WEEKS[firstWeek - 1].days[laneIndex].reading;
        const secondReading =
          BIBLE_READING_PLAN_104_WEEKS[secondWeek - 1].days[laneIndex].reading;

        if (isCatchUpReading(secondReading)) {
          catchUpCount += 1;
          expect(
            sourceChapters,
            `Catch-up created from a divisible reading: ${sourceDay.reading}`,
          ).toBe(1);
          // The one chapter still lands somewhere — verbatim.
          expect(firstReading).toBe(sourceDay.reading.trim());
        }

        // A Catch-up is never the FIRST of a pair — the reading always comes
        // first, the rest cell second.
        expect(isCatchUpReading(firstReading)).toBe(false);
      });
    });

    // The plan genuinely contains indivisible readings, so this behavior is
    // exercised rather than theoretical: 17 rest cells out of 728.
    expect(catchUpCount).toBe(17);
  });

  it("keeps single-chapter and one-chapter-book readings whole", () => {
    expect(splitPlanReading("Ps 119")).toEqual(["Ps 119", CATCH_UP_READING]);
    expect(splitPlanReading("Prov 1")).toEqual(["Prov 1", CATCH_UP_READING]);
    expect(splitPlanReading("Jude")).toEqual(["Jude", CATCH_UP_READING]);
    expect(splitPlanReading("Obadiah")).toEqual(["Obadiah", CATCH_UP_READING]);
    expect(splitPlanReading("Philemon")).toEqual(["Philemon", CATCH_UP_READING]);
    expect(splitPlanReading("2John")).toEqual(["2John", CATCH_UP_READING]);
    expect(splitPlanReading("3John")).toEqual(["3John", CATCH_UP_READING]);
  });
});

describe("splitPlanReading", () => {
  it("splits even ranges down the middle", () => {
    expect(splitPlanReading("Rom 1-2")).toEqual(["Rom 1", "Rom 2"]);
    expect(splitPlanReading("Gen 4-7")).toEqual(["Gen 4-5", "Gen 6-7"]);
    expect(splitPlanReading("1Cor 1-2")).toEqual(["1Cor 1", "1Cor 2"]);
  });

  it("gives the extra chapter to the first week on odd ranges", () => {
    expect(splitPlanReading("Gen 1-3")).toEqual(["Gen 1-2", "Gen 3"]);
    expect(splitPlanReading("Josh 1-5")).toEqual(["Josh 1-3", "Josh 4-5"]);
    expect(splitPlanReading("Isa 1-6")).toEqual(["Isa 1-3", "Isa 4-6"]);
  });

  it("resolves whole-book readings through the real chapter count", () => {
    // Ruth has 4 chapters; Malachi has 4; Lamentations has 5.
    expect(splitPlanReading("Ruth")).toEqual(["Ruth 1-2", "Ruth 3-4"]);
    expect(splitPlanReading("Malachi")).toEqual(["Malachi 1-2", "Malachi 3-4"]);
    expect(splitPlanReading("Lamentations")).toEqual([
      "Lamentations 1-3",
      "Lamentations 4-5",
    ]);
    expect(splitPlanReading("2Pet")).toEqual(["2Pet 1-2", "2Pet 3"]);
  });

  it("produces labels the shared plan parser can still read", () => {
    for (const label of ["Ruth 1-2", "Malachi 3-4", "2Pet 1-2", "1Cor 1", "Ps 119"]) {
      expect(bibleReadingPlanAssignmentForReading(label), label).not.toBeNull();
    }
  });
});

describe("the canonical 52-week plan is untouched", () => {
  it("still has exactly 52 weeks of seven readings", () => {
    expect(BIBLE_READING_PLAN_WEEKS).toHaveLength(52);
    BIBLE_READING_PLAN_WEEKS.forEach((week, index) => {
      expect(week.week).toBe(index + 1);
      expect(week.days).toHaveLength(7);
    });
  });

  it("still reads exactly as it always has in week 1", () => {
    expect(BIBLE_READING_PLAN_WEEKS[0].days.map((day) => day.reading)).toEqual([
      "Rom 1-2",
      "Gen 1-3",
      "Josh 1-5",
      "Ps 1-2",
      "Job 1-2",
      "Isa 1-6",
      "Matt 1-2",
    ]);
  });

  it("contains no Catch-up cells", () => {
    for (const week of BIBLE_READING_PLAN_WEEKS) {
      for (const day of week.days) {
        expect(isCatchUpReading(day.reading)).toBe(false);
      }
    }
  });
});
