// Bible Bingo 7 email service — signup, scheduling, batch state, manage.
//
// Everything is dependency-injected (store, sender, clock) so tests run on
// the in-memory store with a capturing sender and a fake clock; the API
// routes wire in the real Postgres store and Resend sender.
//
// Send pipeline invariants:
//   • A batch is created once per (subscriber, journey, sequence) via an
//     idempotency key — duplicate cron runs and retries reuse the SAME
//     saved batch, never a reshuffled one.
//   • journeyPosition only advances after a successful send, so a failed
//     send stays due and retries the identical batch next run.
//   • The randomized order comes only from the stored journey seed —
//     cadence changes never reshuffle or reset progress.

import type { BibleReadingPlanWeek } from "../bibleReadingPlan";
import {
  BINGO_EMAIL_BATCH_SIZE,
  bingoEmailBatchReadingIds,
  bingoEmailCardForReadingId,
  bingoEmailJourneyOrder,
  bingoEmailPlanSize,
  bingoEmailTotalBatches,
  type BingoEmailReadingCard,
} from "./journey";
import type { BingoEmailSender } from "./mailer";
import { renderBingoBatchEmail } from "./template";
import { newBingoEmailId, newBingoEmailToken } from "./tokens";
import type {
  BingoEmailBatch,
  BingoEmailCadence,
  BingoEmailStore,
  BingoEmailSubscriber,
} from "./store";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Sentinel for "no further sends scheduled" (journey finished). */
const FAR_FUTURE = "9999-01-01T00:00:00.000Z";

export type BingoEmailSubscribeResult =
  | {
      ok: true;
      outcome: "subscribed" | "resubscribed" | "resumed" | "already-subscribed";
      subscriberId: string;
    }
  | { ok: false; error: "invalid-email" | "consent-required" | "invalid-cadence" };

export type BingoEmailSendOutcome =
  | "sent"
  | "journey-complete"
  | "already-sent"
  | "failed";

export type BingoEmailBatchCardView = BingoEmailReadingCard & {
  completed: boolean;
};

export type BingoEmailBatchView = {
  setNumber: number;
  totalSets: number;
  cards: BingoEmailBatchCardView[];
  batchCompletedCount: number;
  batchSize: number;
  planCompletedCount: number;
  planTotal: number;
  /** True once every reading in the journey has been sent. */
  allSetsSent: boolean;
  /** True once every reading in the journey has been marked complete. */
  planFullyCompleted: boolean;
};

export type BingoEmailManageView = {
  status: BingoEmailSubscriber["status"];
  cadence: BingoEmailCadence;
  setsSent: number;
  totalSets: number;
  planCompletedCount: number;
  planTotal: number;
  allSetsSent: boolean;
  planFullyCompleted: boolean;
  latestBatchToken: string | null;
};

export type BingoEmailManageAction =
  | { action: "cadence"; cadence: BingoEmailCadence }
  | { action: "pause" }
  | { action: "resume" }
  | { action: "unsubscribe" }
  | { action: "restart" };

/** Trimmed + lowercased; null when the shape is not a sendable address. */
export function normalizeBingoEmailAddress(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (email.length < 6 || email.length > 254) return null;
  // One @, non-empty local part, dotted domain, no spaces.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return null;
  return email;
}

export function isBingoEmailCadence(value: unknown): value is BingoEmailCadence {
  return value === "weekly" || value === "daily";
}

type BingoEmailServiceOptions = {
  store: BingoEmailStore;
  sendEmail: BingoEmailSender;
  baseUrl?: string;
  now?: () => Date;
  planWeeks?: BibleReadingPlanWeek[];
};

export function createBingoEmailService(options: BingoEmailServiceOptions) {
  const { store, sendEmail } = options;
  const baseUrl = (options.baseUrl ?? "https://crossheartpray.com").replace(/\/$/, "");
  const now = options.now ?? (() => new Date());
  const planWeeks = options.planWeeks;

  const planTotal = bingoEmailPlanSize(planWeeks);
  const totalSets = bingoEmailTotalBatches(planTotal);

  const cadenceIntervalMs = (cadence: BingoEmailCadence) =>
    cadence === "daily" ? DAY_MS : 7 * DAY_MS;

  const nextSendAfter = (fromIso: string, cadence: BingoEmailCadence) =>
    new Date(Date.parse(fromIso) + cadenceIntervalMs(cadence)).toISOString();

  const journeyOrderFor = (subscriber: BingoEmailSubscriber) =>
    bingoEmailJourneyOrder(
      `${subscriber.journeySeed}|journey-${subscriber.journeyNumber}`,
      planWeeks,
    );

  const cardFor = (id: string): BingoEmailReadingCard =>
    bingoEmailCardForReadingId(id, planWeeks) ?? {
      id,
      week: 0,
      daySlug: "",
      dayLabel: "",
      category: "",
      reading: id,
      emoji: "📖",
      laneTitle: "",
      planHref: "/bible-reading-plan",
    };

  const batchUrlFor = (batch: BingoEmailBatch) =>
    `${baseUrl}/explorebible?batch=${batch.token}`;
  const manageUrlFor = (subscriber: BingoEmailSubscriber) =>
    `${baseUrl}/bible-bingo/manage?token=${subscriber.manageToken}`;

  async function subscribe(input: {
    email: unknown;
    cadence?: unknown;
    consent: unknown;
  }): Promise<BingoEmailSubscribeResult> {
    if (input.consent !== true) return { ok: false, error: "consent-required" };

    const email = normalizeBingoEmailAddress(input.email);
    if (!email) return { ok: false, error: "invalid-email" };

    const cadence: BingoEmailCadence =
      input.cadence === undefined ? "weekly" : (input.cadence as BingoEmailCadence);
    if (!isBingoEmailCadence(cadence)) {
      return { ok: false, error: "invalid-cadence" };
    }

    const nowIso = now().toISOString();
    const existing = await store.getSubscriberByEmail(email);

    if (existing) {
      if (existing.status === "active") {
        if (existing.cadence !== cadence) {
          await store.updateSubscriber(existing.id, { cadence });
        }
        return { ok: true, outcome: "already-subscribed", subscriberId: existing.id };
      }

      const reactivation: Partial<BingoEmailSubscriber> = {
        status: "active",
        cadence,
        consentAt: nowIso,
        pausedAt: null,
        unsubscribedAt: null,
        nextSendAt:
          existing.journeyCompletedAt === null ? nowIso : existing.nextSendAt,
      };
      await store.updateSubscriber(existing.id, reactivation);
      return {
        ok: true,
        outcome: existing.status === "paused" ? "resumed" : "resubscribed",
        subscriberId: existing.id,
      };
    }

    const subscriber: BingoEmailSubscriber = {
      id: newBingoEmailId(),
      email,
      status: "active",
      cadence,
      manageToken: newBingoEmailToken(),
      journeySeed: newBingoEmailToken(),
      journeyNumber: 1,
      journeyPosition: 0,
      journeyCompletedAt: null,
      consentAt: nowIso,
      createdAt: nowIso,
      pausedAt: null,
      unsubscribedAt: null,
      lastSentAt: null,
      nextSendAt: nowIso,
    };
    await store.createSubscriber(subscriber);
    return { ok: true, outcome: "subscribed", subscriberId: subscriber.id };
  }

  async function sendNextBatchFor(
    subscriber: BingoEmailSubscriber,
  ): Promise<BingoEmailSendOutcome> {
    const nowIso = now().toISOString();
    const order = journeyOrderFor(subscriber);

    if (subscriber.journeyPosition >= order.length) {
      await store.updateSubscriber(subscriber.id, {
        journeyCompletedAt: subscriber.journeyCompletedAt ?? nowIso,
        nextSendAt: FAR_FUTURE,
      });
      return "journey-complete";
    }

    const sequence = Math.floor(
      subscriber.journeyPosition / BINGO_EMAIL_BATCH_SIZE,
    );
    const idempotencyKey = `${subscriber.id}:j${subscriber.journeyNumber}:s${sequence}`;

    const batch = await store.createBatch({
      id: newBingoEmailId(),
      subscriberId: subscriber.id,
      journeyNumber: subscriber.journeyNumber,
      sequence,
      token: newBingoEmailToken(),
      readingIds: bingoEmailBatchReadingIds(order, sequence),
      idempotencyKey,
      createdAt: nowIso,
      scheduledFor: subscriber.nextSendAt,
      sentAt: null,
      sendStatus: "pending",
      lastError: null,
    });

    if (batch.sentAt) {
      // Already delivered (e.g. overlapping runs) — never send twice.
      await store.updateSubscriber(subscriber.id, {
        nextSendAt: nextSendAfter(nowIso, subscriber.cadence),
      });
      return "already-sent";
    }

    const completions = await store.listCompletions(
      subscriber.id,
      subscriber.journeyNumber,
    );

    const manageUrl = manageUrlFor(subscriber);
    const email = renderBingoBatchEmail({
      cards: batch.readingIds.map(cardFor),
      setNumber: batch.sequence + 1,
      totalSets: bingoEmailTotalBatches(order.length),
      planCompletedCount: completions.length,
      planTotal: order.length,
      batchUrl: batchUrlFor(batch),
      manageUrl,
      unsubscribeUrl: `${manageUrl}&action=unsubscribe`,
    });

    try {
      await sendEmail({
        to: subscriber.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
        headers: {
          "List-Unsubscribe": `<${baseUrl}/api/bingo-email/manage/${subscriber.manageToken}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });
    } catch (error) {
      await store.updateBatch(batch.id, {
        sendStatus: "failed",
        lastError: error instanceof Error ? error.message : "send failed",
      });
      return "failed";
    }

    const nextPosition = subscriber.journeyPosition + batch.readingIds.length;
    const finished = nextPosition >= order.length;
    await store.updateBatch(batch.id, { sendStatus: "sent", sentAt: nowIso });
    await store.updateSubscriber(subscriber.id, {
      journeyPosition: nextPosition,
      lastSentAt: nowIso,
      nextSendAt: finished
        ? FAR_FUTURE
        : nextSendAfter(nowIso, subscriber.cadence),
      journeyCompletedAt: finished ? nowIso : subscriber.journeyCompletedAt,
    });
    return "sent";
  }

  /** Cron entry point: everything due right now, both cadences, one pass. */
  async function processDueSends(): Promise<
    { subscriberId: string; outcome: BingoEmailSendOutcome }[]
  > {
    const due = await store.listDueSubscribers(now().toISOString());
    const results: { subscriberId: string; outcome: BingoEmailSendOutcome }[] = [];
    for (const subscriber of due) {
      try {
        results.push({
          subscriberId: subscriber.id,
          outcome: await sendNextBatchFor(subscriber),
        });
      } catch {
        results.push({ subscriberId: subscriber.id, outcome: "failed" });
      }
    }
    return results;
  }

  /** Immediate first send after signup (same idempotent pipeline). */
  async function sendDueForSubscriber(
    subscriberId: string,
  ): Promise<BingoEmailSendOutcome | "not-due"> {
    const subscriber = await store.getSubscriberById(subscriberId);
    if (
      !subscriber ||
      subscriber.status !== "active" ||
      subscriber.nextSendAt > now().toISOString()
    ) {
      return "not-due";
    }
    return sendNextBatchFor(subscriber);
  }

  async function viewsFor(subscriber: BingoEmailSubscriber) {
    const order = journeyOrderFor(subscriber);
    const completions = await store.listCompletions(
      subscriber.id,
      subscriber.journeyNumber,
    );
    return {
      order,
      completedIds: new Set(completions.map((c) => c.readingId)),
    };
  }

  async function batchView(token: string): Promise<BingoEmailBatchView | null> {
    const batch = await store.getBatchByToken(token);
    if (!batch) return null;
    const subscriber = await store.getSubscriberById(batch.subscriberId);
    if (!subscriber) return null;

    const { order, completedIds } = await viewsFor(subscriber);
    const sameJourney = batch.journeyNumber === subscriber.journeyNumber;

    const cards = batch.readingIds.map((id) => ({
      ...cardFor(id),
      completed: sameJourney && completedIds.has(id),
    }));

    return {
      setNumber: batch.sequence + 1,
      totalSets: bingoEmailTotalBatches(order.length),
      cards,
      batchCompletedCount: cards.filter((card) => card.completed).length,
      batchSize: cards.length,
      planCompletedCount: sameJourney ? completedIds.size : 0,
      planTotal: order.length,
      allSetsSent: sameJourney && subscriber.journeyPosition >= order.length,
      planFullyCompleted: sameJourney && completedIds.size >= order.length,
    };
  }

  async function setBatchReadingCompletion(
    token: string,
    readingId: unknown,
    completed: unknown,
  ): Promise<BingoEmailBatchView | null> {
    const batch = await store.getBatchByToken(token);
    if (!batch) return null;
    if (
      typeof readingId !== "string" ||
      typeof completed !== "boolean" ||
      !batch.readingIds.includes(readingId)
    ) {
      return null;
    }

    await store.setReadingCompletion(
      {
        subscriberId: batch.subscriberId,
        journeyNumber: batch.journeyNumber,
        readingId,
        batchId: batch.id,
        completedAt: now().toISOString(),
      },
      completed,
    );

    return batchView(token);
  }

  async function manageView(
    manageToken: string,
  ): Promise<BingoEmailManageView | null> {
    const subscriber = await store.getSubscriberByManageToken(manageToken);
    if (!subscriber) return null;

    const { order, completedIds } = await viewsFor(subscriber);
    const latestBatch = await store.latestBatchForSubscriber(subscriber.id);

    return {
      status: subscriber.status,
      cadence: subscriber.cadence,
      setsSent: Math.ceil(subscriber.journeyPosition / BINGO_EMAIL_BATCH_SIZE),
      totalSets: bingoEmailTotalBatches(order.length),
      planCompletedCount: completedIds.size,
      planTotal: order.length,
      allSetsSent: subscriber.journeyPosition >= order.length,
      planFullyCompleted: completedIds.size >= order.length,
      latestBatchToken:
        latestBatch && latestBatch.journeyNumber === subscriber.journeyNumber
          ? latestBatch.token
          : null,
    };
  }

  async function applyManageAction(
    manageToken: string,
    input: BingoEmailManageAction,
  ): Promise<BingoEmailManageView | null> {
    const subscriber = await store.getSubscriberByManageToken(manageToken);
    if (!subscriber) return null;

    const nowIso = now().toISOString();

    if (input.action === "cadence") {
      if (!isBingoEmailCadence(input.cadence)) return null;
      // Same seed, same position — only the send rhythm changes.
      const rescheduled =
        subscriber.nextSendAt === FAR_FUTURE
          ? FAR_FUTURE
          : subscriber.lastSentAt
            ? [nextSendAfter(subscriber.lastSentAt, input.cadence), nowIso]
                .sort()
                .at(-1)!
            : nowIso;
      await store.updateSubscriber(subscriber.id, {
        cadence: input.cadence,
        nextSendAt: rescheduled,
      });
    } else if (input.action === "pause") {
      if (subscriber.status === "active") {
        await store.updateSubscriber(subscriber.id, {
          status: "paused",
          pausedAt: nowIso,
        });
      }
    } else if (input.action === "resume") {
      if (subscriber.status === "paused") {
        await store.updateSubscriber(subscriber.id, {
          status: "active",
          pausedAt: null,
          nextSendAt:
            subscriber.nextSendAt === FAR_FUTURE
              ? FAR_FUTURE
              : subscriber.lastSentAt
                ? [nextSendAfter(subscriber.lastSentAt, subscriber.cadence), nowIso]
                    .sort()
                    .at(-1)!
                : nowIso,
        });
      }
    } else if (input.action === "unsubscribe") {
      if (subscriber.status !== "unsubscribed") {
        await store.updateSubscriber(subscriber.id, {
          status: "unsubscribed",
          unsubscribedAt: nowIso,
        });
      }
    } else if (input.action === "restart") {
      const order = journeyOrderFor(subscriber);
      const finished = subscriber.journeyPosition >= order.length;
      if (subscriber.status === "active" && finished) {
        await store.updateSubscriber(subscriber.id, {
          journeyNumber: subscriber.journeyNumber + 1,
          journeySeed: newBingoEmailToken(),
          journeyPosition: 0,
          journeyCompletedAt: null,
          nextSendAt: nowIso,
        });
      }
    }

    return manageView(manageToken);
  }

  return {
    subscribe,
    processDueSends,
    sendDueForSubscriber,
    batchView,
    setBatchReadingCompletion,
    manageView,
    applyManageAction,
    planTotal,
    totalSets,
  };
}

export type BingoEmailService = ReturnType<typeof createBingoEmailService>;
