// Progress for the 2 Year / 104 Week pacing — deliberately its OWN namespace.
//
// Why a separate service instead of a flag on the canonical one:
// the canonical annual service (src/lib/readingPlanProgress.ts) is the single
// source of truth for the 52-week plan, Bible Bingo 7, and the Bingo email
// journey. Its entry ids are `week-{1..52}-{daySlug}` and it buckets progress
// by plan YEAR. A 104-week track has week numbers past 52 and spans two
// years, so it fits neither rule. Writing it into that key would either be
// rejected or, worse, silently read by Bingo as annual progress.
//
// So the two tracks never share storage. The 52-week keys are named ONLY in
// readingPlanProgress.ts — one canonical definition, enforced by
// progressSyncContract.test.ts — and this file adds its own key beside them,
// never referencing theirs.
//
// Nothing here reads, writes, migrates, or clears the canonical keys. A
// person can hold week 20 of the 1-year plan and week 8 of the 2-year plan at
// the same time, and switching between them changes neither.

import {
  loadChecklistProgress,
  type ChecklistProgress,
} from "./checklistProgress";
import {
  normalizeReadingPlanSyncEntryId,
  READING_PLAN_SYNC_PLAN_IDS,
} from "./readingPlanSyncModel";

export const READING_PLAN_104_PROGRESS_KEY =
  "crossheartpray:bible-reading-plan-104:v1";
export const READING_PLAN_104_PROGRESS_EVENT =
  "crossheartpray:bible-reading-plan-104-progress";

/**
 * Normalize a stored id to canonical `week-N-daySlug` form for N in 1..104.
 * Returns null for anything that is not a 104-week plan entry — callers keep
 * unknown ids stored (never destroy data) but don't count them.
 */
export function normalizeReadingPlan104EntryId(id: string): string | null {
  return normalizeReadingPlanSyncEntryId(
    READING_PLAN_SYNC_PLAN_IDS.twoYear,
    id,
  );
}

function normalizeProgressMap(progress: ChecklistProgress): ChecklistProgress {
  const result: ChecklistProgress = {};
  for (const [id, done] of Object.entries(progress)) {
    if (!done) continue;
    result[normalizeReadingPlan104EntryId(id) ?? id] = true;
  }
  return result;
}

/** The 104-week completion map. Corrupt or missing storage reads as empty. */
export function loadReadingPlan104Progress(): ChecklistProgress {
  return normalizeProgressMap(loadChecklistProgress(READING_PLAN_104_PROGRESS_KEY));
}

/** Replace the 104-week map (the board's toggle flow). */
export function saveReadingPlan104Progress(progress: ChecklistProgress): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      READING_PLAN_104_PROGRESS_KEY,
      JSON.stringify(normalizeProgressMap(progress)),
    );
  } catch {
    // Private mode / quota — in-memory state remains the session's truth.
  }
  window.dispatchEvent(new Event(READING_PLAN_104_PROGRESS_EVENT));
}

/** The set of completed 104-week entry ids. */
export function completedReadingPlan104EntryIds(): Set<string> {
  const completed = new Set<string>();
  for (const [id, done] of Object.entries(loadReadingPlan104Progress())) {
    if (!done) continue;
    const canonical = normalizeReadingPlan104EntryId(id);
    if (canonical) completed.add(canonical);
  }
  return completed;
}

/**
 * Follow 104-week progress: our own save event, cross-tab storage changes,
 * and tab focus/visibility — mirroring the canonical service's contract so
 * the board behaves identically on either pacing. Returns a cleanup.
 */
export function subscribeToReadingPlan104Progress(
  listener: (progress: ChecklistProgress) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const notify = () => listener(loadReadingPlan104Progress());
  const onVisibility = () => {
    if (document.visibilityState === "visible") notify();
  };

  window.addEventListener(READING_PLAN_104_PROGRESS_EVENT, notify);
  window.addEventListener("storage", notify);
  window.addEventListener("focus", notify);
  document.addEventListener("visibilitychange", onVisibility);
  notify();

  return () => {
    window.removeEventListener(READING_PLAN_104_PROGRESS_EVENT, notify);
    window.removeEventListener("storage", notify);
    window.removeEventListener("focus", notify);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
