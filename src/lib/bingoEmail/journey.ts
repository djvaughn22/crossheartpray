// Bible Bingo 7 email journey — deterministic, lane-balanced reading order.
//
// The 52-week plan has exactly one reading per lane (Sunday–Saturday) per
// week, so a full journey is 52 batches of 7 with one card per lane — the
// same seven lanes the Bible Bingo 7 board deals. The order is derived
// entirely from a stored seed: the same seed always produces the same
// order, so switching Daily/Weekly or retrying a send can never reshuffle.
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

export const BINGO_EMAIL_BATCH_SIZE = 7;

// Sunday-first, matching BIBLE_BINGO_SECTIONS and the plan's weekly rhythm.
const LANE_SLUGS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

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
  const index = LANE_SLUGS.indexOf(daySlug);
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

/* ------------------------------------------------ deterministic shuffle */

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seedNumber: number) {
  let state = seedNumber || 1;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], seed: string): T[] {
  const random = mulberry32(hashSeed(seed));
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

/* ---------------------------------------------------------- the journey */

/**
 * The complete randomized reading order for one journey seed.
 *
 * Each lane (weekday) is shuffled independently, then lanes are interleaved
 * round-robin, so every consecutive group of BATCH_SIZE readings holds one
 * reading per lane while lanes last. Deterministic: same seed, same order.
 * Handles uneven lanes and plan-size changes without assuming 364 entries.
 */
export function bingoEmailJourneyOrder(
  seed: string,
  weeks: BibleReadingPlanWeek[] = BIBLE_READING_PLAN_WEEKS,
): string[] {
  const days = planDays(weeks);
  const knownSlugs = LANE_SLUGS.filter((slug) =>
    days.some((day) => day.daySlug === slug),
  );
  const extraSlugs = [...new Set(days.map((day) => day.daySlug))].filter(
    (slug) => !LANE_SLUGS.includes(slug),
  );

  const lanes = [...knownSlugs, ...extraSlugs].map((slug) =>
    seededShuffle(
      days.filter((day) => day.daySlug === slug).map(bingoEmailReadingId),
      `${seed}|${slug}`,
    ),
  );

  const order: string[] = [];
  const longestLane = Math.max(0, ...lanes.map((lane) => lane.length));
  for (let round = 0; round < longestLane; round += 1) {
    for (const lane of lanes) {
      if (round < lane.length) order.push(lane[round]);
    }
  }

  return order;
}

/**
 * Reading ids for one batch (sequence 0 is the first email). The final
 * batch may hold fewer than BATCH_SIZE readings; past the end is [].
 */
export function bingoEmailBatchReadingIds(
  order: string[],
  sequence: number,
): string[] {
  if (!Number.isInteger(sequence) || sequence < 0) return [];
  return order.slice(
    sequence * BINGO_EMAIL_BATCH_SIZE,
    (sequence + 1) * BINGO_EMAIL_BATCH_SIZE,
  );
}

export function bingoEmailTotalBatches(planSize: number) {
  return Math.ceil(planSize / BINGO_EMAIL_BATCH_SIZE);
}

export function bingoEmailPlanSize(
  weeks: BibleReadingPlanWeek[] = BIBLE_READING_PLAN_WEEKS,
) {
  return planDays(weeks).length;
}
