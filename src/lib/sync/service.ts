import {
  createSyncId,
  createSyncSessionToken,
  hashSyncPassword,
  hashSyncSecret,
  normalizeSyncEmail,
  validateSyncPassword,
  verifySyncPassword,
} from "./crypto";
import { getSyncStore, type SyncStore } from "./store";
import type {
  SyncEntitlement,
  SyncEntitlementKind,
  SyncProgressItem,
  SyncUser,
} from "./types";
import type { ValidSyncProgressUpdate } from "./progress";

const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

export type SyncPublicAccount = {
  id: string;
  email: string;
  syncActive: boolean;
  entitlementKinds: SyncEntitlementKind[];
};

function isActiveEntitlement(
  entitlement: SyncEntitlement,
  now: Date,
): boolean {
  if (entitlement.status !== "active") return false;

  const startsAt = new Date(entitlement.startsAt).getTime();
  if (!Number.isFinite(startsAt) || startsAt > now.getTime()) return false;

  if (entitlement.endsAt) {
    const endsAt = new Date(entitlement.endsAt).getTime();
    if (!Number.isFinite(endsAt) || endsAt <= now.getTime()) return false;
  }

  return true;
}

export class SyncService {
  constructor(private readonly store: SyncStore) {}

  private async issueSession(userId: string, now: Date) {
    const token = createSyncSessionToken();
    const createdAt = now.toISOString();
    const expiresAt = new Date(
      now.getTime() + SESSION_LIFETIME_MS,
    ).toISOString();

    await this.store.createSession({
      id: createSyncId(),
      userId,
      tokenHash: hashSyncSecret(token),
      createdAt,
      expiresAt,
      revokedAt: null,
    });

    return {
      token,
      expiresAt,
    };
  }

  private async publicAccount(
    user: SyncUser,
    now: Date = new Date(),
  ): Promise<SyncPublicAccount> {
    const entitlements = await this.store.listEntitlements(user.id);
    const active = entitlements.filter((value) =>
      isActiveEntitlement(value, now),
    );

    return {
      id: user.id,
      email: user.email,
      syncActive: active.length > 0,
      entitlementKinds: [
        ...new Set(active.map((value) => value.kind)),
      ],
    };
  }

  async register(input: {
    email?: unknown;
    password?: unknown;
  }, now: Date = new Date()) {
    const email = normalizeSyncEmail(input.email);
    if (!email) {
      return { ok: false as const, error: "invalid-email" as const };
    }

    const password = validateSyncPassword(input.password);
    if (!password) {
      return { ok: false as const, error: "invalid-password" as const };
    }

    if (await this.store.getUserByEmail(email)) {
      return { ok: false as const, error: "email-in-use" as const };
    }

    const user: SyncUser = {
      id: createSyncId(),
      email,
      passwordHash: await hashSyncPassword(password),
      createdAt: now.toISOString(),
    };

    const created = await this.store.createUser(user);
    if (!created) {
      return { ok: false as const, error: "email-in-use" as const };
    }

    const session = await this.issueSession(created.id, now);

    return {
      ok: true as const,
      account: await this.publicAccount(created, now),
      ...session,
    };
  }

  async login(input: {
    email?: unknown;
    password?: unknown;
  }, now: Date = new Date()) {
    const email = normalizeSyncEmail(input.email);
    const password =
      typeof input.password === "string" ? input.password : null;

    if (!email || !password) {
      return { ok: false as const, error: "invalid-credentials" as const };
    }

    const user = await this.store.getUserByEmail(email);

    if (
      !user ||
      !(await verifySyncPassword(password, user.passwordHash))
    ) {
      return { ok: false as const, error: "invalid-credentials" as const };
    }

    const session = await this.issueSession(user.id, now);

    return {
      ok: true as const,
      account: await this.publicAccount(user, now),
      ...session,
    };
  }

  async accountForSession(
    rawToken: string | null,
    now: Date = new Date(),
  ): Promise<SyncPublicAccount | null> {
    if (!rawToken) return null;

    const session = await this.store.getSessionByTokenHash(
      hashSyncSecret(rawToken),
    );

    if (!session || session.revokedAt) return null;

    const expiresAt = new Date(session.expiresAt).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) {
      return null;
    }

    const user = await this.store.getUserById(session.userId);
    if (!user) return null;

    return this.publicAccount(user, now);
  }

  async userForSession(
    rawToken: string | null,
    now: Date = new Date(),
  ): Promise<SyncUser | null> {
    if (!rawToken) return null;

    const session = await this.store.getSessionByTokenHash(
      hashSyncSecret(rawToken),
    );

    if (!session || session.revokedAt) return null;

    const expiresAt = new Date(session.expiresAt).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) {
      return null;
    }

    return this.store.getUserById(session.userId);
  }

  async logout(rawToken: string | null, now: Date = new Date()) {
    if (!rawToken) return;

    await this.store.revokeSessionByTokenHash(
      hashSyncSecret(rawToken),
      now.toISOString(),
    );
  }

  async deleteAccount(
    rawToken: string | null,
    password: unknown,
    now: Date = new Date(),
  ) {
    const user = await this.userForSession(rawToken, now);
    if (!user || typeof password !== "string") {
      return { ok: false as const, error: "not-authenticated" as const };
    }

    if (!(await verifySyncPassword(password, user.passwordHash))) {
      return { ok: false as const, error: "invalid-password" as const };
    }

    await this.store.deleteUser(user.id);
    return { ok: true as const };
  }

  async listProgressForSession(
    rawToken: string | null,
    now: Date = new Date(),
  ) {
    const account = await this.accountForSession(rawToken, now);
    if (!account) {
      return { ok: false as const, error: "not-authenticated" as const };
    }

    if (!account.syncActive) {
      return { ok: false as const, error: "sync-inactive" as const };
    }

    return {
      ok: true as const,
      items: await this.store.listProgress(account.id),
    };
  }

  async applyProgressForSession(
    rawToken: string | null,
    updates: ValidSyncProgressUpdate[],
    now: Date = new Date(),
  ) {
    const account = await this.accountForSession(rawToken, now);
    if (!account) {
      return { ok: false as const, error: "not-authenticated" as const };
    }

    if (!account.syncActive) {
      return { ok: false as const, error: "sync-inactive" as const };
    }

    const saved: SyncProgressItem[] = [];

    for (const update of updates) {
      saved.push(
        await this.store.upsertProgress({
          userId: account.id,
          ...update,
        }),
      );
    }

    return {
      ok: true as const,
      items: saved,
    };
  }
}

export async function getSyncService(): Promise<SyncService | null> {
  const store = await getSyncStore();
  return store ? new SyncService(store) : null;
}
