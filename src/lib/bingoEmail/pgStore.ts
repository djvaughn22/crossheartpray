// Neon Postgres adapter for the Bible Bingo 7 email store.
// Selected only when DATABASE_URL is set (see store.ts). Schema is created
// idempotently on first use — the tables are additive and prefixed
// bingo_email_* so they can never collide with anything else.

import { neon } from "@neondatabase/serverless";
import type {
  BingoEmailBatch,
  BingoEmailCadence,
  BingoEmailCompletion,
  BingoEmailSendStatus,
  BingoEmailStore,
  BingoEmailSubscriber,
  BingoEmailSubscriberStatus,
} from "./store";

type Row = Record<string, unknown>;

function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function isoOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return iso(value);
}

function rowToSubscriber(row: Row): BingoEmailSubscriber {
  return {
    id: String(row.id),
    email: String(row.email),
    status: String(row.status) as BingoEmailSubscriberStatus,
    cadence: String(row.cadence) as BingoEmailCadence,
    manageToken: String(row.manage_token),
    journeySeed: String(row.journey_seed),
    journeyNumber: Number(row.journey_number),
    journeyPosition: Number(row.journey_position),
    journeyCompletedAt: isoOrNull(row.journey_completed_at),
    consentAt: iso(row.consent_at),
    createdAt: iso(row.created_at),
    pausedAt: isoOrNull(row.paused_at),
    unsubscribedAt: isoOrNull(row.unsubscribed_at),
    lastSentAt: isoOrNull(row.last_sent_at),
    nextSendAt: iso(row.next_send_at),
  };
}

function rowToBatch(row: Row): BingoEmailBatch {
  const readingIds = Array.isArray(row.reading_ids)
    ? (row.reading_ids as string[])
    : (JSON.parse(String(row.reading_ids)) as string[]);
  return {
    id: String(row.id),
    subscriberId: String(row.subscriber_id),
    journeyNumber: Number(row.journey_number),
    sequence: Number(row.sequence),
    token: String(row.token),
    readingIds,
    idempotencyKey: String(row.idempotency_key),
    createdAt: iso(row.created_at),
    scheduledFor: iso(row.scheduled_for),
    sentAt: isoOrNull(row.sent_at),
    sendStatus: String(row.send_status) as BingoEmailSendStatus,
    lastError: row.last_error === null ? null : String(row.last_error),
  };
}

function rowToCompletion(row: Row): BingoEmailCompletion {
  return {
    subscriberId: String(row.subscriber_id),
    journeyNumber: Number(row.journey_number),
    readingId: String(row.reading_id),
    batchId: String(row.batch_id),
    completedAt: iso(row.completed_at),
  };
}

export async function createPostgresBingoEmailStore(
  databaseUrl: string,
): Promise<BingoEmailStore> {
  const sql = neon(databaseUrl);

  await sql`
    CREATE TABLE IF NOT EXISTS bingo_email_subscribers (
      id text PRIMARY KEY,
      email text UNIQUE NOT NULL,
      status text NOT NULL,
      cadence text NOT NULL,
      manage_token text UNIQUE NOT NULL,
      journey_seed text NOT NULL,
      journey_number integer NOT NULL,
      journey_position integer NOT NULL,
      journey_completed_at timestamptz,
      consent_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL,
      paused_at timestamptz,
      unsubscribed_at timestamptz,
      last_sent_at timestamptz,
      next_send_at timestamptz NOT NULL
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS bingo_email_batches (
      id text PRIMARY KEY,
      subscriber_id text NOT NULL REFERENCES bingo_email_subscribers(id),
      journey_number integer NOT NULL,
      sequence integer NOT NULL,
      token text UNIQUE NOT NULL,
      reading_ids jsonb NOT NULL,
      idempotency_key text UNIQUE NOT NULL,
      created_at timestamptz NOT NULL,
      scheduled_for timestamptz NOT NULL,
      sent_at timestamptz,
      send_status text NOT NULL,
      last_error text
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS bingo_email_completions (
      subscriber_id text NOT NULL REFERENCES bingo_email_subscribers(id),
      journey_number integer NOT NULL,
      reading_id text NOT NULL,
      batch_id text NOT NULL,
      completed_at timestamptz NOT NULL,
      PRIMARY KEY (subscriber_id, journey_number, reading_id)
    )`;

  const subscriberPatchColumns: Record<string, string> = {
    email: "email",
    status: "status",
    cadence: "cadence",
    manageToken: "manage_token",
    journeySeed: "journey_seed",
    journeyNumber: "journey_number",
    journeyPosition: "journey_position",
    journeyCompletedAt: "journey_completed_at",
    consentAt: "consent_at",
    pausedAt: "paused_at",
    unsubscribedAt: "unsubscribed_at",
    lastSentAt: "last_sent_at",
    nextSendAt: "next_send_at",
  };

  const batchPatchColumns: Record<string, string> = {
    sentAt: "sent_at",
    sendStatus: "send_status",
    lastError: "last_error",
    scheduledFor: "scheduled_for",
  };

  return {
    async getSubscriberByEmail(email) {
      const rows = await sql`
        SELECT * FROM bingo_email_subscribers WHERE email = ${email} LIMIT 1`;
      return rows[0] ? rowToSubscriber(rows[0]) : null;
    },
    async getSubscriberById(id) {
      const rows = await sql`
        SELECT * FROM bingo_email_subscribers WHERE id = ${id} LIMIT 1`;
      return rows[0] ? rowToSubscriber(rows[0]) : null;
    },
    async getSubscriberByManageToken(token) {
      const rows = await sql`
        SELECT * FROM bingo_email_subscribers WHERE manage_token = ${token} LIMIT 1`;
      return rows[0] ? rowToSubscriber(rows[0]) : null;
    },
    async createSubscriber(s) {
      await sql`
        INSERT INTO bingo_email_subscribers (
          id, email, status, cadence, manage_token, journey_seed,
          journey_number, journey_position, journey_completed_at, consent_at,
          created_at, paused_at, unsubscribed_at, last_sent_at, next_send_at
        ) VALUES (
          ${s.id}, ${s.email}, ${s.status}, ${s.cadence}, ${s.manageToken},
          ${s.journeySeed}, ${s.journeyNumber}, ${s.journeyPosition},
          ${s.journeyCompletedAt}, ${s.consentAt}, ${s.createdAt},
          ${s.pausedAt}, ${s.unsubscribedAt}, ${s.lastSentAt}, ${s.nextSendAt}
        )`;
      return s;
    },
    async updateSubscriber(id, patch) {
      for (const [field, value] of Object.entries(patch)) {
        const column = subscriberPatchColumns[field];
        if (!column) continue;
        await sql.query(
          `UPDATE bingo_email_subscribers SET ${column} = $1 WHERE id = $2`,
          [value, id],
        );
      }
      const rows = await sql`
        SELECT * FROM bingo_email_subscribers WHERE id = ${id} LIMIT 1`;
      return rows[0] ? rowToSubscriber(rows[0]) : null;
    },
    async listDueSubscribers(nowIso) {
      const rows = await sql`
        SELECT * FROM bingo_email_subscribers
        WHERE status = 'active' AND next_send_at <= ${nowIso}
        ORDER BY next_send_at ASC
        LIMIT 200`;
      return rows.map(rowToSubscriber);
    },

    async getBatchByToken(token) {
      const rows = await sql`
        SELECT * FROM bingo_email_batches WHERE token = ${token} LIMIT 1`;
      return rows[0] ? rowToBatch(rows[0]) : null;
    },
    async getBatchByIdempotencyKey(key) {
      const rows = await sql`
        SELECT * FROM bingo_email_batches WHERE idempotency_key = ${key} LIMIT 1`;
      return rows[0] ? rowToBatch(rows[0]) : null;
    },
    async createBatch(b) {
      await sql`
        INSERT INTO bingo_email_batches (
          id, subscriber_id, journey_number, sequence, token, reading_ids,
          idempotency_key, created_at, scheduled_for, sent_at, send_status,
          last_error
        ) VALUES (
          ${b.id}, ${b.subscriberId}, ${b.journeyNumber}, ${b.sequence},
          ${b.token}, ${JSON.stringify(b.readingIds)}, ${b.idempotencyKey},
          ${b.createdAt}, ${b.scheduledFor}, ${b.sentAt}, ${b.sendStatus},
          ${b.lastError}
        )
        ON CONFLICT (idempotency_key) DO NOTHING`;
      const rows = await sql`
        SELECT * FROM bingo_email_batches
        WHERE idempotency_key = ${b.idempotencyKey} LIMIT 1`;
      return rowToBatch(rows[0]);
    },
    async updateBatch(id, patch) {
      for (const [field, value] of Object.entries(patch)) {
        const column = batchPatchColumns[field];
        if (!column) continue;
        await sql.query(
          `UPDATE bingo_email_batches SET ${column} = $1 WHERE id = $2`,
          [value, id],
        );
      }
      const rows = await sql`
        SELECT * FROM bingo_email_batches WHERE id = ${id} LIMIT 1`;
      return rows[0] ? rowToBatch(rows[0]) : null;
    },
    async latestBatchForSubscriber(subscriberId) {
      const rows = await sql`
        SELECT * FROM bingo_email_batches
        WHERE subscriber_id = ${subscriberId}
        ORDER BY journey_number DESC, sequence DESC
        LIMIT 1`;
      return rows[0] ? rowToBatch(rows[0]) : null;
    },

    async setReadingCompletion(completion, completed) {
      if (completed) {
        await sql`
          INSERT INTO bingo_email_completions (
            subscriber_id, journey_number, reading_id, batch_id, completed_at
          ) VALUES (
            ${completion.subscriberId}, ${completion.journeyNumber},
            ${completion.readingId}, ${completion.batchId},
            ${completion.completedAt}
          )
          ON CONFLICT (subscriber_id, journey_number, reading_id)
          DO NOTHING`;
      } else {
        await sql`
          DELETE FROM bingo_email_completions
          WHERE subscriber_id = ${completion.subscriberId}
            AND journey_number = ${completion.journeyNumber}
            AND reading_id = ${completion.readingId}`;
      }
    },
    async listCompletions(subscriberId, journeyNumber) {
      const rows = await sql`
        SELECT * FROM bingo_email_completions
        WHERE subscriber_id = ${subscriberId}
          AND journey_number = ${journeyNumber}`;
      return rows.map(rowToCompletion);
    },
  };
}
