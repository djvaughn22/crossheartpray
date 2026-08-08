// Stable identity contract shared by every CrossHeartPray Reading Plan pace.
//
// This module does NOT perform network requests, authentication, database
// access, or persistence. It only defines identities that local progress can
// later use for optional CrossHeartPray Sync.
//
// Versioned plan ids prevent a future schedule revision from accidentally
// attaching old completion state to different readings.

export const READING_PLAN_SYNC_PLAN_IDS = {
  oneYear: "one-year-v1",
  twoYear: "two-year-v1",
} as const;

export type ReadingPlanSyncPlanId =
  (typeof READING_PLAN_SYNC_PLAN_IDS)[keyof typeof READING_PLAN_SYNC_PLAN_IDS];

export type ReadingPlanSyncIdentity = Readonly<{
  planId: ReadingPlanSyncPlanId;
  // The existing 1-year plan is intentionally bucketed by Central-time plan
  // year. Keep that dimension explicit rather than hiding it in the item id.
  // The existing 2-year local model has no cycle bucket, so it remains null.
  cycleId: string | null;
  itemId: string;
}>;

export type ReadingPlanSyncItemState = Readonly<{
  completed: boolean;
  // Legacy/local-only completion has no reliable change timestamp yet.
  // Later Sync changes can populate this without rewriting today's storage.
  updatedAt: string | null;
}>;

const DAY_SLUGS = new Set([
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
]);

const PLAN_MAX_WEEK: Record<ReadingPlanSyncPlanId, number> = {
  [READING_PLAN_SYNC_PLAN_IDS.oneYear]: 52,
  [READING_PLAN_SYNC_PLAN_IDS.twoYear]: 104,
};

/**
 * Normalize a local Reading Plan entry to its stable plan-local item id.
 * Visible reading text, Scripture translation, and labels are never identity.
 */
export function normalizeReadingPlanSyncEntryId(
  planId: ReadingPlanSyncPlanId,
  id: string,
): string | null {
  const match = id
    .trim()
    .toLowerCase()
    .match(/^week-0*(\d{1,3})-([a-z]+)$/);

  if (!match) return null;

  const week = Number(match[1]);
  const daySlug = match[2];

  if (
    !Number.isInteger(week) ||
    week < 1 ||
    week > PLAN_MAX_WEEK[planId] ||
    !DAY_SLUGS.has(daySlug)
  ) {
    return null;
  }

  return `week-${week}-${daySlug}`;
}

/**
 * Build the complete stable Sync identity for an existing local entry.
 *
 * 1-year:
 *   planId  = one-year-v1
 *   cycleId = 2026
 *   itemId  = week-17-friday
 *
 * 2-year:
 *   planId  = two-year-v1
 *   cycleId = null
 *   itemId  = week-34-friday
 */
export function createReadingPlanSyncIdentity(
  planId: ReadingPlanSyncPlanId,
  id: string,
  options: { planYear?: number } = {},
): ReadingPlanSyncIdentity | null {
  const itemId = normalizeReadingPlanSyncEntryId(planId, id);
  if (!itemId) return null;

  if (planId === READING_PLAN_SYNC_PLAN_IDS.oneYear) {
    const planYear = options.planYear;
    if (
      !Number.isInteger(planYear) ||
      (planYear as number) < 1000 ||
      (planYear as number) > 9999
    ) {
      return null;
    }

    return {
      planId,
      cycleId: String(planYear),
      itemId,
    };
  }

  return {
    planId,
    cycleId: null,
    itemId,
  };
}

/** Deterministic key useful for merge maps and later pending-Sync queues. */
export function readingPlanSyncIdentityKey(
  identity: ReadingPlanSyncIdentity,
): string {
  return `${identity.planId}:${identity.cycleId ?? "-"}:${identity.itemId}`;
}
