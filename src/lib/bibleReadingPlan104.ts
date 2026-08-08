// The 2 Year / 104 Week pacing of the SAME Bible Reading Plan.
//
// This file adds no new reading order and no new Scripture. It is a pure,
// deterministic derivation of the canonical 52-week plan in
// src/lib/bibleReadingPlan.ts:
//
//   source week 1 -> 104-week weeks 1 and 2
//   source week 2 -> 104-week weeks 3 and 4
//   ...
//   source week N -> 104-week weeks 2N-1 and 2N
//
// Each source reading is split at CHAPTER boundaries only. Verses are never
// split, chapters are never invented, and no chapter is ever dropped or
// duplicated. When a source reading is a single chapter and cannot legally be
// divided, the whole chapter goes to the first of the two weeks and the second
// week's matching cell becomes an intentional Catch-up cell — never a made-up
// passage.
//
// The canonical 52-week data is the source of truth and is never mutated.

import {
  BIBLE_READING_PLAN_WEEKS,
  bibleReadingPlanAssignmentForReading,
  type BibleReadingPlanDay,
  type BibleReadingPlanWeek,
} from "./bibleReadingPlan";
import { getScriptureBook } from "./scripture/books";

export const BIBLE_READING_PLAN_104_PDF_HREF =
  "/resources/104-week-bible-reading-plan.pdf";

export const BIBLE_READING_PLAN_104_SOURCE = "104 Week Bible Reading Plan";

/**
 * The label shown in a cell that has no Scripture because its source reading
 * was a single chapter and could not be divided further. A rest day, on
 * purpose — no checkbox, no reader, no Deep Dive.
 */
export const CATCH_UP_READING = "Catch-up";

export function isCatchUpReading(reading: string): boolean {
  return reading.trim().toLowerCase() === CATCH_UP_READING.toLowerCase();
}

type ChapterSpan = {
  /** The book token exactly as the source plan spells it ("1Cor", "Ps"). */
  token: string;
  startChapter: number;
  endChapter: number;
};

/**
 * The chapter span of a source reading label, using the plan's own spelling.
 *
 * "Gen 1-3"  -> { token: "Gen", start: 1, end: 3 }
 * "Ps 119"   -> { token: "Ps", start: 119, end: 119 }
 * "Ruth"     -> { token: "Ruth", start: 1, end: 4 }   (whole book)
 *
 * Whole-book labels resolve their real chapter count through the shared
 * Scripture book table, so nothing here guesses at how long a book is.
 * Returns null for any label this cannot read with certainty — the caller
 * then refuses to split rather than fabricating a range.
 */
function chapterSpanForReading(reading: string): ChapterSpan | null {
  const label = reading.trim().replace(/\s+/g, " ");
  if (!label) return null;

  const numbered = label.match(/^(.*?)\s+(\d+)(?:\s*[-–—]\s*(\d+))?$/);

  if (numbered) {
    const token = numbered[1].trim();
    const startChapter = Number(numbered[2]);
    const endChapter = numbered[3] ? Number(numbered[3]) : startChapter;
    if (!token || !Number.isInteger(startChapter) || !Number.isInteger(endChapter)) {
      return null;
    }
    if (startChapter < 1 || endChapter < startChapter) return null;
    return { token, startChapter, endChapter };
  }

  // No chapter numbers: the reading covers a whole book ("Ruth", "2Pet").
  const range = bibleReadingPlanAssignmentForReading(label);
  if (!range) return null;
  const book = getScriptureBook(range.code);
  if (!book || !Number.isInteger(book.chapters) || book.chapters < 1) return null;

  return { token: label, startChapter: 1, endChapter: book.chapters };
}

function formatReading(token: string, startChapter: number, endChapter: number) {
  return startChapter === endChapter
    ? `${token} ${startChapter}`
    : `${token} ${startChapter}-${endChapter}`;
}

/**
 * Split one source reading into its two consecutive 104-week readings.
 *
 * - Whole chapters only; the first half takes the extra chapter when the
 *   count is odd.
 * - A single-chapter source reading goes whole to the first week and leaves
 *   the second week as a Catch-up cell.
 * - A whole-book source reading that is exactly one chapter long (Obadiah,
 *   Philemon, 2John, 3John, Jude) keeps the source label verbatim, because
 *   that label already means "the whole book".
 * - A label this cannot parse is passed through unchanged to the first week
 *   rather than being reshaped into something the source never said.
 */
export function splitPlanReading(reading: string): [string, string] {
  const span = chapterSpanForReading(reading);
  if (!span) return [reading, CATCH_UP_READING];

  const chapterCount = span.endChapter - span.startChapter + 1;

  if (chapterCount <= 1) {
    // Indivisible. Keep the source label exactly as written so whole-book
    // readings stay whole-book readings.
    return [reading.trim(), CATCH_UP_READING];
  }

  const firstCount = Math.ceil(chapterCount / 2);
  const firstEnd = span.startChapter + firstCount - 1;

  return [
    formatReading(span.token, span.startChapter, firstEnd),
    formatReading(span.token, firstEnd + 1, span.endChapter),
  ];
}

/**
 * Build the full 104-week plan from a 52-week source plan. Deterministic:
 * the same source always produces the same output, with no randomness, no
 * clock, and no network.
 */
export function buildBibleReadingPlan104Weeks(
  source: readonly BibleReadingPlanWeek[] = BIBLE_READING_PLAN_WEEKS,
): BibleReadingPlanWeek[] {
  const weeks: BibleReadingPlanWeek[] = [];

  source.forEach((sourceWeek, sourceIndex) => {
    const firstWeekNumber = sourceIndex * 2 + 1;
    const secondWeekNumber = firstWeekNumber + 1;

    const firstDays: BibleReadingPlanDay[] = [];
    const secondDays: BibleReadingPlanDay[] = [];

    for (const day of sourceWeek.days) {
      const [firstReading, secondReading] = splitPlanReading(day.reading);

      firstDays.push({
        week: firstWeekNumber,
        daySlug: day.daySlug,
        dayLabel: day.dayLabel,
        category: day.category,
        reading: firstReading,
      });

      secondDays.push({
        week: secondWeekNumber,
        daySlug: day.daySlug,
        dayLabel: day.dayLabel,
        category: day.category,
        reading: secondReading,
      });
    }

    weeks.push({ week: firstWeekNumber, days: firstDays });
    weeks.push({ week: secondWeekNumber, days: secondDays });
  });

  return weeks;
}

/** The 104-week plan, derived once from the canonical 52-week plan. */
export const BIBLE_READING_PLAN_104_WEEKS: BibleReadingPlanWeek[] =
  buildBibleReadingPlan104Weeks();

/**
 * The two 104-week week numbers a 52-week source week maps to.
 * Source week 1 -> [1, 2]; source week 52 -> [103, 104].
 */
export function planWeekPairForSourceWeek(sourceWeek: number): [number, number] {
  return [sourceWeek * 2 - 1, sourceWeek * 2];
}
