// Canonical annual Bible Reading Plan progress — the ONE progress source for
// the Reading Plan board, Bible Bingo 7, and email completion flows.
//
// Model: completion is stored per plan year (America/Chicago, matching every
// other CrossHeartPray day boundary) under the stable canonical entry id
// `week-{1..52}-{sunday..saturday}`. Verse references, labels, and
// translations are NEVER identity — a reading is the same reading whether it
// was reached from a BSB card, a WEBUS-era link, or the plan board.
//
// Storage:
//   v2  "crossheartpray:bible-reading-plan:v2"
//       { years: { "2026": { "week-1-sunday": true, ... } } }
//   v1  "crossheartpray:bible-reading-plan:v1"   (legacy, flat map)
//       Read once as the current year's starting point and kept mirrored to
//       the current year on every save, so older tabs/components keep
//       working during rollout and no completion data is ever lost.
//
// Local-first by design: no accounts, no database. The Bingo email journey's
// server-side copy stays authoritative for emailed batches and continues to
// merge through the same ids.

import {
  parseChecklistProgress,
  type ChecklistProgress,
} from "./checklistProgress";
import {
  normalizeReadingPlanSyncEntryId,
  READING_PLAN_SYNC_PLAN_IDS,
} from "./readingPlanSyncModel";

export const READING_PLAN_PROGRESS_KEY_V1 = "crossheartpray:bible-reading-plan:v1";
export const READING_PLAN_PROGRESS_KEY_V2 = "crossheartpray:bible-reading-plan:v2";
export const READING_PLAN_PROGRESS_EVENT = "crossheartpray:bible-reading-plan-progress";

/** The plan year for a moment in time — America/Chicago, like /today. */
export function currentPlanYear(date: Date = new Date()): number {
  const year = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      year: "numeric",
    }).format(date),
  );
  return Number.isInteger(year) ? year : date.getUTCFullYear();
}

/**
 * Normalize a stored id to the canonical `week-N-daySlug` form.
 * Accepts case variants and zero-padded weeks ("Week-05-Friday" →
 * "week-5-friday"). Returns null for ids that are not plan entries — callers
 * keep unknown ids stored (never destroy data) but don't count them.
 */
export function normalizeReadingPlanEntryId(id: string): string | null {
  return normalizeReadingPlanSyncEntryId(
    READING_PLAN_SYNC_PLAN_IDS.oneYear,
    id,
  );
}

type StoredYears = Record<string, ChecklistProgress>;

function parseStoredYears(raw: string | null): StoredYears {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as { years?: unknown };
    if (!parsed || typeof parsed !== "object" || typeof parsed.years !== "object") {
      return {};
    }
    const years: StoredYears = {};
    for (const [year, value] of Object.entries(parsed.years as Record<string, unknown>)) {
      if (/^\d{4}$/.test(year)) years[year] = parseChecklistProgress(value);
    }
    return years;
  } catch {
    return {};
  }
}

/**
 * Merge stored ids into canonical form: canonical ids normalize (and
 * de-duplicate), non-plan ids pass through untouched so no legacy data is
 * ever dropped.
 */
function normalizeProgressMap(progress: ChecklistProgress): ChecklistProgress {
  const result: ChecklistProgress = {};
  for (const [id, done] of Object.entries(progress)) {
    if (!done) continue;
    result[normalizeReadingPlanEntryId(id) ?? id] = true;
  }
  return result;
}

function readStoredYears(): StoredYears {
  if (typeof window === "undefined") return {};
  let years: StoredYears = {};
  try {
    years = parseStoredYears(window.localStorage.getItem(READING_PLAN_PROGRESS_KEY_V2));
  } catch {
    years = {};
  }

  // Legacy flat map (v1): everything saved before years existed belongs to
  // the year the person is in now — merged non-destructively so completions
  // written by not-yet-updated tabs/components are adopted too.
  try {
    const legacyRaw = window.localStorage.getItem(READING_PLAN_PROGRESS_KEY_V1);
    if (legacyRaw) {
      const legacy = normalizeProgressMap(parseChecklistProgress(JSON.parse(legacyRaw)));
      const yearKey = String(currentPlanYear());
      years[yearKey] = { ...legacy, ...normalizeProgressMap(years[yearKey] ?? {}) };
    }
  } catch {
    // Corrupt legacy data never blocks current progress.
  }

  return years;
}

function writeStoredYears(years: StoredYears): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      READING_PLAN_PROGRESS_KEY_V2,
      JSON.stringify({ years }),
    );
    // Mirror the current year flat for anything still reading the v1 key.
    window.localStorage.setItem(
      READING_PLAN_PROGRESS_KEY_V1,
      JSON.stringify(years[String(currentPlanYear())] ?? {}),
    );
  } catch {
    // Private mode / quota — in-memory state remains the session's truth.
  }
  window.dispatchEvent(new Event(READING_PLAN_PROGRESS_EVENT));
}

/** The completion map for a plan year (current year by default). */
export function loadReadingPlanProgress(year: number = currentPlanYear()): ChecklistProgress {
  const stored = readStoredYears()[String(year)];
  return stored ? normalizeProgressMap(stored) : {};
}

/** The set of canonically completed entry ids for a plan year. */
export function completedReadingPlanEntryIds(
  year: number = currentPlanYear(),
): Set<string> {
  const completed = new Set<string>();
  for (const [id, done] of Object.entries(loadReadingPlanProgress(year))) {
    if (!done) continue;
    const canonical = normalizeReadingPlanEntryId(id);
    if (canonical) completed.add(canonical);
  }
  return completed;
}

/** Mark one entry complete/incomplete for a plan year. */
export function setReadingPlanEntryCompleted(
  id: string,
  completed: boolean,
  year: number = currentPlanYear(),
): ChecklistProgress {
  return setReadingPlanEntriesCompleted([id], completed, year);
}

/**
 * Bulk completion update (used by email-batch merges). Read-modify-write so
 * concurrent tabs lose at most the final race, never whole maps.
 */
export function setReadingPlanEntriesCompleted(
  ids: readonly string[],
  completed: boolean,
  year: number = currentPlanYear(),
): ChecklistProgress {
  const years = readStoredYears();
  const yearKey = String(year);
  const current = normalizeProgressMap(years[yearKey] ?? {});

  for (const id of ids) {
    const canonical = normalizeReadingPlanEntryId(id) ?? id.trim();
    if (!canonical) continue;
    if (completed) {
      current[canonical] = true;
    } else {
      delete current[canonical];
    }
  }

  years[yearKey] = current;
  writeStoredYears(years);
  return current;
}

/** Replace a year's whole map (the Reading Plan board's toggle flow). */
export function saveReadingPlanProgress(
  progress: ChecklistProgress,
  year: number = currentPlanYear(),
): void {
  const years = readStoredYears();
  years[String(year)] = normalizeProgressMap(progress);
  writeStoredYears(years);
}

/**
 * Follow canonical progress from anywhere: fires on our own save event,
 * cross-tab storage changes, and tab focus/visibility (an already-open Bingo
 * page reconciles when the person returns to it). Returns a cleanup.
 */
export function subscribeToReadingPlanProgress(
  listener: (progress: ChecklistProgress) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const notify = () => listener(loadReadingPlanProgress());
  const onVisibility = () => {
    if (document.visibilityState === "visible") notify();
  };

  window.addEventListener(READING_PLAN_PROGRESS_EVENT, notify);
  window.addEventListener("storage", notify);
  window.addEventListener("focus", notify);
  document.addEventListener("visibilitychange", onVisibility);
  notify();

  return () => {
    window.removeEventListener(READING_PLAN_PROGRESS_EVENT, notify);
    window.removeEventListener("storage", notify);
    window.removeEventListener("focus", notify);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
