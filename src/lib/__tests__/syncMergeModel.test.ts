import { describe, expect, it } from "vitest";
import {
  applyServerProgress,
  emptyLocalProgressSnapshot,
  localSyncChanges,
  parseSyncItemKey,
  syncItemKey,
  type LocalProgressSnapshot,
  type SyncProgressItem,
  type SyncShadow,
} from "../syncMergeModel";
import { READING_PLAN_SYNC_PLAN_IDS } from "../readingPlanSyncModel";

const ONE_YEAR = READING_PLAN_SYNC_PLAN_IDS.oneYear;
const TWO_YEAR = READING_PLAN_SYNC_PLAN_IDS.twoYear;
const NOW = new Date("2026-08-08T12:00:00.000Z");

function snapshot(
  partial: Partial<LocalProgressSnapshot> = {},
): LocalProgressSnapshot {
  return { ...emptyLocalProgressSnapshot(), ...partial };
}

function serverItem(
  overrides: Partial<SyncProgressItem> & Pick<SyncProgressItem, "itemId">,
): SyncProgressItem {
  return {
    planId: ONE_YEAR,
    cycleId: "2026",
    completed: true,
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("sync item keys", () => {
  it("round-trips both plan shapes", () => {
    const oneYear = { planId: ONE_YEAR, cycleId: "2026", itemId: "week-3-friday" };
    const twoYear = { planId: TWO_YEAR, cycleId: null, itemId: "week-77-monday" };

    expect(parseSyncItemKey(syncItemKey(oneYear))).toEqual(oneYear);
    expect(parseSyncItemKey(syncItemKey(twoYear))).toEqual(twoYear);
  });

  it("rejects corrupt keys instead of throwing", () => {
    expect(parseSyncItemKey("nonsense")).toBeNull();
    expect(parseSyncItemKey("other-plan:2026:week-1-sunday")).toBeNull();
    expect(parseSyncItemKey(`${ONE_YEAR}:-:week-1-sunday`)).toBeNull();
    expect(parseSyncItemKey(`${TWO_YEAR}:2026:week-1-sunday`)).toBeNull();
    expect(parseSyncItemKey(`${ONE_YEAR}:2026:week-99-sunday`)).toBeNull();
  });
});

describe("first connection", () => {
  it("pushes every existing local completion and asks the server to delete nothing", () => {
    const local = snapshot({
      oneYearByCycle: { "2026": ["week-1-sunday", "week-2-monday"] },
      twoYear: ["week-40-friday"],
    });

    const updates = localSyncChanges(local, {}, NOW);

    expect(updates).toHaveLength(3);
    expect(updates.every((update) => update.completed)).toBe(true);
    expect(updates.map((update) => update.itemId).sort()).toEqual([
      "week-1-sunday",
      "week-2-monday",
      "week-40-friday",
    ]);
  });

  it("merges rather than wipes: server-only progress survives the first connection", () => {
    const local = snapshot({ oneYearByCycle: { "2026": ["week-1-sunday"] } });

    // The push carries only the local completion...
    expect(localSyncChanges(local, {}, NOW)).toEqual([
      {
        planId: ONE_YEAR,
        cycleId: "2026",
        itemId: "week-1-sunday",
        completed: true,
        updatedAt: NOW.toISOString(),
      },
    ]);

    // ...and the merged server response brings the other device's back.
    const merged = applyServerProgress(local, [
      serverItem({ itemId: "week-1-sunday" }),
      serverItem({ itemId: "week-9-tuesday" }),
    ]);

    expect(merged.snapshot.oneYearByCycle["2026"].sort()).toEqual([
      "week-1-sunday",
      "week-9-tuesday",
    ]);
  });

  it("a fresh browser with no local progress never pushes deletions", () => {
    expect(localSyncChanges(emptyLocalProgressSnapshot(), {}, NOW)).toEqual([]);
  });
});

describe("ongoing changes", () => {
  const shadow: SyncShadow = {
    [syncItemKey({ planId: ONE_YEAR, cycleId: "2026", itemId: "week-1-sunday" })]:
      { completed: true, updatedAt: "2026-08-01T00:00:00.000Z" },
  };

  it("pushes only what changed since the last sync", () => {
    const local = snapshot({
      oneYearByCycle: { "2026": ["week-1-sunday", "week-5-thursday"] },
    });

    expect(localSyncChanges(local, shadow, NOW)).toEqual([
      {
        planId: ONE_YEAR,
        cycleId: "2026",
        itemId: "week-5-thursday",
        completed: true,
        updatedAt: NOW.toISOString(),
      },
    ]);
  });

  it("propagates an un-check as an explicit false", () => {
    const updates = localSyncChanges(snapshot(), shadow, NOW);

    expect(updates).toEqual([
      {
        planId: ONE_YEAR,
        cycleId: "2026",
        itemId: "week-1-sunday",
        completed: false,
        updatedAt: NOW.toISOString(),
      },
    ]);
  });

  it("is quiet when nothing changed", () => {
    const local = snapshot({ oneYearByCycle: { "2026": ["week-1-sunday"] } });
    expect(localSyncChanges(local, shadow, NOW)).toEqual([]);
  });

  it("applies a server un-check to local progress", () => {
    const local = snapshot({
      oneYearByCycle: { "2026": ["week-1-sunday", "week-2-monday"] },
    });

    const merged = applyServerProgress(local, [
      serverItem({ itemId: "week-1-sunday", completed: false }),
    ]);

    expect(merged.snapshot.oneYearByCycle["2026"]).toEqual(["week-2-monday"]);
    expect(
      merged.shadow[
        syncItemKey({ planId: ONE_YEAR, cycleId: "2026", itemId: "week-1-sunday" })
      ],
    ).toEqual({ completed: false, updatedAt: "2026-08-01T00:00:00.000Z" });
  });

  it("leaves readings the server never mentioned untouched", () => {
    const local = snapshot({
      oneYearByCycle: { "2025": ["week-4-friday"], "2026": ["week-1-sunday"] },
      twoYear: ["week-12-monday"],
    });

    const merged = applyServerProgress(local, [
      serverItem({ itemId: "week-1-sunday" }),
    ]);

    expect(merged.snapshot.oneYearByCycle["2025"]).toEqual(["week-4-friday"]);
    expect(merged.snapshot.twoYear).toEqual(["week-12-monday"]);
  });

  it("does not mutate the snapshot it was given", () => {
    const local = snapshot({ oneYearByCycle: { "2026": ["week-1-sunday"] } });

    applyServerProgress(local, [
      serverItem({ itemId: "week-1-sunday", completed: false }),
      serverItem({ itemId: "week-8-monday" }),
    ]);

    expect(local.oneYearByCycle["2026"]).toEqual(["week-1-sunday"]);
  });
});

describe("full two-device round trip", () => {
  it("carries each device's change to the other without losing either", () => {
    // Device A starts with local-only progress and connects.
    let deviceA = snapshot({ oneYearByCycle: { "2026": ["week-1-sunday"] } });
    const pushedByA = localSyncChanges(deviceA, {}, NOW);
    expect(pushedByA).toHaveLength(1);

    // The server now holds A's reading.
    let server: SyncProgressItem[] = pushedByA.map((update) => ({ ...update }));
    const afterA = applyServerProgress(deviceA, server);
    deviceA = afterA.snapshot;
    const shadowA = afterA.shadow;

    // Device B signs in fresh: no local progress, nothing to push.
    let deviceB = emptyLocalProgressSnapshot();
    expect(localSyncChanges(deviceB, {}, NOW)).toEqual([]);

    const afterB = applyServerProgress(deviceB, server);
    deviceB = afterB.snapshot;
    let shadowB = afterB.shadow;
    expect(deviceB.oneYearByCycle["2026"]).toEqual(["week-1-sunday"]);

    // Device B completes another reading and pushes it.
    deviceB.oneYearByCycle["2026"].push("week-2-monday");
    const pushedByB = localSyncChanges(deviceB, shadowB, NOW);
    expect(pushedByB).toEqual([
      {
        planId: ONE_YEAR,
        cycleId: "2026",
        itemId: "week-2-monday",
        completed: true,
        updatedAt: NOW.toISOString(),
      },
    ]);

    server = [...server, ...pushedByB];
    shadowB = applyServerProgress(deviceB, server).shadow;

    // Device A resyncs and sees B's change alongside its own.
    expect(localSyncChanges(deviceA, shadowA, NOW)).toEqual([]);
    const resyncedA = applyServerProgress(deviceA, server);

    expect(resyncedA.snapshot.oneYearByCycle["2026"].sort()).toEqual([
      "week-1-sunday",
      "week-2-monday",
    ]);
  });
});
