// Proof pass, Aug 9 2026: the local <-> account merge and the two-device
// round trip, exercised end to end through the real Sync service (register,
// entitlement, session, progress upsert) and the real client merge model —
// with BOTH reading plans present at once, so a cross-plan leak would show
// up immediately. Uses the in-memory store the service layer already ships
// for testing (see syncService.test.ts); no real account, browser, or
// database is touched.
import { describe, expect, it } from "vitest";
import { validateSyncProgressUpdate } from "../sync/progress";
import { SyncService } from "../sync/service";
import { createMemorySyncStore } from "../sync/store";
import {
  applyServerProgress,
  emptyLocalProgressSnapshot,
  localSyncChanges,
  type LocalProgressSnapshot,
} from "../syncMergeModel";

const PASSWORD = "correct horse battery staple";

function snapshot(
  partial: Partial<LocalProgressSnapshot> = {},
): LocalProgressSnapshot {
  return { ...emptyLocalProgressSnapshot(), ...partial };
}

async function pushLocalChanges(
  service: SyncService,
  token: string,
  local: LocalProgressSnapshot,
  shadow: Parameters<typeof localSyncChanges>[1],
  now: Date,
) {
  const updates = localSyncChanges(local, shadow, now);
  const validated = updates
    .map((update) => validateSyncProgressUpdate(update, now))
    .filter((update): update is NonNullable<typeof update> => update !== null);

  expect(validated).toHaveLength(updates.length);

  const applied = await service.applyProgressForSession(token, validated, now);
  if (!applied.ok) throw new Error(`push failed: ${applied.error}`);

  return updates;
}

async function pullServerState(
  service: SyncService,
  token: string,
  local: LocalProgressSnapshot,
  now: Date,
) {
  const listed = await service.listProgressForSession(token, now);
  if (!listed.ok) throw new Error(`pull failed: ${listed.error}`);

  return applyServerProgress(local, listed.items);
}

describe("Sync proof: local-to-account merge and A<->B round trip, both plans at once", () => {
  it("preserves anonymous both-plan progress through account creation, then carries each device's later change to the other without cross-plan contamination", async () => {
    const store = createMemorySyncStore();
    const service = new SyncService(store);
    const t0 = new Date("2026-08-09T12:00:00.000Z");

    // An anonymous visitor has already marked readings in BOTH plans before
    // any account exists — this is Device A's local-only starting state.
    let deviceA = snapshot({
      oneYearByCycle: { "2026": ["week-1-sunday", "week-2-monday"] },
      twoYear: ["week-10-friday", "week-11-saturday"],
    });

    const registered = await service.register(
      { email: "sync-proof@example.com", password: PASSWORD },
      t0,
    );
    if (!registered.ok) throw new Error("registration failed");

    // A free-code entitlement is what actually turns Sync on; registering
    // alone must not (syncService.test.ts already covers that separately).
    await store.createEntitlement({
      id: "ent-cross-device-proof",
      userId: registered.account.id,
      kind: "free-code",
      status: "active",
      sourceRef: "proof-code",
      startsAt: t0.toISOString(),
      endsAt: null,
      createdAt: t0.toISOString(),
    });

    // First connection: the server starts empty. An empty server state must
    // never be read as "nothing to keep" for the local progress that exists.
    const pushedByA = await pushLocalChanges(service, registered.token, deviceA, {}, t0);
    expect(pushedByA).toHaveLength(4);

    const afterFirstSync = await pullServerState(service, registered.token, deviceA, t0);
    deviceA = afterFirstSync.snapshot;
    const shadowA = afterFirstSync.shadow;

    // Refresh: the merged state survives exactly, in both plans.
    expect(deviceA.oneYearByCycle["2026"].slice().sort()).toEqual([
      "week-1-sunday",
      "week-2-monday",
    ]);
    expect(deviceA.twoYear.slice().sort()).toEqual([
      "week-10-friday",
      "week-11-saturday",
    ]);

    // Device B: clean local state, signs into the SAME account.
    const loggedInB = await service.login(
      { email: "sync-proof@example.com", password: PASSWORD },
      t0,
    );
    if (!loggedInB.ok) throw new Error("login failed");
    expect(loggedInB.token).not.toBe(registered.token);

    let deviceB = emptyLocalProgressSnapshot();
    expect(localSyncChanges(deviceB, {}, t0)).toEqual([]);

    const bAfterFirstSync = await pullServerState(service, loggedInB.token, deviceB, t0);
    deviceB = bAfterFirstSync.snapshot;
    let shadowB = bAfterFirstSync.shadow;

    // Device B receives exactly Device A's merged state in both plans, and
    // nothing crosses from one plan's bucket into the other's.
    expect(deviceB.oneYearByCycle["2026"].slice().sort()).toEqual([
      "week-1-sunday",
      "week-2-monday",
    ]);
    expect(deviceB.twoYear.slice().sort()).toEqual([
      "week-10-friday",
      "week-11-saturday",
    ]);
    expect(Object.keys(deviceB.oneYearByCycle)).toEqual(["2026"]);

    // Device B adds one NEW completion per plan and syncs.
    const t1 = new Date("2026-08-09T12:05:00.000Z");
    deviceB.oneYearByCycle["2026"].push("week-3-tuesday");
    deviceB.twoYear.push("week-12-sunday");
    const pushedByB = await pushLocalChanges(service, loggedInB.token, deviceB, shadowB, t1);
    expect(pushedByB).toHaveLength(2);
    shadowB = (await pullServerState(service, loggedInB.token, deviceB, t1)).shadow;

    // Device A made no local changes of its own, so it has nothing to push...
    expect(localSyncChanges(deviceA, shadowA, t1)).toEqual([]);

    // ...but resyncing must bring B's two new completions in, alongside A's
    // original four, with no loss and no cross-plan mixing.
    const aAfterResync = await pullServerState(service, registered.token, deviceA, t1);
    deviceA = aAfterResync.snapshot;

    expect(deviceA.oneYearByCycle["2026"].slice().sort()).toEqual([
      "week-1-sunday",
      "week-2-monday",
      "week-3-tuesday",
    ]);
    expect(deviceA.twoYear.slice().sort()).toEqual([
      "week-10-friday",
      "week-11-saturday",
      "week-12-sunday",
    ]);
    expect(Object.keys(deviceA.oneYearByCycle)).toEqual(["2026"]);
  });
});
