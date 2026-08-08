import { neon } from "@neondatabase/serverless";
import type { SyncStore } from "./store";
import type {
  SyncCode,
  SyncCodeRedemption,
  SyncEntitlement,
  SyncEntitlementKind,
  SyncEntitlementStatus,
  SyncProgressItem,
  SyncSession,
  SyncUser,
} from "./types";

type Row = Record<string, unknown>;

function iso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function nullableIso(value: unknown): string | null {
  return value === null || value === undefined ? null : iso(value);
}

function rowToUser(row: Row): SyncUser {
  return {
    id: String(row.id),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    createdAt: iso(row.created_at),
  };
}

function rowToSession(row: Row): SyncSession {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    tokenHash: String(row.token_hash),
    createdAt: iso(row.created_at),
    expiresAt: iso(row.expires_at),
    revokedAt: nullableIso(row.revoked_at),
  };
}

function rowToEntitlement(row: Row): SyncEntitlement {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    kind: String(row.kind) as SyncEntitlementKind,
    status: String(row.status) as SyncEntitlementStatus,
    sourceRef:
      row.source_ref === null || row.source_ref === undefined
        ? null
        : String(row.source_ref),
    startsAt: iso(row.starts_at),
    endsAt: nullableIso(row.ends_at),
    createdAt: iso(row.created_at),
  };
}

function rowToProgress(row: Row): SyncProgressItem {
  return {
    userId: String(row.user_id),
    planId: String(row.plan_id) as SyncProgressItem["planId"],
    cycleId: String(row.cycle_id || "") || null,
    itemId: String(row.item_id),
    completed: Boolean(row.completed),
    updatedAt: iso(row.updated_at),
  };
}

function rowToCode(row: Row): SyncCode {
  return {
    id: String(row.id),
    codeHash: String(row.code_hash),
    label: String(row.label),
    enabled: Boolean(row.enabled),
    createdAt: iso(row.created_at),
    disabledAt: nullableIso(row.disabled_at),
  };
}

function rowToRedemption(row: Row): SyncCodeRedemption {
  return {
    id: String(row.id),
    codeId: String(row.code_id),
    userId: String(row.user_id),
    normalizedEmail: String(row.normalized_email),
    redeemedAt: iso(row.redeemed_at),
  };
}

export async function createPostgresSyncStore(
  databaseUrl: string,
): Promise<SyncStore> {
  const sql = neon(databaseUrl);

  await sql`
    CREATE TABLE IF NOT EXISTS sync_users (
      id text PRIMARY KEY,
      email text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      created_at timestamptz NOT NULL
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS sync_codes (
      id text PRIMARY KEY,
      code_hash text UNIQUE NOT NULL,
      label text NOT NULL,
      enabled boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL,
      disabled_at timestamptz
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS sync_sessions (
      id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES sync_users(id) ON DELETE CASCADE,
      token_hash text UNIQUE NOT NULL,
      created_at timestamptz NOT NULL,
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz
    )`;

  await sql`
    CREATE INDEX IF NOT EXISTS sync_sessions_user_id_idx
    ON sync_sessions(user_id)`;

  await sql`
    CREATE INDEX IF NOT EXISTS sync_sessions_expires_at_idx
    ON sync_sessions(expires_at)`;

  await sql`
    CREATE TABLE IF NOT EXISTS sync_entitlements (
      id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES sync_users(id) ON DELETE CASCADE,
      kind text NOT NULL
        CHECK (kind IN ('annual', 'lifetime', 'free-code')),
      status text NOT NULL
        CHECK (status IN ('active', 'revoked', 'expired')),
      source_ref text,
      starts_at timestamptz NOT NULL,
      ends_at timestamptz,
      created_at timestamptz NOT NULL
    )`;

  await sql`
    CREATE INDEX IF NOT EXISTS sync_entitlements_user_id_idx
    ON sync_entitlements(user_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS reading_progress (
      user_id text NOT NULL REFERENCES sync_users(id) ON DELETE CASCADE,
      plan_id text NOT NULL
        CHECK (plan_id IN ('one-year-v1', 'two-year-v1')),
      cycle_id text NOT NULL DEFAULT '',
      item_id text NOT NULL,
      completed boolean NOT NULL,
      updated_at timestamptz NOT NULL,
      PRIMARY KEY (user_id, plan_id, cycle_id, item_id)
    )`;

  await sql`
    CREATE INDEX IF NOT EXISTS reading_progress_user_updated_idx
    ON reading_progress(user_id, updated_at)`;

  await sql`
    CREATE TABLE IF NOT EXISTS sync_code_redemptions (
      id text PRIMARY KEY,
      code_id text NOT NULL REFERENCES sync_codes(id),
      user_id text NOT NULL REFERENCES sync_users(id) ON DELETE CASCADE,
      normalized_email text NOT NULL,
      redeemed_at timestamptz NOT NULL,
      UNIQUE (code_id, user_id)
    )`;

  await sql`
    CREATE INDEX IF NOT EXISTS sync_code_redemptions_redeemed_idx
    ON sync_code_redemptions(redeemed_at)`;

  return {
    async getUserByEmail(email) {
      const rows = await sql`
        SELECT * FROM sync_users WHERE email = ${email} LIMIT 1`;
      return rows[0] ? rowToUser(rows[0]) : null;
    },

    async getUserById(id) {
      const rows = await sql`
        SELECT * FROM sync_users WHERE id = ${id} LIMIT 1`;
      return rows[0] ? rowToUser(rows[0]) : null;
    },

    async createUser(user) {
      const rows = await sql`
        INSERT INTO sync_users (
          id, email, password_hash, created_at
        ) VALUES (
          ${user.id}, ${user.email}, ${user.passwordHash}, ${user.createdAt}
        )
        ON CONFLICT (email) DO NOTHING
        RETURNING *`;

      return rows[0] ? rowToUser(rows[0]) : null;
    },

    async deleteUser(id) {
      const rows = await sql`
        DELETE FROM sync_users
        WHERE id = ${id}
        RETURNING id`;
      return Boolean(rows[0]);
    },

    async createSession(session) {
      const rows = await sql`
        INSERT INTO sync_sessions (
          id, user_id, token_hash, created_at, expires_at, revoked_at
        ) VALUES (
          ${session.id}, ${session.userId}, ${session.tokenHash},
          ${session.createdAt}, ${session.expiresAt}, ${session.revokedAt}
        )
        RETURNING *`;

      return rowToSession(rows[0]);
    },

    async getSessionByTokenHash(tokenHash) {
      const rows = await sql`
        SELECT * FROM sync_sessions
        WHERE token_hash = ${tokenHash}
        LIMIT 1`;

      return rows[0] ? rowToSession(rows[0]) : null;
    },

    async revokeSessionByTokenHash(tokenHash, revokedAt) {
      await sql`
        UPDATE sync_sessions
        SET revoked_at = ${revokedAt}
        WHERE token_hash = ${tokenHash}
          AND revoked_at IS NULL`;
    },

    async createEntitlement(entitlement) {
      const rows = await sql`
        INSERT INTO sync_entitlements (
          id, user_id, kind, status, source_ref,
          starts_at, ends_at, created_at
        ) VALUES (
          ${entitlement.id}, ${entitlement.userId}, ${entitlement.kind},
          ${entitlement.status}, ${entitlement.sourceRef},
          ${entitlement.startsAt}, ${entitlement.endsAt},
          ${entitlement.createdAt}
        )
        RETURNING *`;

      return rowToEntitlement(rows[0]);
    },

    async listEntitlements(userId) {
      const rows = await sql`
        SELECT * FROM sync_entitlements
        WHERE user_id = ${userId}
        ORDER BY created_at ASC`;

      return rows.map(rowToEntitlement);
    },

    async listProgress(userId) {
      const rows = await sql`
        SELECT * FROM reading_progress
        WHERE user_id = ${userId}
        ORDER BY plan_id, cycle_id, item_id`;

      return rows.map(rowToProgress);
    },

    async upsertProgress(item) {
      const cycleId = item.cycleId ?? "";

      const rows = await sql`
        INSERT INTO reading_progress (
          user_id, plan_id, cycle_id, item_id, completed, updated_at
        ) VALUES (
          ${item.userId}, ${item.planId}, ${cycleId},
          ${item.itemId}, ${item.completed}, ${item.updatedAt}
        )
        ON CONFLICT (user_id, plan_id, cycle_id, item_id)
        DO UPDATE SET
          completed = EXCLUDED.completed,
          updated_at = EXCLUDED.updated_at
        WHERE reading_progress.updated_at <= EXCLUDED.updated_at
        RETURNING *`;

      if (rows[0]) return rowToProgress(rows[0]);

      const current = await sql`
        SELECT * FROM reading_progress
        WHERE user_id = ${item.userId}
          AND plan_id = ${item.planId}
          AND cycle_id = ${cycleId}
          AND item_id = ${item.itemId}
        LIMIT 1`;

      return rowToProgress(current[0]);
    },

    async getCodeByHash(codeHash) {
      const rows = await sql`
        SELECT * FROM sync_codes
        WHERE code_hash = ${codeHash}
        LIMIT 1`;

      return rows[0] ? rowToCode(rows[0]) : null;
    },

    async createCode(code) {
      const rows = await sql`
        INSERT INTO sync_codes (
          id, code_hash, label, enabled, created_at, disabled_at
        ) VALUES (
          ${code.id}, ${code.codeHash}, ${code.label}, ${code.enabled},
          ${code.createdAt}, ${code.disabledAt}
        )
        ON CONFLICT (code_hash) DO NOTHING
        RETURNING *`;

      return rows[0] ? rowToCode(rows[0]) : null;
    },

    async recordCodeRedemption(redemption) {
      const rows = await sql`
        INSERT INTO sync_code_redemptions (
          id, code_id, user_id, normalized_email, redeemed_at
        ) VALUES (
          ${redemption.id}, ${redemption.codeId}, ${redemption.userId},
          ${redemption.normalizedEmail}, ${redemption.redeemedAt}
        )
        ON CONFLICT (code_id, user_id) DO NOTHING
        RETURNING id`;

      return Boolean(rows[0]);
    },

    async listCodeRedemptions() {
      const rows = await sql`
        SELECT * FROM sync_code_redemptions
        ORDER BY redeemed_at ASC`;

      return rows.map(rowToRedemption);
    },
  };
}
