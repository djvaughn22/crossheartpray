import { describe, expect, it } from "vitest";
import { hashSyncSecret, normalizeSyncCode } from "../sync/crypto";
import { SyncService } from "../sync/service";
import { createMemorySyncStore } from "../sync/store";

const PASSWORD = "correct horse battery staple";
const CODE = "CHPSYNC-TEST-0001";
const NOW = new Date("2026-08-08T03:00:00.000Z");

async function activated({ mintCode = true } = {}) {
  const store = createMemorySyncStore();
  const service = new SyncService(store);

  if (mintCode) {
    const minted = await service.createSyncCode(CODE, "owner test", NOW);
    if (!minted.ok) throw new Error("could not mint code");
  }

  const registration = await service.register(
    { email: "test@example.com", password: PASSWORD },
    NOW,
  );
  if (!registration.ok) throw new Error("registration failed");

  return { store, service, token: registration.token };
}

describe("sync code normalization", () => {
  it("ignores spacing, dashes, and case so a code matches however it is typed", () => {
    expect(normalizeSyncCode("chpsync-test-0001")).toBe("CHPSYNCTEST0001");
    expect(normalizeSyncCode("  CHPSYNC TEST 0001 ")).toBe("CHPSYNCTEST0001");
  });

  it("rejects codes that are too short or carry unexpected characters", () => {
    expect(normalizeSyncCode("SHORT")).toBeNull();
    expect(normalizeSyncCode("CHPSYNC/TEST/0001")).toBeNull();
    expect(normalizeSyncCode(12345678)).toBeNull();
  });
});

describe("entitlement is required before any cloud progress", () => {
  it("a new account can sign in but cannot sync until it is entitled", async () => {
    const { service, token } = await activated();

    const account = await service.accountForSession(token, NOW);
    expect(account?.syncActive).toBe(false);

    await expect(
      service.listProgressForSession(token, NOW),
    ).resolves.toEqual({ ok: false, error: "sync-inactive" });

    await expect(
      service.applyProgressForSession(
        token,
        [
          {
            planId: "one-year-v1",
            cycleId: "2026",
            itemId: "week-1-sunday",
            completed: true,
            updatedAt: NOW.toISOString(),
          },
        ],
        NOW,
      ),
    ).resolves.toEqual({ ok: false, error: "sync-inactive" });
  });

  it("redeeming an owner code activates sync for that account", async () => {
    const { service, token } = await activated();

    const redeemed = await service.redeemSyncCode(token, CODE, NOW);
    expect(redeemed.ok).toBe(true);
    expect(redeemed.ok && redeemed.account.syncActive).toBe(true);

    const progress = await service.listProgressForSession(token, NOW);
    expect(progress.ok).toBe(true);
  });

  it("accepts the code however the owner typed it", async () => {
    const { service, token } = await activated();

    const redeemed = await service.redeemSyncCode(token, " chpsync test 0001 ", NOW);
    expect(redeemed.ok && redeemed.account.syncActive).toBe(true);
  });
});

describe("redemption refuses everything it should", () => {
  it("rejects an unknown code", async () => {
    const { service, token } = await activated();

    await expect(
      service.redeemSyncCode(token, "NOTAREALCODE1", NOW),
    ).resolves.toEqual({ ok: false, error: "invalid-code" });
  });

  it("requires a signed-in account", async () => {
    const { service } = await activated();

    await expect(service.redeemSyncCode(null, CODE, NOW)).resolves.toEqual({
      ok: false,
      error: "not-authenticated",
    });
  });

  it("is a no-op when sync is already active, without burning a second grant", async () => {
    const { service, store, token } = await activated();

    await service.redeemSyncCode(token, CODE, NOW);
    const again = await service.redeemSyncCode(token, CODE, NOW);

    expect(again.ok && again.alreadyActive).toBe(true);

    const account = await service.accountForSession(token, NOW);
    const entitlements = await store.listEntitlements(account!.id);
    expect(entitlements).toHaveLength(1);
  });

  it("stops working once the owner disables the code", async () => {
    const { service, store, token } = await activated({ mintCode: false });

    await store.createCode({
      id: "disabled-code",
      codeHash: hashSyncSecret("CHPSYNCTEST0001"),
      label: "revoked",
      enabled: false,
      createdAt: NOW.toISOString(),
      disabledAt: NOW.toISOString(),
    });

    await expect(service.redeemSyncCode(token, CODE, NOW)).resolves.toEqual({
      ok: false,
      error: "invalid-code",
    });
  });
});

describe("minting", () => {
  it("stores only the hash, never the raw code", async () => {
    const store = createMemorySyncStore();
    const service = new SyncService(store);

    const minted = await service.createSyncCode(CODE, "owner test", NOW);
    expect(minted.ok).toBe(true);

    const serialized = JSON.stringify(
      await store.getCodeByHash(
        hashSyncSecret("CHPSYNCTEST0001"),
      ),
    );

    expect(serialized).not.toContain("CHPSYNCTEST0001");
    expect(serialized).not.toContain(CODE);
  });

  it("refuses a duplicate code", async () => {
    const store = createMemorySyncStore();
    const service = new SyncService(store);

    await service.createSyncCode(CODE, "first", NOW);

    await expect(
      service.createSyncCode(CODE, "second", NOW),
    ).resolves.toEqual({ ok: false, error: "code-exists" });
  });
});

describe("signing out and account deletion", () => {
  it("sign out revokes the session but keeps the account and its progress", async () => {
    const { service, token } = await activated();
    await service.redeemSyncCode(token, CODE, NOW);

    await service.applyProgressForSession(
      token,
      [
        {
          planId: "one-year-v1",
          cycleId: "2026",
          itemId: "week-1-sunday",
          completed: true,
          updatedAt: NOW.toISOString(),
        },
      ],
      NOW,
    );

    await service.logout(token, NOW);
    expect(await service.accountForSession(token, NOW)).toBeNull();

    const back = await service.login(
      { email: "test@example.com", password: PASSWORD },
      NOW,
    );
    if (!back.ok) throw new Error("sign in failed");

    expect(back.account.syncActive).toBe(true);

    const progress = await service.listProgressForSession(back.token, NOW);
    expect(progress.ok && progress.items).toHaveLength(1);
  });

  it("account deletion removes the account's progress and entitlement", async () => {
    const { service, store, token } = await activated();
    await service.redeemSyncCode(token, CODE, NOW);

    const account = await service.accountForSession(token, NOW);
    const userId = account!.id;

    await service.applyProgressForSession(
      token,
      [
        {
          planId: "two-year-v1",
          cycleId: null,
          itemId: "week-9-monday",
          completed: true,
          updatedAt: NOW.toISOString(),
        },
      ],
      NOW,
    );

    const deleted = await service.deleteAccount(token, PASSWORD, NOW);
    expect(deleted.ok).toBe(true);

    expect(await store.listProgress(userId)).toEqual([]);
    expect(await store.listEntitlements(userId)).toEqual([]);
    expect(await service.accountForSession(token, NOW)).toBeNull();
  });
});
