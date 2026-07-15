// Generic checklist-progress mechanics, extracted from the Bible Reading Plan
// (BibleReadingPlanProgress.tsx) so other Open Mirror products can reuse the
// load/save/stats behavior without touching any Scripture content.
//
// Rules for reuse:
// - Every product passes its OWN namespaced, versioned storage key
//   (e.g. "crossheartpray:bible-reading-plan:v1"). Never share keys across
//   products — a CrossHeartPray checklist and any other product's checklist
//   must never read each other's state.
// - Corrupt or legacy stored data must never throw: unknown shapes parse to
//   the closest sensible progress map, garbage parses to {}.

export type ChecklistProgress = Record<string, boolean>;

/**
 * Tolerant parse of previously stored progress. Accepts:
 * - an array of completed ids: ["a","b"]
 * - a map of id -> true / "true"
 * - a map of id -> { read | done | completed: true } (legacy shapes)
 * Anything else (corrupt JSON value, wrong type) parses to {}.
 */
export function parseChecklistProgress(parsed: unknown): ChecklistProgress {
  const result: ChecklistProgress = {};

  if (Array.isArray(parsed)) {
    parsed.forEach((id) => {
      if (typeof id === "string") result[id] = true;
    });
    return result;
  }

  if (parsed && typeof parsed === "object") {
    Object.entries(parsed as Record<string, unknown>).forEach(([key, value]) => {
      if (value === true || value === "true") result[key] = true;
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const record = value as Record<string, unknown>;
        if (record.read === true || record.done === true || record.completed === true) {
          result[key] = true;
        }
      }
    });
  }

  return result;
}

/** SSR-safe, corrupt-safe read of a checklist's progress map. */
export function loadChecklistProgress(storageKey: string): ChecklistProgress {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    return parseChecklistProgress(JSON.parse(raw));
  } catch {
    return {};
  }
}

/**
 * Persist a progress map. Optionally dispatches a window event so other
 * components on the page (e.g. a hub progress card) can follow along.
 * Storage failures (private mode, quota) are swallowed — the in-memory
 * state stays the source of truth for the session.
 */
export function saveChecklistProgress(
  storageKey: string,
  progress: ChecklistProgress,
  changeEventName?: string,
): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(progress));
  } catch {
    // localStorage unavailable — keep going; state still lives in memory.
  }

  if (changeEventName) {
    window.dispatchEvent(new Event(changeEventName));
  }
}

/** Toggle one item; a cleared item is removed from the map, not set false. */
export function toggleChecklistItem(
  progress: ChecklistProgress,
  id: string,
): ChecklistProgress {
  const next = { ...progress, [id]: !progress[id] };
  if (!next[id]) delete next[id];
  return next;
}

export type ChecklistStats = {
  done: number;
  total: number;
  remaining: number;
  percent: number;
};

/** Progress stats for a list of item ids against a progress map. */
export function checklistStats(
  itemIds: readonly string[],
  progress: ChecklistProgress,
): ChecklistStats {
  const total = itemIds.length;
  const done = itemIds.filter((id) => progress[id]).length;
  return {
    done,
    total,
    remaining: Math.max(total - done, 0),
    percent: total ? Math.round((done / total) * 100) : 0,
  };
}
