import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { betaAccessPasswordConfigured, verifyBetaAccessPassword } from "../sync/betaAccess";
import { SyncService } from "../sync/service";
import { createMemorySyncStore } from "../sync/store";

const BETA_PASSWORD = "beta-fixture-password-1";
const NOW = new Date("2026-08-08T03:00:00.000Z");

const originalEnv = process.env.CHP_SYNC_BETA_ACCESS_PASSWORD;

beforeEach(() => {
  process.env.CHP_SYNC_BETA_ACCESS_PASSWORD = BETA_PASSWORD;
});

afterEach(() => {
  if (originalEnv === undefined) {
    delete process.env.CHP_SYNC_BETA_ACCESS_PASSWORD;
  } else {
    process.env.CHP_SYNC_BETA_ACCESS_PASSWORD = originalEnv;
  }
});

describe("verifyBetaAccessPassword", () => {
  it("accepts the configured password", () => {
    expect(verifyBetaAccessPassword(BETA_PASSWORD)).toBe(true);
  });

  it("tolerates surrounding whitespace, matching the copy/paste case", () => {
    expect(verifyBetaAccessPassword(`  ${BETA_PASSWORD}  `)).toBe(true);
  });

  it("rejects a wrong password", () => {
    expect(verifyBetaAccessPassword("wrong-password")).toBe(false);
    expect(verifyBetaAccessPassword("beta-fixture-password-X")).toBe(false);
  });

  it("rejects non-string input without throwing", () => {
    expect(verifyBetaAccessPassword(undefined)).toBe(false);
    expect(verifyBetaAccessPassword(null)).toBe(false);
    expect(verifyBetaAccessPassword(12345)).toBe(false);
  });

  it("fails closed when the env var is unset", () => {
    delete process.env.CHP_SYNC_BETA_ACCESS_PASSWORD;
    expect(betaAccessPasswordConfigured()).toBe(false);
    expect(verifyBetaAccessPassword(BETA_PASSWORD)).toBe(false);
  });

  it("fails closed when the env var is blank", () => {
    process.env.CHP_SYNC_BETA_ACCESS_PASSWORD = "   ";
    expect(verifyBetaAccessPassword(BETA_PASSWORD)).toBe(false);
  });
});

describe("SyncService.admitViaBetaAccess", () => {
  it("creates a new account and grants an active entitlement immediately", async () => {
    const store = createMemorySyncStore();
    const service = new SyncService(store);

    const result = await service.admitViaBetaAccess(
      { email: "New@Example.com", password: BETA_PASSWORD },
      NOW,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected admission to succeed");

    expect(result.account.email).toBe("new@example.com");
    expect(result.account.syncActive).toBe(true);
    expect(result.account.entitlementKinds).toEqual(["beta"]);
  });

  it("admits an existing account without creating a duplicate", async () => {
    const store = createMemorySyncStore();
    const service = new SyncService(store);

    const first = await service.admitViaBetaAccess(
      { email: "owner@example.com", password: BETA_PASSWORD },
      NOW,
    );
    if (!first.ok) throw new Error("expected first admission to succeed");

    const second = await service.admitViaBetaAccess(
      { email: "owner@example.com", password: BETA_PASSWORD },
      NOW,
    );
    if (!second.ok) throw new Error("expected second admission to succeed");

    expect(second.account.id).toBe(first.account.id);

    const entitlements = await store.listEntitlements(first.account.id);
    expect(entitlements).toHaveLength(1);
  });

  it("self-heals a pre-existing registered account with no entitlement yet", async () => {
    const store = createMemorySyncStore();
    const service = new SyncService(store);

    // Registered through the old real-account flow before the beta door
    // existed — no Sync entitlement, real password on file.
    const registered = await service.register(
      { email: "already-here@example.com", password: "some real password here" },
      NOW,
    );
    if (!registered.ok) throw new Error("registration failed");
    expect(registered.account.syncActive).toBe(false);

    const admitted = await service.admitViaBetaAccess(
      { email: "already-here@example.com", password: BETA_PASSWORD },
      NOW,
    );

    expect(admitted.ok).toBe(true);
    if (!admitted.ok) throw new Error("expected admission to succeed");
    expect(admitted.account.id).toBe(registered.account.id);
    expect(admitted.account.syncActive).toBe(true);
  });

  it("preserves progress a pre-existing account already synced", async () => {
    const store = createMemorySyncStore();
    const service = new SyncService(store);

    const registered = await service.register(
      { email: "has-progress@example.com", password: "some real password here" },
      NOW,
    );
    if (!registered.ok) throw new Error("registration failed");

    // Give that account an entitlement the old way, so it can already sync,
    // and write a real reading before the beta door is ever used.
    await store.createEntitlement({
      id: "ent-1",
      userId: registered.account.id,
      kind: "free-code",
      status: "active",
      sourceRef: null,
      startsAt: NOW.toISOString(),
      endsAt: null,
      createdAt: NOW.toISOString(),
    });
    await store.upsertProgress({
      userId: registered.account.id,
      planId: "one-year-v1",
      cycleId: "2026",
      itemId: "week-1-sunday",
      completed: true,
      updatedAt: NOW.toISOString(),
    });

    await service.admitViaBetaAccess(
      { email: "has-progress@example.com", password: BETA_PASSWORD },
      NOW,
    );

    const progress = await store.listProgress(registered.account.id);
    expect(progress).toHaveLength(1);
    expect(progress[0].itemId).toBe("week-1-sunday");
  });

  it("does not grant a second entitlement to an account that is already active", async () => {
    const store = createMemorySyncStore();
    const service = new SyncService(store);

    const first = await service.admitViaBetaAccess(
      { email: "twice@example.com", password: BETA_PASSWORD },
      NOW,
    );
    if (!first.ok) throw new Error("expected admission to succeed");

    await service.admitViaBetaAccess(
      { email: "twice@example.com", password: BETA_PASSWORD },
      new Date(NOW.getTime() + 1000),
    );

    const entitlements = await store.listEntitlements(first.account.id);
    expect(entitlements).toHaveLength(1);
  });

  it("never admits a revoked account, even with the correct shared password", async () => {
    const store = createMemorySyncStore();
    const service = new SyncService(store);

    const first = await service.admitViaBetaAccess(
      { email: "revoked@example.com", password: BETA_PASSWORD },
      NOW,
    );
    if (!first.ok) throw new Error("expected first admission to succeed");

    const entitlements = await store.listEntitlements(first.account.id);
    await store.createEntitlement({
      ...entitlements[0],
      id: "revocation-marker",
      status: "revoked",
    });

    const second = await service.admitViaBetaAccess(
      { email: "revoked@example.com", password: BETA_PASSWORD },
      new Date(NOW.getTime() + 1000),
    );

    expect(second).toEqual({ ok: false, error: "invalid" });
  });

  it("rejects the wrong shared password without creating an account", async () => {
    const store = createMemorySyncStore();
    const service = new SyncService(store);

    const result = await service.admitViaBetaAccess(
      { email: "nobody@example.com", password: "wrong" },
      NOW,
    );

    expect(result).toEqual({ ok: false, error: "invalid" });
    expect(await store.getUserByEmail("nobody@example.com")).toBeNull();
  });

  it("rejects a missing or invalid email", async () => {
    const store = createMemorySyncStore();
    const service = new SyncService(store);

    await expect(
      service.admitViaBetaAccess({ email: "not-an-email", password: BETA_PASSWORD }, NOW),
    ).resolves.toEqual({ ok: false, error: "invalid" });

    await expect(
      service.admitViaBetaAccess({ password: BETA_PASSWORD }, NOW),
    ).resolves.toEqual({ ok: false, error: "invalid" });
  });

  it("issues a working session on success", async () => {
    const store = createMemorySyncStore();
    const service = new SyncService(store);

    const result = await service.admitViaBetaAccess(
      { email: "session-check@example.com", password: BETA_PASSWORD },
      NOW,
    );
    if (!result.ok) throw new Error("expected admission to succeed");

    const account = await service.accountForSession(result.token, NOW);
    expect(account?.email).toBe("session-check@example.com");
    expect(account?.syncActive).toBe(true);
  });
});
