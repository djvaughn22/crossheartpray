"use client";

// Browser side of CrossHeartPray Sync.
//
// This module is the ONLY place that connects local reading progress to the
// network. The local progress services stay account-free and keep working
// exactly as they always have when nobody is signed in, when Sync is
// unavailable, and when an account has no Sync entitlement.
//
// The shadow (last server state this browser saw) is dropped on sign out, so
// a signed-out browser keeps no record of what an account had synced. Signing
// back in then treats the local board as this device's own state and pushes
// it, which is last-write-wins over a change made elsewhere in the meantime —
// a real reading someone marked, never a silent deletion.

import {
  loadAllReadingPlanYears,
  saveReadingPlanProgress,
} from "./readingPlanProgress";
import {
  loadReadingPlan104Progress,
  saveReadingPlan104Progress,
} from "./readingPlan104Progress";
import {
  applyServerProgress,
  emptyLocalProgressSnapshot,
  localSyncChanges,
  type LocalProgressSnapshot,
  type SyncProgressItem,
  type SyncShadow,
} from "./syncMergeModel";

export const SYNC_SHADOW_KEY = "crossheartpray:sync-shadow:v1";
export const SYNC_STATE_EVENT = "crossheartpray:sync-state";

export type SyncAccount = {
  id: string;
  email: string;
  syncActive: boolean;
  entitlementKinds: string[];
};

type StoredShadow = {
  userId: string;
  items: SyncShadow;
};

function readShadow(userId: string): SyncShadow {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(SYNC_SHADOW_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Partial<StoredShadow>;

    // A different account on this browser must never inherit the previous
    // account's reconciliation state.
    if (!parsed || parsed.userId !== userId || typeof parsed.items !== "object") {
      return {};
    }

    return (parsed.items ?? {}) as SyncShadow;
  } catch {
    return {};
  }
}

function writeShadow(userId: string, items: SyncShadow): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      SYNC_SHADOW_KEY,
      JSON.stringify({ userId, items } satisfies StoredShadow),
    );
  } catch {
    // Private mode / quota. Sync still works this session; the next sync just
    // re-pushes what it cannot remember, which is safe.
  }
}

export function clearSyncShadow(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SYNC_SHADOW_KEY);
  } catch {
    // Nothing to do — an unreadable shadow already behaves as empty.
  }
}

function readLocalSnapshot(): LocalProgressSnapshot {
  if (typeof window === "undefined") return emptyLocalProgressSnapshot();

  const oneYearByCycle: Record<string, string[]> = {};
  for (const [year, progress] of Object.entries(loadAllReadingPlanYears())) {
    oneYearByCycle[year] = Object.entries(progress)
      .filter(([, done]) => done)
      .map(([id]) => id);
  }

  const twoYear = Object.entries(loadReadingPlan104Progress())
    .filter(([, done]) => done)
    .map(([id]) => id);

  return { oneYearByCycle, twoYear };
}

/**
 * Write a merged snapshot back through the normal local progress services so
 * every open board, the Bingo page, and other tabs update through the events
 * they already listen to.
 */
function writeLocalSnapshot(
  previous: LocalProgressSnapshot,
  next: LocalProgressSnapshot,
): boolean {
  let changed = false;

  for (const [year, itemIds] of Object.entries(next.oneYearByCycle)) {
    const before = new Set(previous.oneYearByCycle[year] ?? []);
    const after = new Set(itemIds);

    if (before.size === after.size && [...after].every((id) => before.has(id))) {
      continue;
    }

    saveReadingPlanProgress(
      Object.fromEntries([...after].map((id) => [id, true])),
      Number(year),
    );
    changed = true;
  }

  const twoYearBefore = new Set(previous.twoYear);
  const twoYearAfter = new Set(next.twoYear);

  if (
    twoYearBefore.size !== twoYearAfter.size ||
    ![...twoYearAfter].every((id) => twoYearBefore.has(id))
  ) {
    saveReadingPlan104Progress(
      Object.fromEntries([...twoYearAfter].map((id) => [id, true])),
    );
    changed = true;
  }

  return changed;
}

async function syncFetch(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  let body: Record<string, unknown> = {};
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  return { response, body };
}

export type SyncOutcome =
  | { ok: true; changed: boolean; pushed: number }
  | { ok: false; error: string; reason: "auth" | "inactive" | "unavailable" };

/**
 * Push this browser's changes, then fold the server's merged answer back into
 * local progress. Push-then-pull in one pass is what makes a refresh on the
 * first device show the second device's reading.
 */
export async function syncProgressNow(userId: string): Promise<SyncOutcome> {
  const before = readLocalSnapshot();
  const shadow = readShadow(userId);
  const updates = localSyncChanges(before, shadow);

  if (updates.length > 0) {
    const { response, body } = await syncFetch("/api/sync/progress", {
      method: "PUT",
      body: JSON.stringify({ updates }),
    });

    if (!response.ok) return failure(response.status, body);
  }

  const { response, body } = await syncFetch("/api/sync/progress");
  if (!response.ok) return failure(response.status, body);

  const items = Array.isArray(body.items) ? (body.items as SyncProgressItem[]) : [];
  const merged = applyServerProgress(before, items);

  writeShadow(userId, merged.shadow);
  const changed = writeLocalSnapshot(before, merged.snapshot);

  return { ok: true, changed, pushed: updates.length };
}

function failure(status: number, body: Record<string, unknown>): SyncOutcome {
  const error =
    typeof body.error === "string"
      ? body.error
      : "Sync is temporarily unavailable. Your reading progress is still saved on this device.";

  if (status === 401) return { ok: false, error, reason: "auth" };
  if (status === 403) return { ok: false, error, reason: "inactive" };
  return { ok: false, error, reason: "unavailable" };
}

export async function fetchSyncAccount(): Promise<SyncAccount | null> {
  try {
    const { response, body } = await syncFetch("/api/sync/auth/me");
    if (!response.ok) return null;
    return (body.account as SyncAccount | null) ?? null;
  } catch {
    return null;
  }
}
