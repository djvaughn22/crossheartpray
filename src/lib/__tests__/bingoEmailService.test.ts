import { beforeEach, describe, expect, it } from "vitest";
import { BIBLE_READING_PLAN_WEEKS } from "../bibleReadingPlan";
import { createMemoryBingoEmailStore, type BingoEmailStore } from "../bingoEmail/store";
import type { BingoEmailMessage } from "../bingoEmail/mailer";
import {
  createBingoEmailService,
  normalizeBingoEmailAddress,
  type BingoEmailService,
} from "../bingoEmail/service";

const DAY_MS = 24 * 60 * 60 * 1000;

// Deterministic fixture: 10 readings → one full batch of 7, one final of 3.
const SHORT_WEEKS = [
  BIBLE_READING_PLAN_WEEKS[0],
  { week: 2, days: BIBLE_READING_PLAN_WEEKS[1].days.slice(0, 3) },
];

type Harness = {
  store: BingoEmailStore;
  service: BingoEmailService;
  sent: BingoEmailMessage[];
  advance: (ms: number) => void;
  failNextSend: () => void;
};

function makeHarness(planWeeks = SHORT_WEEKS): Harness {
  const store = createMemoryBingoEmailStore();
  const sent: BingoEmailMessage[] = [];
  let nowMs = Date.parse("2026-07-24T12:00:00.000Z");
  let failNext = false;

  const service = createBingoEmailService({
    store,
    planWeeks,
    baseUrl: "https://crossheartpray.com",
    now: () => new Date(nowMs),
    sendEmail: async (message) => {
      if (failNext) {
        failNext = false;
        throw new Error("provider down");
      }
      sent.push(message);
    },
  });

  return {
    store,
    service,
    sent,
    advance: (ms) => {
      nowMs += ms;
    },
    failNextSend: () => {
      failNext = true;
    },
  };
}

async function subscribeAndSend(h: Harness, email = "reader@example.com", cadence = "weekly") {
  const result = await h.service.subscribe({ email, cadence, consent: true });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("unreachable");
  await h.service.sendDueForSubscriber(result.subscriberId);
  return result.subscriberId;
}

describe("signup validation", () => {
  let h: Harness;
  beforeEach(() => {
    h = makeHarness();
  });

  it("requires consent", async () => {
    const result = await h.service.subscribe({
      email: "a@example.com",
      consent: false,
    });
    expect(result).toEqual({ ok: false, error: "consent-required" });
  });

  it("rejects invalid emails", async () => {
    for (const bad of ["", "nope", "a@b", "two@@example.com", "a b@example.com"]) {
      const result = await h.service.subscribe({ email: bad, consent: true });
      expect(result.ok).toBe(false);
    }
  });

  it("rejects unknown cadence and defaults to weekly when omitted", async () => {
    const bad = await h.service.subscribe({
      email: "a@example.com",
      cadence: "hourly",
      consent: true,
    });
    expect(bad).toEqual({ ok: false, error: "invalid-cadence" });

    const ok = await h.service.subscribe({ email: "a@example.com", consent: true });
    expect(ok.ok).toBe(true);
    const sub = await h.store.getSubscriberByEmail("a@example.com");
    expect(sub?.cadence).toBe("weekly");
  });

  it("normalizes addresses so case/whitespace variants are one subscriber", async () => {
    expect(normalizeBingoEmailAddress("  Reader@Example.COM ")).toBe(
      "reader@example.com",
    );
    await h.service.subscribe({ email: "Reader@Example.com", consent: true });
    const again = await h.service.subscribe({
      email: "  reader@example.COM ",
      consent: true,
    });
    expect(again.ok && again.outcome === "already-subscribed").toBe(true);
  });
});

describe("sending and cadence", () => {
  it("weekly: one batch immediately, the next only after seven days", async () => {
    const h = makeHarness();
    await subscribeAndSend(h);
    expect(h.sent).toHaveLength(1);

    expect(await h.service.processDueSends()).toHaveLength(0);
    h.advance(6 * DAY_MS);
    expect(await h.service.processDueSends()).toHaveLength(0);
    h.advance(1 * DAY_MS);
    const results = await h.service.processDueSends();
    expect(results.map((r) => r.outcome)).toEqual(["sent"]);
    expect(h.sent).toHaveLength(2);
  });

  it("daily: the next batch is due after one day", async () => {
    const h = makeHarness();
    await subscribeAndSend(h, "reader@example.com", "daily");
    expect(h.sent).toHaveLength(1);
    h.advance(1 * DAY_MS);
    await h.service.processDueSends();
    expect(h.sent).toHaveLength(2);
  });

  it("each email holds seven unique readings and the final batch holds the remainder", async () => {
    const h = makeHarness();
    const id = await subscribeAndSend(h, "reader@example.com", "daily");
    h.advance(DAY_MS);
    await h.service.processDueSends();

    const sub = (await h.store.getSubscriberById(id))!;
    expect(sub.journeyPosition).toBe(10);

    const latest = (await h.store.latestBatchForSubscriber(id))!;
    expect(latest.sequence).toBe(1);
    expect(latest.readingIds).toHaveLength(3);

    // Nothing repeated across the two batches; whole plan used.
    const first = (await h.store.getBatchByIdempotencyKey(`${id}:j1:s0`))!;
    expect(first.readingIds).toHaveLength(7);
    const all = [...first.readingIds, ...latest.readingIds];
    expect(new Set(all).size).toBe(10);
  });

  it("after the plan is used up, the journey completes and no more email goes out", async () => {
    const h = makeHarness();
    const id = await subscribeAndSend(h, "reader@example.com", "daily");
    h.advance(DAY_MS);
    await h.service.processDueSends();
    // The final send marks the journey complete on the spot — the
    // subscriber is never due again until a fresh journey begins.
    h.advance(DAY_MS);
    expect(await h.service.processDueSends()).toHaveLength(0);
    expect(h.sent).toHaveLength(2);
    h.advance(365 * DAY_MS);
    expect(await h.service.processDueSends()).toHaveLength(0);
    const sub = (await h.store.getSubscriberById(id))!;
    expect(sub.journeyCompletedAt).not.toBeNull();
  });

  it("full real plan: 52 sends cover all 364 readings with no repeats", async () => {
    const h = makeHarness(BIBLE_READING_PLAN_WEEKS);
    const id = await subscribeAndSend(h, "reader@example.com", "daily");
    for (let day = 0; day < 60; day += 1) {
      h.advance(DAY_MS);
      await h.service.processDueSends();
    }
    expect(h.sent).toHaveLength(52);
    const sub = (await h.store.getSubscriberById(id))!;
    expect(sub.journeyPosition).toBe(364);
  });
});

describe("duplicate and retry protection", () => {
  it("a duplicate cron run cannot send a second email", async () => {
    const h = makeHarness();
    await subscribeAndSend(h);
    await h.service.processDueSends();
    await h.service.processDueSends();
    expect(h.sent).toHaveLength(1);
  });

  it("a stale due snapshot hits the already-sent guard instead of re-sending", async () => {
    const h = makeHarness();
    const id = await subscribeAndSend(h);
    // Force the subscriber to look due again without clearing the sent batch.
    await h.store.updateSubscriber(id, {
      journeyPosition: 0,
      nextSendAt: "2020-01-01T00:00:00.000Z",
    });
    const results = await h.service.processDueSends();
    expect(results.map((r) => r.outcome)).toEqual(["already-sent"]);
    expect(h.sent).toHaveLength(1);
  });

  it("a failed send retries the SAME saved batch — same token, same readings", async () => {
    const h = makeHarness();
    const result = await h.service.subscribe({
      email: "reader@example.com",
      consent: true,
    });
    if (!result.ok) throw new Error("unreachable");

    h.failNextSend();
    expect(await h.service.sendDueForSubscriber(result.subscriberId)).toBe("failed");
    expect(h.sent).toHaveLength(0);

    const failedBatch = (await h.store.latestBatchForSubscriber(result.subscriberId))!;
    expect(failedBatch.sendStatus).toBe("failed");
    expect(failedBatch.lastError).toContain("provider down");

    // Still due — the retry reuses the identical batch.
    const retry = await h.service.processDueSends();
    expect(retry.map((r) => r.outcome)).toEqual(["sent"]);
    const sentBatch = (await h.store.latestBatchForSubscriber(result.subscriberId))!;
    expect(sentBatch.token).toBe(failedBatch.token);
    expect(sentBatch.readingIds).toEqual(failedBatch.readingIds);
    expect(h.sent).toHaveLength(1);
    expect(h.sent[0].html).toContain(failedBatch.token);
  });
});

describe("the emailed batch and the Bible Bingo 7 page render the same cards", () => {
  it("email html carries the batch token and exactly the saved readings", async () => {
    const h = makeHarness();
    const id = await subscribeAndSend(h);
    const batch = (await h.store.latestBatchForSubscriber(id))!;
    const view = (await h.service.batchView(batch.token))!;

    expect(view.cards.map((c) => c.id)).toEqual(batch.readingIds);
    expect(h.sent[0].html).toContain(`/explorebible?batch=${batch.token}`);
    for (const card of view.cards) {
      expect(h.sent[0].html).toContain(card.reading);
      expect(h.sent[0].text).toContain(card.reading);
      expect(card.planHref).toContain(
        `/bible-reading-plan?week=${card.week}&day=${card.daySlug}`,
      );
    }
  });

  it("batch view repeats identically on refresh and rejects unknown tokens", async () => {
    const h = makeHarness();
    const id = await subscribeAndSend(h);
    const batch = (await h.store.latestBatchForSubscriber(id))!;
    const first = await h.service.batchView(batch.token);
    const second = await h.service.batchView(batch.token);
    expect(second).toEqual(first);
    expect(await h.service.batchView("not-a-real-token")).toBeNull();
  });

  it("completion marks persist server-side and only accept the batch's readings", async () => {
    const h = makeHarness();
    const id = await subscribeAndSend(h);
    const batch = (await h.store.latestBatchForSubscriber(id))!;

    const updated = await h.service.setBatchReadingCompletion(
      batch.token,
      batch.readingIds[0],
      true,
    );
    expect(updated!.batchCompletedCount).toBe(1);
    expect(updated!.planCompletedCount).toBe(1);
    expect(
      updated!.cards.find((c) => c.id === batch.readingIds[0])!.completed,
    ).toBe(true);

    expect(
      await h.service.setBatchReadingCompletion(batch.token, "week-1-sunday-nope", true),
    ).toBeNull();
    expect(
      await h.service.setBatchReadingCompletion("bad-token", batch.readingIds[0], true),
    ).toBeNull();

    const cleared = await h.service.setBatchReadingCompletion(
      batch.token,
      batch.readingIds[0],
      false,
    );
    expect(cleared!.batchCompletedCount).toBe(0);
  });
});

describe("manage: cadence, pause, resume, unsubscribe, restart", () => {
  async function manageTokenFor(h: Harness, id: string) {
    return (await h.store.getSubscriberById(id))!.manageToken;
  }

  it("switching cadence keeps the same journey order and position", async () => {
    const h = makeHarness();
    const id = await subscribeAndSend(h);
    const before = (await h.store.getSubscriberById(id))!;
    const token = before.manageToken;

    const view = await h.service.applyManageAction(token, {
      action: "cadence",
      cadence: "daily",
    });
    expect(view!.cadence).toBe("daily");

    const after = (await h.store.getSubscriberById(id))!;
    expect(after.journeySeed).toBe(before.journeySeed);
    expect(after.journeyPosition).toBe(before.journeyPosition);

    // Next batch continues the same order (batch 2 of the same journey).
    h.advance(DAY_MS);
    await h.service.processDueSends();
    const latest = (await h.store.latestBatchForSubscriber(id))!;
    expect(latest.sequence).toBe(1);
    expect(h.sent).toHaveLength(2);
  });

  it("pausing stops sends without losing progress; resuming picks back up", async () => {
    const h = makeHarness();
    const id = await subscribeAndSend(h, "reader@example.com", "daily");
    const token = await manageTokenFor(h, id);

    await h.service.applyManageAction(token, { action: "pause" });
    h.advance(10 * DAY_MS);
    expect(await h.service.processDueSends()).toHaveLength(0);
    expect(h.sent).toHaveLength(1);

    const resumed = await h.service.applyManageAction(token, { action: "resume" });
    expect(resumed!.status).toBe("active");
    expect(await h.service.processDueSends()).toHaveLength(1);
    expect(h.sent).toHaveLength(2);
    const sub = (await h.store.getSubscriberById(id))!;
    expect(sub.journeyPosition).toBe(10);
  });

  it("unsubscribing stops sends; resubscribing keeps the journey", async () => {
    const h = makeHarness();
    const id = await subscribeAndSend(h, "reader@example.com", "daily");
    const token = await manageTokenFor(h, id);

    const view = await h.service.applyManageAction(token, { action: "unsubscribe" });
    expect(view!.status).toBe("unsubscribed");
    h.advance(10 * DAY_MS);
    expect(await h.service.processDueSends()).toHaveLength(0);
    expect(h.sent).toHaveLength(1);

    const back = await h.service.subscribe({
      email: "reader@example.com",
      cadence: "weekly",
      consent: true,
    });
    expect(back.ok && back.outcome === "resubscribed").toBe(true);
    const sub = (await h.store.getSubscriberById(id))!;
    expect(sub.journeyPosition).toBe(7);
  });

  it("restart is only offered after the plan is finished and starts a fresh order", async () => {
    const h = makeHarness();
    const id = await subscribeAndSend(h, "reader@example.com", "daily");
    const token = await manageTokenFor(h, id);
    const originalSeed = (await h.store.getSubscriberById(id))!.journeySeed;

    // Not finished yet — restart is a no-op.
    await h.service.applyManageAction(token, { action: "restart" });
    expect((await h.store.getSubscriberById(id))!.journeyNumber).toBe(1);

    h.advance(DAY_MS);
    await h.service.processDueSends();
    const done = await h.service.manageView(token);
    expect(done!.allSetsSent).toBe(true);

    await h.service.applyManageAction(token, { action: "restart" });
    const restarted = (await h.store.getSubscriberById(id))!;
    expect(restarted.journeyNumber).toBe(2);
    expect(restarted.journeyPosition).toBe(0);
    expect(restarted.journeySeed).not.toBe(originalSeed);

    expect(await h.service.processDueSends()).toHaveLength(1);
    expect(h.sent).toHaveLength(3);
  });

  it("manage views require a valid manage token", async () => {
    const h = makeHarness();
    await subscribeAndSend(h);
    expect(await h.service.manageView("wrong-token")).toBeNull();
    expect(
      await h.service.applyManageAction("wrong-token", { action: "pause" }),
    ).toBeNull();
  });
});
