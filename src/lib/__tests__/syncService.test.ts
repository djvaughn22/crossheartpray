import { describe, expect, it } from "vitest";
import {
  hashSyncSecret,
  normalizeSyncEmail,
  verifySyncPassword,
} from "../sync/crypto";
import { validateSyncProgressUpdate } from "../sync/progress";
import { SyncService } from "../sync/service";
import { createMemorySyncStore } from "../sync/store";

const PASSWORD = "correct horse battery staple";

async function registered() {
  const store = createMemorySyncStore();
  const service = new SyncService(store);
  const now = new Date("2026-08-08T03:00:00.000Z");

  const result = await service.register(
    {
      email: " Test@Example.COM ",
      password: PASSWORD,
    },
    now,
  );

  if (!result.ok) throw new Error("registration failed");

  return { store, service, now, result };
}

describe("CrossHeartPray Sync accounts", () => {
  it("normalizes email addresses", () => {
    expect(normalizeSyncEmail(" Test@Example.COM ")).toBe(
      "test@example.com",
    );
  });

  it("requires a substantial password", async () => {
    const service = new SyncService(createMemorySyncStore());

    expect(
      await service.register({
        email: "person@example.com",
        password: "short",
      }),
    ).toEqual({
      ok: false,
      error: "invalid-password",
    });
  });

  it("stores a password hash, never the raw password", async () => {
    const { store } = await registered();
    const user = await store.getUserByEmail("test@example.com");

    expect(user).not.toBeNull();
    expect(user!.passwordHash).not.toContain(PASSWORD);
    expect(user!.passwordHash.startsWith("scrypt$")).toBe(true);
    expect(await verifySyncPassword(PASSWORD, user!.passwordHash)).toBe(true);
    expect(await verifySyncPassword("wrong password here", user!.passwordHash)).toBe(false);
  });

  it("does not create duplicate accounts for the same normalized email", async () => {
    const { service } = await registered();

    expect(
      await service.register({
        email: "TEST@example.com",
        password: PASSWORD,
      }),
    ).toEqual({
      ok: false,
      error: "email-in-use",
    });
  });

  it("uses one generic login failure", async () => {
    const { service, now } = await registered();

    expect(
      await service.login(
        {
          email: "missing@example.com",
          password: PASSWORD,
        },
        now,
      ),
    ).toEqual({
      ok: false,
      error: "invalid-credentials",
    });

    expect(
      await service.login(
        {
          email: "test@example.com",
          password: "not the password",
        },
        now,
      ),
    ).toEqual({
      ok: false,
      error: "invalid-credentials",
    });
  });

  it("stores only a hash of the raw session token", async () => {
    const { store, result } = await registered();

    expect(
      await store.getSessionByTokenHash(result.token),
    ).toBeNull();

    expect(
      await store.getSessionByTokenHash(hashSyncSecret(result.token)),
    ).not.toBeNull();
  });

  it("expires and revokes sessions", async () => {
    const { service, result, now } = await registered();

    expect(
      await service.accountForSession(result.token, now),
    ).toMatchObject({
      email: "test@example.com",
    });

    await service.logout(result.token, now);

    expect(
      await service.accountForSession(result.token, now),
    ).toBeNull();
  });

  it("creates accounts without falsely granting Sync", async () => {
    const { result } = await registered();

    expect(result.account.syncActive).toBe(false);
    expect(result.account.entitlementKinds).toEqual([]);
  });

  it("requires an active server-side entitlement for cloud progress", async () => {
    const { service, result, now } = await registered();

    expect(
      await service.listProgressForSession(result.token, now),
    ).toEqual({
      ok: false,
      error: "sync-inactive",
    });
  });

  it("recognizes an active lifetime entitlement", async () => {
    const { store, service, result, now } = await registered();

    await store.createEntitlement({
      id: "ent-1",
      userId: result.account.id,
      kind: "lifetime",
      status: "active",
      sourceRef: "test",
      startsAt: now.toISOString(),
      endsAt: null,
      createdAt: now.toISOString(),
    });

    expect(
      await service.accountForSession(result.token, now),
    ).toMatchObject({
      syncActive: true,
      entitlementKinds: ["lifetime"],
    });
  });

  it("does not treat an expired annual entitlement as active", async () => {
    const { store, service, result, now } = await registered();

    await store.createEntitlement({
      id: "ent-annual",
      userId: result.account.id,
      kind: "annual",
      status: "active",
      sourceRef: "test",
      startsAt: "2025-01-01T00:00:00.000Z",
      endsAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2025-01-01T00:00:00.000Z",
    });

    expect(
      await service.accountForSession(result.token, now),
    ).toMatchObject({
      syncActive: false,
    });
  });

  it("deletes an account only after password verification", async () => {
    const { store, service, result, now } = await registered();

    expect(
      await service.deleteAccount(
        result.token,
        "wrong password here",
        now,
      ),
    ).toEqual({
      ok: false,
      error: "invalid-password",
    });

    expect(
      await service.deleteAccount(result.token, PASSWORD, now),
    ).toEqual({
      ok: true,
    });

    expect(
      await store.getUserByEmail("test@example.com"),
    ).toBeNull();
  });
});

describe("CrossHeartPray Sync progress", () => {
  it("validates stable 1-year identities", () => {
    expect(
      validateSyncProgressUpdate(
        {
          planId: "one-year-v1",
          cycleId: "2026",
          itemId: "Week-05-Friday",
          completed: true,
        },
        new Date("2026-08-08T03:00:00.000Z"),
      ),
    ).toEqual({
      planId: "one-year-v1",
      cycleId: "2026",
      itemId: "week-5-friday",
      completed: true,
      updatedAt: "2026-08-08T03:00:00.000Z",
    });
  });

  it("keeps the 2-year track independent of annual cycles", () => {
    expect(
      validateSyncProgressUpdate(
        {
          planId: "two-year-v1",
          cycleId: null,
          itemId: "week-104-saturday",
          completed: false,
        },
        new Date("2026-08-08T03:00:00.000Z"),
      ),
    ).toEqual({
      planId: "two-year-v1",
      cycleId: null,
      itemId: "week-104-saturday",
      completed: false,
      updatedAt: "2026-08-08T03:00:00.000Z",
    });
  });

  it("rejects bad plan/cycle combinations and future-clock poisoning", () => {
    const now = new Date("2026-08-08T03:00:00.000Z");

    expect(
      validateSyncProgressUpdate(
        {
          planId: "one-year-v1",
          cycleId: null,
          itemId: "week-1-sunday",
          completed: true,
        },
        now,
      ),
    ).toBeNull();

    expect(
      validateSyncProgressUpdate(
        {
          planId: "two-year-v1",
          cycleId: "2026",
          itemId: "week-1-sunday",
          completed: true,
        },
        now,
      ),
    ).toBeNull();

    expect(
      validateSyncProgressUpdate(
        {
          planId: "one-year-v1",
          cycleId: "2026",
          itemId: "week-1-sunday",
          completed: true,
          updatedAt: "2030-01-01T00:00:00.000Z",
        },
        now,
      ),
    ).toBeNull();
  });

  it("uses deterministic latest-valid-update conflict behavior", async () => {
    const store = createMemorySyncStore();
    const service = new SyncService(store);
    const now = new Date("2026-08-08T03:00:00.000Z");

    const registeredResult = await service.register(
      {
        email: "progress@example.com",
        password: PASSWORD,
      },
      now,
    );

    if (!registeredResult.ok) throw new Error("registration failed");

    await store.createEntitlement({
      id: "ent-progress",
      userId: registeredResult.account.id,
      kind: "free-code",
      status: "active",
      sourceRef: "test-code",
      startsAt: now.toISOString(),
      endsAt: null,
      createdAt: now.toISOString(),
    });

    const newer = validateSyncProgressUpdate(
      {
        planId: "one-year-v1",
        cycleId: "2026",
        itemId: "week-3-monday",
        completed: true,
        updatedAt: "2026-08-08T02:59:00.000Z",
      },
      now,
    )!;

    const older = validateSyncProgressUpdate(
      {
        planId: "one-year-v1",
        cycleId: "2026",
        itemId: "week-3-monday",
        completed: false,
        updatedAt: "2026-08-08T02:58:00.000Z",
      },
      now,
    )!;

    await service.applyProgressForSession(
      registeredResult.token,
      [newer],
      now,
    );

    await service.applyProgressForSession(
      registeredResult.token,
      [older],
      now,
    );

    const result = await service.listProgressForSession(
      registeredResult.token,
      now,
    );

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.items).toHaveLength(1);
      expect(result.items[0].completed).toBe(true);
      expect(result.items[0].updatedAt).toBe(
        "2026-08-08T02:59:00.000Z",
      );
    }
  });
});
