// Pure merge model for CrossHeartPray Sync — no network, no storage, no window.
//
// Local reading progress has never carried per-entry timestamps: a completed
// reading is simply present in localStorage, and un-completing it removes the
// key. That is fine for one device and useless for reconciling two. The shadow
// closes that gap: it records the last server state this browser actually saw,
// so the difference between "local" and "shadow" is exactly the set of changes
// this browser made since it last talked to the server.
//
// First connection is the case that matters most. The shadow starts empty, so
// every local completion reads as a local change and is pushed as completed.
// Nothing on the server is ever asked to become false by a browser that has
// simply never synced, which is why connecting an account merges the two sides
// instead of one wiping the other.

import {
  normalizeReadingPlanSyncEntryId,
  READING_PLAN_SYNC_PLAN_IDS,
  type ReadingPlanSyncPlanId,
} from "./readingPlanSyncModel";

export type SyncProgressItem = {
  planId: ReadingPlanSyncPlanId;
  cycleId: string | null;
  itemId: string;
  completed: boolean;
  updatedAt: string;
};

export type SyncShadowEntry = {
  completed: boolean;
  updatedAt: string;
};

/** Last server state this browser saw, keyed by stable sync identity. */
export type SyncShadow = Record<string, SyncShadowEntry>;

/**
 * Every canonical reading currently marked complete on this device.
 * The 1-year plan is bucketed by Central-time plan year; the 2-year plan has
 * no cycle bucket, matching the existing local storage models.
 */
export type LocalProgressSnapshot = {
  oneYearByCycle: Record<string, string[]>;
  twoYear: string[];
};

type SyncIdentity = {
  planId: ReadingPlanSyncPlanId;
  cycleId: string | null;
  itemId: string;
};

export function emptyLocalProgressSnapshot(): LocalProgressSnapshot {
  return { oneYearByCycle: {}, twoYear: [] };
}

export function syncItemKey(identity: SyncIdentity): string {
  return `${identity.planId}:${identity.cycleId ?? "-"}:${identity.itemId}`;
}

/**
 * Rebuild an identity from its key. Plan ids and item ids never contain a
 * colon, so the three parts are unambiguous. Unparseable keys return null and
 * are skipped rather than throwing — a corrupt shadow must never be able to
 * block syncing.
 */
export function parseSyncItemKey(key: string): SyncIdentity | null {
  const parts = key.split(":");
  if (parts.length !== 3) return null;

  const [rawPlanId, rawCycleId, rawItemId] = parts;

  if (
    rawPlanId !== READING_PLAN_SYNC_PLAN_IDS.oneYear &&
    rawPlanId !== READING_PLAN_SYNC_PLAN_IDS.twoYear
  ) {
    return null;
  }

  const planId = rawPlanId;
  const itemId = normalizeReadingPlanSyncEntryId(planId, rawItemId);
  if (!itemId) return null;

  if (planId === READING_PLAN_SYNC_PLAN_IDS.oneYear) {
    if (!/^\d{4}$/.test(rawCycleId)) return null;
    return { planId, cycleId: rawCycleId, itemId };
  }

  if (rawCycleId !== "-") return null;
  return { planId, cycleId: null, itemId };
}

function* snapshotIdentities(
  snapshot: LocalProgressSnapshot,
): Generator<SyncIdentity> {
  for (const [cycleId, itemIds] of Object.entries(snapshot.oneYearByCycle)) {
    if (!/^\d{4}$/.test(cycleId)) continue;

    for (const rawItemId of itemIds) {
      const itemId = normalizeReadingPlanSyncEntryId(
        READING_PLAN_SYNC_PLAN_IDS.oneYear,
        rawItemId,
      );
      if (itemId) {
        yield { planId: READING_PLAN_SYNC_PLAN_IDS.oneYear, cycleId, itemId };
      }
    }
  }

  for (const rawItemId of snapshot.twoYear) {
    const itemId = normalizeReadingPlanSyncEntryId(
      READING_PLAN_SYNC_PLAN_IDS.twoYear,
      rawItemId,
    );
    if (itemId) {
      yield { planId: READING_PLAN_SYNC_PLAN_IDS.twoYear, cycleId: null, itemId };
    }
  }
}

/**
 * The changes this browser made since it last saw the server, as sync updates.
 *
 * Completions the shadow does not already hold are pushed as completed. Shadow
 * completions that are no longer present locally are pushed as un-completed,
 * which is how un-checking a reading reaches the other device.
 */
export function localSyncChanges(
  snapshot: LocalProgressSnapshot,
  shadow: SyncShadow,
  now: Date = new Date(),
): SyncProgressItem[] {
  const updatedAt = now.toISOString();
  const localKeys = new Set<string>();
  const updates: SyncProgressItem[] = [];

  for (const identity of snapshotIdentities(snapshot)) {
    const key = syncItemKey(identity);
    if (localKeys.has(key)) continue;
    localKeys.add(key);

    const previous = shadow[key];
    if (!previous || !previous.completed) {
      updates.push({ ...identity, completed: true, updatedAt });
    }
  }

  for (const [key, entry] of Object.entries(shadow)) {
    if (!entry.completed || localKeys.has(key)) continue;

    const identity = parseSyncItemKey(key);
    if (!identity) continue;

    updates.push({ ...identity, completed: false, updatedAt });
  }

  return updates;
}

function cloneSnapshot(snapshot: LocalProgressSnapshot): LocalProgressSnapshot {
  const oneYearByCycle: Record<string, string[]> = {};
  for (const [cycleId, itemIds] of Object.entries(snapshot.oneYearByCycle)) {
    oneYearByCycle[cycleId] = [...itemIds];
  }
  return { oneYearByCycle, twoYear: [...snapshot.twoYear] };
}

/**
 * Fold the server's merged state back into local progress.
 *
 * The server is authoritative for every reading it knows about, because the
 * push that precedes this already gave it this browser's changes. Readings the
 * server has never heard of are left alone rather than deleted — a partial or
 * filtered server response must not be able to erase local progress.
 */
export function applyServerProgress(
  snapshot: LocalProgressSnapshot,
  items: readonly SyncProgressItem[],
): { snapshot: LocalProgressSnapshot; shadow: SyncShadow } {
  const next = cloneSnapshot(snapshot);
  const shadow: SyncShadow = {};

  for (const item of items) {
    const itemId = normalizeReadingPlanSyncEntryId(item.planId, item.itemId);
    if (!itemId) continue;

    const identity: SyncIdentity =
      item.planId === READING_PLAN_SYNC_PLAN_IDS.oneYear
        ? { planId: item.planId, cycleId: item.cycleId, itemId }
        : { planId: item.planId, cycleId: null, itemId };

    if (
      identity.planId === READING_PLAN_SYNC_PLAN_IDS.oneYear &&
      (typeof identity.cycleId !== "string" || !/^\d{4}$/.test(identity.cycleId))
    ) {
      continue;
    }

    shadow[syncItemKey(identity)] = {
      completed: item.completed,
      updatedAt: item.updatedAt,
    };

    const bucket =
      identity.planId === READING_PLAN_SYNC_PLAN_IDS.oneYear
        ? (next.oneYearByCycle[identity.cycleId as string] ??= [])
        : next.twoYear;

    const at = bucket.indexOf(itemId);

    if (item.completed && at === -1) {
      bucket.push(itemId);
    } else if (!item.completed && at !== -1) {
      bucket.splice(at, 1);
    }
  }

  return { snapshot: next, shadow };
}
