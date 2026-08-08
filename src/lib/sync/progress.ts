import {
  normalizeReadingPlanSyncEntryId,
  READING_PLAN_SYNC_PLAN_IDS,
  type ReadingPlanSyncPlanId,
} from "../readingPlanSyncModel";

export type ValidSyncProgressUpdate = {
  planId: ReadingPlanSyncPlanId;
  cycleId: string | null;
  itemId: string;
  completed: boolean;
  updatedAt: string;
};

export function validateSyncProgressUpdate(
  raw: unknown,
  now: Date = new Date(),
): ValidSyncProgressUpdate | null {
  if (!raw || typeof raw !== "object") return null;

  const value = raw as Record<string, unknown>;

  if (
    value.planId !== READING_PLAN_SYNC_PLAN_IDS.oneYear &&
    value.planId !== READING_PLAN_SYNC_PLAN_IDS.twoYear
  ) {
    return null;
  }

  const planId = value.planId;
  const itemId =
    typeof value.itemId === "string"
      ? normalizeReadingPlanSyncEntryId(planId, value.itemId)
      : null;

  if (!itemId || typeof value.completed !== "boolean") return null;

  let cycleId: string | null;

  if (planId === READING_PLAN_SYNC_PLAN_IDS.oneYear) {
    if (typeof value.cycleId !== "string" || !/^\d{4}$/.test(value.cycleId)) {
      return null;
    }
    cycleId = value.cycleId;
  } else {
    if (
      value.cycleId !== undefined &&
      value.cycleId !== null &&
      value.cycleId !== ""
    ) {
      return null;
    }
    cycleId = null;
  }

  let updatedAt = now.toISOString();

  if (value.updatedAt !== undefined) {
    if (typeof value.updatedAt !== "string") return null;

    const parsed = new Date(value.updatedAt);
    if (!Number.isFinite(parsed.getTime())) return null;

    // Prevent a bad device clock from winning conflicts indefinitely.
    if (parsed.getTime() > now.getTime() + 5 * 60 * 1000) return null;

    updatedAt = parsed.toISOString();
  }

  return {
    planId,
    cycleId,
    itemId,
    completed: value.completed,
    updatedAt,
  };
}
