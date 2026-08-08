import type {
  SyncCode,
  SyncCodeRedemption,
  SyncEntitlement,
  SyncProgressItem,
  SyncSession,
  SyncUser,
} from "./types";

export interface SyncStore {
  getUserByEmail(email: string): Promise<SyncUser | null>;
  getUserById(id: string): Promise<SyncUser | null>;
  createUser(user: SyncUser): Promise<SyncUser | null>;
  deleteUser(id: string): Promise<boolean>;

  createSession(session: SyncSession): Promise<SyncSession>;
  getSessionByTokenHash(tokenHash: string): Promise<SyncSession | null>;
  revokeSessionByTokenHash(tokenHash: string, revokedAt: string): Promise<void>;

  createEntitlement(entitlement: SyncEntitlement): Promise<SyncEntitlement>;
  listEntitlements(userId: string): Promise<SyncEntitlement[]>;

  listProgress(userId: string): Promise<SyncProgressItem[]>;
  upsertProgress(item: SyncProgressItem): Promise<SyncProgressItem>;

  getCodeByHash(codeHash: string): Promise<SyncCode | null>;
  createCode(code: SyncCode): Promise<SyncCode | null>;
  recordCodeRedemption(redemption: SyncCodeRedemption): Promise<boolean>;
  listCodeRedemptions(): Promise<SyncCodeRedemption[]>;
}

function copyUser(value: SyncUser): SyncUser {
  return { ...value };
}

function copySession(value: SyncSession): SyncSession {
  return { ...value };
}

function copyEntitlement(value: SyncEntitlement): SyncEntitlement {
  return { ...value };
}

function copyProgress(value: SyncProgressItem): SyncProgressItem {
  return { ...value };
}

function copyCode(value: SyncCode): SyncCode {
  return { ...value };
}

function copyRedemption(value: SyncCodeRedemption): SyncCodeRedemption {
  return { ...value };
}

export function createMemorySyncStore(): SyncStore {
  const users = new Map<string, SyncUser>();
  const sessions = new Map<string, SyncSession>();
  const entitlements = new Map<string, SyncEntitlement>();
  const progress = new Map<string, SyncProgressItem>();
  const codes = new Map<string, SyncCode>();
  const redemptions = new Map<string, SyncCodeRedemption>();

  const progressKey = (item: SyncProgressItem) =>
    [
      item.userId,
      item.planId,
      item.cycleId ?? "",
      item.itemId,
    ].join("|");

  return {
    async getUserByEmail(email) {
      const user =
        [...users.values()].find((candidate) => candidate.email === email) ??
        null;
      return user ? copyUser(user) : null;
    },

    async getUserById(id) {
      const user = users.get(id);
      return user ? copyUser(user) : null;
    },

    async createUser(user) {
      if ([...users.values()].some((existing) => existing.email === user.email)) {
        return null;
      }

      users.set(user.id, copyUser(user));
      return copyUser(user);
    },

    async deleteUser(id) {
      const existed = users.delete(id);

      for (const [key, value] of sessions) {
        if (value.userId === id) sessions.delete(key);
      }
      for (const [key, value] of entitlements) {
        if (value.userId === id) entitlements.delete(key);
      }
      for (const [key, value] of progress) {
        if (value.userId === id) progress.delete(key);
      }
      for (const [key, value] of redemptions) {
        if (value.userId === id) redemptions.delete(key);
      }

      return existed;
    },

    async createSession(session) {
      sessions.set(session.tokenHash, copySession(session));
      return copySession(session);
    },

    async getSessionByTokenHash(tokenHash) {
      const session = sessions.get(tokenHash);
      return session ? copySession(session) : null;
    },

    async revokeSessionByTokenHash(tokenHash, revokedAt) {
      const session = sessions.get(tokenHash);
      if (!session) return;

      sessions.set(tokenHash, {
        ...session,
        revokedAt,
      });
    },

    async createEntitlement(entitlement) {
      entitlements.set(entitlement.id, copyEntitlement(entitlement));
      return copyEntitlement(entitlement);
    },

    async listEntitlements(userId) {
      return [...entitlements.values()]
        .filter((value) => value.userId === userId)
        .map(copyEntitlement);
    },

    async listProgress(userId) {
      return [...progress.values()]
        .filter((value) => value.userId === userId)
        .map(copyProgress);
    },

    async upsertProgress(item) {
      const key = progressKey(item);
      const existing = progress.get(key);

      if (!existing || item.updatedAt >= existing.updatedAt) {
        progress.set(key, copyProgress(item));
        return copyProgress(item);
      }

      return copyProgress(existing);
    },

    async getCodeByHash(codeHash) {
      const code =
        [...codes.values()].find((value) => value.codeHash === codeHash) ?? null;
      return code ? copyCode(code) : null;
    },

    async createCode(code) {
      if ([...codes.values()].some((value) => value.codeHash === code.codeHash)) {
        return null;
      }

      codes.set(code.id, copyCode(code));
      return copyCode(code);
    },

    async recordCodeRedemption(redemption) {
      if (
        [...redemptions.values()].some(
          (value) =>
            value.codeId === redemption.codeId &&
            value.userId === redemption.userId,
        )
      ) {
        return false;
      }

      redemptions.set(redemption.id, copyRedemption(redemption));
      return true;
    },

    async listCodeRedemptions() {
      return [...redemptions.values()]
        .sort((a, b) => a.redeemedAt.localeCompare(b.redeemedAt))
        .map(copyRedemption);
    },
  };
}

let memoryStore: SyncStore | null = null;
let postgresStore: SyncStore | null = null;

export async function getSyncStore(): Promise<SyncStore | null> {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (databaseUrl) {
    if (!postgresStore) {
      const { createPostgresSyncStore } = await import("./pgStore");
      postgresStore = await createPostgresSyncStore(databaseUrl);
    }
    return postgresStore;
  }

  if (process.env.NODE_ENV !== "production") {
    if (!memoryStore) memoryStore = createMemorySyncStore();
    return memoryStore;
  }

  return null;
}
