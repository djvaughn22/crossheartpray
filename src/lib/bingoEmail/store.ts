// Bible Bingo 7 email storage — one interface, two adapters.
//
// DATABASE_URL selects the durable Neon Postgres adapter (same convention
// as the family's store-engine). Without it, development and tests use an
// in-memory store; production API routes refuse signups instead of
// pretending to be durable. All timestamps are ISO strings.

export type BingoEmailCadence = "weekly" | "daily";
export type BingoEmailSubscriberStatus = "active" | "paused" | "unsubscribed";
export type BingoEmailSendStatus = "pending" | "sent" | "failed";

export type BingoEmailSubscriber = {
  id: string;
  /** Normalized (trimmed, lowercased) address. Never log this. */
  email: string;
  status: BingoEmailSubscriberStatus;
  cadence: BingoEmailCadence;
  manageToken: string;
  journeySeed: string;
  journeyNumber: number;
  /** Count of readings already used (sent) in the current journey. */
  journeyPosition: number;
  journeyCompletedAt: string | null;
  consentAt: string;
  createdAt: string;
  pausedAt: string | null;
  unsubscribedAt: string | null;
  lastSentAt: string | null;
  nextSendAt: string;
};

export type BingoEmailBatch = {
  id: string;
  subscriberId: string;
  journeyNumber: number;
  sequence: number;
  token: string;
  readingIds: string[];
  idempotencyKey: string;
  createdAt: string;
  scheduledFor: string;
  sentAt: string | null;
  sendStatus: BingoEmailSendStatus;
  lastError: string | null;
};

export type BingoEmailCompletion = {
  subscriberId: string;
  journeyNumber: number;
  readingId: string;
  batchId: string;
  completedAt: string;
};

export interface BingoEmailStore {
  getSubscriberByEmail(email: string): Promise<BingoEmailSubscriber | null>;
  getSubscriberById(id: string): Promise<BingoEmailSubscriber | null>;
  getSubscriberByManageToken(token: string): Promise<BingoEmailSubscriber | null>;
  createSubscriber(subscriber: BingoEmailSubscriber): Promise<BingoEmailSubscriber>;
  updateSubscriber(
    id: string,
    patch: Partial<BingoEmailSubscriber>,
  ): Promise<BingoEmailSubscriber | null>;
  /** Active subscribers whose nextSendAt is at or before nowIso. */
  listDueSubscribers(nowIso: string): Promise<BingoEmailSubscriber[]>;

  getBatchByToken(token: string): Promise<BingoEmailBatch | null>;
  getBatchByIdempotencyKey(key: string): Promise<BingoEmailBatch | null>;
  /**
   * Insert a batch; when a batch with the same idempotency key already
   * exists, the EXISTING batch is returned untouched (duplicate-send guard).
   */
  createBatch(batch: BingoEmailBatch): Promise<BingoEmailBatch>;
  updateBatch(
    id: string,
    patch: Partial<BingoEmailBatch>,
  ): Promise<BingoEmailBatch | null>;
  latestBatchForSubscriber(subscriberId: string): Promise<BingoEmailBatch | null>;

  setReadingCompletion(
    completion: BingoEmailCompletion,
    completed: boolean,
  ): Promise<void>;
  listCompletions(
    subscriberId: string,
    journeyNumber: number,
  ): Promise<BingoEmailCompletion[]>;
}

/* ------------------------------------------------------- memory adapter */

export function createMemoryBingoEmailStore(): BingoEmailStore {
  const subscribers = new Map<string, BingoEmailSubscriber>();
  const batches = new Map<string, BingoEmailBatch>();
  const completions = new Map<string, BingoEmailCompletion>();

  const completionKey = (c: Pick<BingoEmailCompletion, "subscriberId" | "journeyNumber" | "readingId">) =>
    `${c.subscriberId}|${c.journeyNumber}|${c.readingId}`;

  return {
    async getSubscriberByEmail(email) {
      return (
        [...subscribers.values()].find((s) => s.email === email) ?? null
      );
    },
    async getSubscriberById(id) {
      return subscribers.get(id) ?? null;
    },
    async getSubscriberByManageToken(token) {
      return (
        [...subscribers.values()].find((s) => s.manageToken === token) ?? null
      );
    },
    async createSubscriber(subscriber) {
      const existing = [...subscribers.values()].find(
        (s) => s.email === subscriber.email,
      );
      if (existing) {
        throw new Error("bingo-email: subscriber email already exists");
      }
      subscribers.set(subscriber.id, { ...subscriber });
      return { ...subscriber };
    },
    async updateSubscriber(id, patch) {
      const current = subscribers.get(id);
      if (!current) return null;
      const next = { ...current, ...patch, id: current.id };
      subscribers.set(id, next);
      return { ...next };
    },
    async listDueSubscribers(nowIso) {
      return [...subscribers.values()]
        .filter((s) => s.status === "active" && s.nextSendAt <= nowIso)
        .map((s) => ({ ...s }));
    },

    async getBatchByToken(token) {
      return (
        [...batches.values()].find((b) => b.token === token) ?? null
      );
    },
    async getBatchByIdempotencyKey(key) {
      return (
        [...batches.values()].find((b) => b.idempotencyKey === key) ?? null
      );
    },
    async createBatch(batch) {
      const existing = [...batches.values()].find(
        (b) => b.idempotencyKey === batch.idempotencyKey,
      );
      if (existing) return { ...existing };
      batches.set(batch.id, { ...batch, readingIds: [...batch.readingIds] });
      return { ...batch };
    },
    async updateBatch(id, patch) {
      const current = batches.get(id);
      if (!current) return null;
      const next = { ...current, ...patch, id: current.id };
      batches.set(id, next);
      return { ...next };
    },
    async latestBatchForSubscriber(subscriberId) {
      const own = [...batches.values()]
        .filter((b) => b.subscriberId === subscriberId)
        .sort(
          (a, b) =>
            b.journeyNumber - a.journeyNumber || b.sequence - a.sequence,
        );
      return own[0] ? { ...own[0] } : null;
    },

    async setReadingCompletion(completion, completed) {
      const key = completionKey(completion);
      if (completed) {
        completions.set(key, { ...completion });
      } else {
        completions.delete(key);
      }
    },
    async listCompletions(subscriberId, journeyNumber) {
      return [...completions.values()].filter(
        (c) =>
          c.subscriberId === subscriberId && c.journeyNumber === journeyNumber,
      );
    },
  };
}

/* ------------------------------------------------------ adapter routing */

let sharedMemoryStore: BingoEmailStore | null = null;
let sharedPostgresStore: BingoEmailStore | null = null;

/**
 * The store the API routes should use, or null when this deployment has no
 * durable storage configured (production without DATABASE_URL — routes
 * fail closed with a clear message instead of losing subscribers).
 */
export async function getBingoEmailStore(): Promise<BingoEmailStore | null> {
  if (process.env.DATABASE_URL?.trim()) {
    if (!sharedPostgresStore) {
      const { createPostgresBingoEmailStore } = await import("./pgStore");
      sharedPostgresStore = await createPostgresBingoEmailStore(
        process.env.DATABASE_URL.trim(),
      );
    }
    return sharedPostgresStore;
  }

  if (process.env.NODE_ENV !== "production") {
    if (!sharedMemoryStore) {
      sharedMemoryStore = createMemoryBingoEmailStore();
      if (process.env.NODE_ENV === "development") {
        await seedDevDemo(sharedMemoryStore);
      }
    }
    return sharedMemoryStore;
  }

  return null;
}

// Local-dev only: a deterministic demo subscriber + first batch so
// /explorebible?batch=demo-batch-token-000000 and
// /bible-bingo/manage?token=demo-manage-token-000000 can be exercised
// without a database or email provider. Never runs in production or tests.
async function seedDevDemo(store: BingoEmailStore) {
  const { bingoEmailBatchReadingIds, bingoEmailJourneyOrder } = await import(
    "./journey"
  );
  const nowIso = new Date().toISOString();
  const subscriber: BingoEmailSubscriber = {
    id: "demo-subscriber",
    email: "demo@example.invalid",
    status: "active",
    cadence: "weekly",
    manageToken: "demo-manage-token-000000",
    journeySeed: "demo-seed",
    journeyNumber: 1,
    journeyPosition: 7,
    journeyCompletedAt: null,
    consentAt: nowIso,
    createdAt: nowIso,
    pausedAt: null,
    unsubscribedAt: null,
    lastSentAt: nowIso,
    nextSendAt: "9999-01-01T00:00:00.000Z",
  };
  await store.createSubscriber(subscriber);
  await store.createBatch({
    id: "demo-batch",
    subscriberId: subscriber.id,
    journeyNumber: 1,
    sequence: 0,
    token: "demo-batch-token-000000",
    readingIds: bingoEmailBatchReadingIds(
      bingoEmailJourneyOrder("demo-seed|journey-1"),
      0,
    ),
    idempotencyKey: "demo-subscriber:j1:s0",
    createdAt: nowIso,
    scheduledFor: nowIso,
    sentAt: nowIso,
    sendStatus: "sent",
    lastError: null,
  });
}
