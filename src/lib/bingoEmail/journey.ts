// Bible Bingo 7 email journey — canonical 52-week plan order with a
// weekday rotation anchored to the subscriber's start weekday.
//
// The journey visits the plan's weeks IN ORDER (Week 1 → Week 52). Within
// each week the seven weekday readings are rotated so position 0 is the
// weekday the subscriber's journey began on (recorded at first send,
// America/Chicago — the site's Central-time convention). A Wednesday start
// reads Week 1 Wed→Thu→Fri→Sat→Sun→Mon→Tue, then Week 2 Wednesday, and so
// on: all 364 readings exactly once, no randomization.
//
// Both cadences share this one order — Weekly takes seven at a time (a
// complete plan week), Daily takes one at a time — so switching cadence
// can never duplicate, skip, or reset anything.
//
// Reading ids are the SAME ids the Bible Reading Plan checklist uses
// ("week-12-friday"), so emailed progress and the plan page line up.

import {
  BIBLE_READING_PLAN_WEEKS,
  bibleReadingPlanDayHref,
  type BibleReadingPlanDay,
  type BibleReadingPlanWeek,
} from "../bibleReadingPlan";
import { BIBLE_BINGO_SECTIONS } from "../dailyBibleBingo";

/** Weekly cadence batch size; Daily sends one reading per email. */
export const BINGO_EMAIL_BATCH_SIZE = 7;

// Sunday-first, matching BIBLE_BINGO_SECTIONS and the plan's weekly rhythm.
export const BINGO_EMAIL_WEEKDAY_SLUGS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const CHICAGO_WEEKDAY_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  weekday: "long",
});

/**
 * The plan weekday slug for a moment in time, in the application's
 * documented default timezone (America/Chicago).
 */
export function bingoEmailWeekdaySlugFor(date: Date): string {
  return CHICAGO_WEEKDAY_FORMAT.format(date).toLowerCase();
}

export type BingoEmailReadingCard = {
  /** Same id the Bible Reading Plan checklist stores ("week-1-monday"). */
  id: string;
  week: number;
  daySlug: string;
  dayLabel: string;
  category: string;
  /** Plan reading label, e.g. "Gen 1-3". */
  reading: string;
  /** Bingo lane emoji for this weekday lane. */
  emoji: string;
  /** Bingo lane title, e.g. "Monday — Law". */
  laneTitle: string;
  /** Deep link into the existing Bible Reading Plan cell. */
  planHref: string;
};

export function bingoEmailReadingId(day: BibleReadingPlanDay) {
  return `week-${day.week}-${day.daySlug}`;
}

function planDays(weeks: BibleReadingPlanWeek[]): BibleReadingPlanDay[] {
  return weeks.flatMap((week) => week.days);
}

const lookupCache = new WeakMap<object, Map<string, BibleReadingPlanDay>>();

function daysById(weeks: BibleReadingPlanWeek[]) {
  const cached = lookupCache.get(weeks);
  if (cached) return cached;
  const built = new Map(
    planDays(weeks).map((day) => [bingoEmailReadingId(day), day]),
  );
  lookupCache.set(weeks, built);
  return built;
}

function laneSectionForSlug(daySlug: string) {
  const index = BINGO_EMAIL_WEEKDAY_SLUGS.indexOf(daySlug);
  return index >= 0 ? BIBLE_BINGO_SECTIONS[index] : null;
}

/** Card data for one plan reading id; null for unknown ids. */
export function bingoEmailCardForReadingId(
  id: string,
  weeks: BibleReadingPlanWeek[] = BIBLE_READING_PLAN_WEEKS,
): BingoEmailReadingCard | null {
  const day = daysById(weeks).get(id);
  if (!day) return null;

  const section = laneSectionForSlug(day.daySlug);

  return {
    id,
    week: day.week,
    daySlug: day.daySlug,
    dayLabel: day.dayLabel,
    category: day.category,
    reading: day.reading,
    emoji: section?.emoji ?? "📖",
    laneTitle: section?.title ?? day.category,
    planHref: bibleReadingPlanDayHref(day),
  };
}

/* --------------------------------------------------- the canonical order */

/**
 * The complete journey order for one start weekday: plan weeks in
 * canonical sequence, each week's readings rotated so the start weekday
 * comes first. Deterministic — the start weekday alone defines the order.
 * Readings whose weekday sits outside the known seven (future-proofing)
 * are appended at the end of their week so nothing is ever dropped.
 */
export function bingoEmailJourneyOrder(
  startDaySlug: string,
  weeks: BibleReadingPlanWeek[] = BIBLE_READING_PLAN_WEEKS,
): string[] {
  const startIndex = Math.max(
    0,
    BINGO_EMAIL_WEEKDAY_SLUGS.indexOf(startDaySlug),
  );
  const rotation = BINGO_EMAIL_WEEKDAY_SLUGS.map(
    (_, offset) =>
      BINGO_EMAIL_WEEKDAY_SLUGS[
        (startIndex + offset) % BINGO_EMAIL_WEEKDAY_SLUGS.length
      ],
  );

  const order: string[] = [];
  for (const week of weeks) {
    for (const slug of rotation) {
      for (const day of week.days) {
        if (day.daySlug === slug) order.push(bingoEmailReadingId(day));
      }
    }
    for (const day of week.days) {
      if (!BINGO_EMAIL_WEEKDAY_SLUGS.includes(day.daySlug)) {
        order.push(bingoEmailReadingId(day));
      }
    }
  }

  return order;
}

/** How many readings one email carries for a cadence. */
export function bingoEmailBatchSizeForCadence(cadence: "weekly" | "daily") {
  return cadence === "daily" ? 1 : BINGO_EMAIL_BATCH_SIZE;
}

/**
 * Reading ids for the batch that starts at `position` (count of readings
 * already delivered). The final batch may hold fewer readings than the
 * cadence size; past the end is [].
 */
export function bingoEmailBatchReadingIdsAt(
  order: string[],
  position: number,
  size: number,
): string[] {
  if (!Number.isInteger(position) || position < 0 || size < 1) return [];
  return order.slice(position, position + size);
}

export function bingoEmailTotalBatches(planSize: number) {
  return Math.ceil(planSize / BINGO_EMAIL_BATCH_SIZE);
}

export function bingoEmailPlanSize(
  weeks: BibleReadingPlanWeek[] = BIBLE_READING_PLAN_WEEKS,
) {
  return planDays(weeks).length;
}
