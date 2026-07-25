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

// 2026-07-24T12:00Z is FRIDAY morning in America/Chicago;
// 2026-07-22T12:00Z is WEDNESDAY. Deterministic fixtures throughout.
const FRIDAY = "2026-07-24T12:00:00.000Z";
const WEDNESDAY = "2026-07-22T12:00:00.000Z";

// Deterministic fixture: 10 readings → one full week + Week 2 Sun/Mon/Tue.
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

function makeHarness(planWeeks = SHORT_WEEKS, startIso = FRIDAY): Harness {
  const store = createMemoryBingoEmailStore();
  const sent: BingoEmailMessage[] = [];
  let nowMs = Date.parse(startIso);
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

async function subscribeAndSend(
  h: Harness,
  email = "reader@example.com",
  cadence: "weekly" | "daily" = "weekly",
) {
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

describe("weekly cadence: seven readings, one complete plan week", () => {
  it("creates exactly seven readings per batch — a full plan week", async () => {
    const h = makeHarness();
    const id = await subscribeAndSend(h);
    const batch = (await h.store.latestBatchForSubscriber(id))!;
    expect(batch.readingIds).toHaveLength(7);
    // Friday start: complete Week 1, rotated Friday-first.
    expect(batch.readingIds[0]).toBe("week-1-friday");
    expect(new Set(batch.readingIds.map((r) => r.replace(/-[a-z]+$/, ""))).size).toBe(1);
  });

  it("sends the next batch only after seven days", async () => {
    const h = makeHarness();
    await subscribeAndSend(h);
    expect(h.sent).toHaveLength(1);
    h.advance(6 * DAY_MS);
    expect(await h.service.processDueSends()).toHaveLength(0);
    h.advance(1 * DAY_MS);
    expect((await h.service.processDueSends()).map((r) => r.outcome)).toEqual(["sent"]);
    expect(h.sent).toHaveLength(2);
  });

  it("weekly email carries seven HTML cards and the Bible Bingo 7 batch link", async () => {
    const h = makeHarness();
    const id = await subscribeAndSend(h);
    const batch = (await h.store.latestBatchForSubscriber(id))!;
    expect((h.sent[0].html.match(/Card \d ·/g) ?? [])).toHaveLength(7);
    expect(h.sent[0].subject).toContain("Your Bible Bingo 7");
    expect(h.sent[0].html).toContain(`/explorebible?batch=${batch.token}`);
  });

  it("the final short batch delivers the remainder, then the journey completes", async () => {
    const h = makeHarness();
    const id = await subscribeAndSend(h);
    h.advance(7 * DAY_MS);
    await h.service.processDueSends();
    const sub = (await h.store.getSubscriberById(id))!;
    expect(sub.journeyPosition).toBe(10);
    const latest = (await h.store.latestBatchForSubscriber(id))!;
    expect(latest.readingIds).toHaveLength(3);
    h.advance(365 * DAY_MS);
    expect(await h.service.processDueSends()).toHaveLength(0);
    expect((await h.store.getSubscriberById(id))!.journeyCompletedAt).not.toBeNull();
  });
});

describe("daily cadence: one canonical reading per day", () => {
  it("creates exactly one reading per batch and one HTML card per email", async () => {
    const h = makeHarness();
    const id = await subscribeAndSend(h, "reader@example.com", "daily");
    const batch = (await h.store.latestBatchForSubscriber(id))!;
    expect(batch.readingIds).toHaveLength(1);
    expect(h.sent[0].subject).toContain("Today's Bible Reading");
    expect((h.sent[0].html.match(/Open Today&#39;s Reading/g) ?? [])).toHaveLength(1);
    expect((h.sent[0].html.match(/Week \d+ ·/g) ?? [])).toHaveLength(1);
  });

  it("a Friday signup starts with Week 1 Friday; Wednesday starts with Week 1 Wednesday", async () => {
    const friday = makeHarness(SHORT_WEEKS, FRIDAY);
    const fridayId = await subscribeAndSend(friday, "f@example.com", "daily");
    expect((await friday.store.latestBatchForSubscriber(fridayId))!.readingIds).toEqual([
      "week-1-friday",
    ]);

    const wednesday = makeHarness(SHORT_WEEKS, WEDNESDAY);
    const wednesdayId = await subscribeAndSend(wednesday, "w@example.com", "daily");
    expect(
      (await wednesday.store.latestBatchForSubscriber(wednesdayId))!.readingIds,
    ).toEqual(["week-1-wednesday"]);

    const monday = makeHarness(SHORT_WEEKS, "2026-07-20T12:00:00.000Z");
    const mondayId = await subscribeAndSend(monday, "m@example.com", "daily");
    expect((await monday.store.latestBatchForSubscriber(mondayId))!.readingIds).toEqual([
      "week-1-monday",
    ]);
  });

  it("a Wednesday start rotates Wed→Tue and only then enters Week 2", async () => {
    const h = makeHarness(BIBLE_READING_PLAN_WEEKS, WEDNESDAY);
    await subscribeAndSend(h, "reader@example.com", "daily");
    for (let day = 0; day < 7; day += 1) {
      h.advance(DAY_MS);
      await h.service.processDueSends();
    }
    const delivered = h.sent.map(
      (message) => message.text.match(/Week (\d+), (\w+)/)!.slice(1).join("-"),
    );
    expect(delivered).toEqual([
      "1-Wednesday",
      "1-Thursday",
      "1-Friday",
      "1-Saturday",
      "1-Sunday",
      "1-Monday",
      "1-Tuesday",
      "2-Wednesday",
    ]);
  });

  it("daily link opens the exact Bible Reading Plan entry with the batch token", async () => {
    const h = makeHarness(SHORT_WEEKS, WEDNESDAY);
    const id = await subscribeAndSend(h, "reader@example.com", "daily");
    const batch = (await h.store.latestBatchForSubscriber(id))!;
    const expected = `/bible-reading-plan?week=1&day=wednesday&bingoBatch=${batch.token}#week-1-wednesday`;
    expect(h.sent[0].html).toContain(expected);
    expect(h.sent[0].text).toContain(expected);
  });

  it("delivers all readings exactly once — none skipped, none duplicated", async () => {
    const h = makeHarness(SHORT_WEEKS, WEDNESDAY);
    const id = await subscribeAndSend(h, "reader@example.com", "daily");
    for (let day = 0; day < 12; day += 1) {
      h.advance(DAY_MS);
      await h.service.processDueSends();
    }
    expect(h.sent).toHaveLength(10);
    const allBatches: string[] = [];
    for (let position = 0; position < 10; position += 1) {
      const batch = await h.store.getBatchByIdempotencyKey(`${id}:j1:p${position}`);
      expect(batch).not.toBeNull();
      allBatches.push(...batch!.readingIds);
    }
    expect(new Set(allBatches).size).toBe(10);
    expect((await h.store.getSubscriberById(id))!.journeyPosition).toBe(10);
  });

  it("full real plan: 364 daily sends cover the whole plan exactly once", async () => {
    const h = makeHarness(BIBLE_READING_PLAN_WEEKS, WEDNESDAY);
    const id = await subscribeAndSend(h, "reader@example.com", "daily");
    for (let day = 0; day < 370; day += 1) {
      h.advance(DAY_MS);
      await h.service.processDueSends();
    }
    expect(h.sent).toHaveLength(364);
    const sub = (await h.store.getSubscriberById(id))!;
    expect(sub.journeyPosition).toBe(364);
    expect(sub.journeyCompletedAt).not.toBeNull();
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
    await h.store.updateSubscriber(id, {
      journeyPosition: 0,
      nextSendAt: "2020-01-01T00:00:00.000Z",
    });
    const results = await h.service.processDueSends();
    expect(results.map((r) => r.outcome)).toEqual(["already-sent"]);
    expect(h.sent).toHaveLength(1);
  });

  it("a failed weekly send retries the SAME saved seven-card batch", async () => {
    const h = makeHarness();
    const result = await h.service.subscribe({
      email: "reader@example.com",
      consent: true,
    });
    if (!result.ok) throw new Error("unreachable");

    h.failNextSend();
    expect(await h.service.sendDueForSubscriber(result.subscriberId)).toBe("failed");
    const failedBatch = (await h.store.latestBatchForSubscriber(result.subscriberId))!;
    expect(failedBatch.sendStatus).toBe("failed");
    expect(failedBatch.readingIds).toHaveLength(7);

    const retry = await h.service.processDueSends();
    expect(retry.map((r) => r.outcome)).toEqual(["sent"]);
    const sentBatch = (await h.store.latestBatchForSubscriber(result.subscriberId))!;
    expect(sentBatch.token).toBe(failedBatch.token);
    expect(sentBatch.readingIds).toEqual(failedBatch.readingIds);
    expect(h.sent).toHaveLength(1);
  });

  it("a failed daily send retries the SAME saved one-reading card", async () => {
    const h = makeHarness(SHORT_WEEKS, WEDNESDAY);
    const result = await h.service.subscribe({
      email: "reader@example.com",
      cadence: "daily",
      consent: true,
    });
    if (!result.ok) throw new Error("unreachable");

    h.failNextSend();
    expect(await h.service.sendDueForSubscriber(result.subscriberId)).toBe("failed");
    const failedBatch = (await h.store.latestBatchForSubscriber(result.subscriberId))!;
    expect(failedBatch.readingIds).toEqual(["week-1-wednesday"]);

    const retry = await h.service.processDueSends();
    expect(retry.map((r) => r.outcome)).toEqual(["sent"]);
    const sentBatch = (await h.store.latestBatchForSubscriber(result.subscriberId))!;
    expect(sentBatch.token).toBe(failedBatch.token);
    expect(sentBatch.readingIds).toEqual(["week-1-wednesday"]);
    expect((await h.store.getSubscriberById(result.subscriberId))!.journeyPosition).toBe(1);
  });
});

describe("the emailed batch and the pages render the same cards", () => {
  it("weekly email carries the batch token and exactly the saved readings", async () => {
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
      await h.service.setBatchReadingCompletion(batch.token, "week-9-nope", true),
    ).toBeNull();
    expect(
      await h.service.setBatchReadingCompletion("bad-token", batch.readingIds[0], true),
    ).toBeNull();
  });
});

describe("manage: cadence, pause, resume, unsubscribe, restart", () => {
  async function manageTokenFor(h: Harness, id: string) {
    return (await h.store.getSubscriberById(id))!.manageToken;
  }

  it("switching cadence preserves completed readings, position, and rotation — no dupes or gaps", async () => {
    const h = makeHarness(BIBLE_READING_PLAN_WEEKS, WEDNESDAY);
    const id = await subscribeAndSend(h, "reader@example.com", "daily");
    for (let day = 0; day < 2; day += 1) {
      h.advance(DAY_MS);
      await h.service.processDueSends();
    }
    // Three daily readings delivered: W1 Wed, Thu, Fri. Mark one complete.
    const before = (await h.store.getSubscriberById(id))!;
    expect(before.journeyPosition).toBe(3);
    const firstBatch = (await h.store.getBatchByIdempotencyKey(`${id}:j1:p0`))!;
    await h.service.setBatchReadingCompletion(
      firstBatch.token,
      "week-1-wednesday",
      true,
    );

    const view = await h.service.applyManageAction(before.manageToken, {
      action: "cadence",
      cadence: "weekly",
    });
    expect(view!.cadence).toBe("weekly");
    expect(view!.planCompletedCount).toBe(1);

    const after = (await h.store.getSubscriberById(id))!;
    expect(after.journeyPosition).toBe(3);
    expect(after.startDaySlug).toBe("wednesday");

    // Next weekly batch continues from position 3 — Sat, Sun, Mon, Tue of
    // Week 1 plus the start of Week 2. Nothing repeated, nothing skipped.
    h.advance(7 * DAY_MS);
    await h.service.processDueSends();
    const weeklyBatch = (await h.store.latestBatchForSubscriber(id))!;
    expect(weeklyBatch.readingIds).toEqual([
      "week-1-saturday",
      "week-1-sunday",
      "week-1-monday",
      "week-1-tuesday",
      "week-2-wednesday",
      "week-2-thursday",
      "week-2-friday",
    ]);
  });

  it("pausing stops sends without losing progress; resuming continues at the same position", async () => {
    const h = makeHarness(SHORT_WEEKS, WEDNESDAY);
    const id = await subscribeAndSend(h, "reader@example.com", "daily");
    const token = await manageTokenFor(h, id);

    await h.service.applyManageAction(token, { action: "pause" });
    h.advance(10 * DAY_MS);
    expect(await h.service.processDueSends()).toHaveLength(0);
    expect(h.sent).toHaveLength(1);

    const resumed = await h.service.applyManageAction(token, { action: "resume" });
    expect(resumed!.status).toBe("active");
    await h.service.processDueSends();
    expect(h.sent).toHaveLength(2);
    // Next unfinished reading, weekday rotation preserved from the start
    // anchor — coverage over calendar alignment.
    const latest = (await h.store.latestBatchForSubscriber(id))!;
    expect(latest.readingIds).toEqual(["week-1-thursday"]);
    expect((await h.store.getSubscriberById(id))!.journeyPosition).toBe(2);
  });

  it("unsubscribing stops sends; resubscribing keeps the journey", async () => {
    const h = makeHarness();
    const id = await subscribeAndSend(h);
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
    expect((await h.store.getSubscriberById(id))!.journeyPosition).toBe(7);
  });

  it("restart is only offered after the plan is finished and re-anchors the weekday", async () => {
    const h = makeHarness();
    const id = await subscribeAndSend(h);
    const token = await manageTokenFor(h, id);

    await h.service.applyManageAction(token, { action: "restart" });
    expect((await h.store.getSubscriberById(id))!.journeyNumber).toBe(1);

    h.advance(7 * DAY_MS);
    await h.service.processDueSends();
    const done = await h.service.manageView(token);
    expect(done!.allSetsSent).toBe(true);

    await h.service.applyManageAction(token, { action: "restart" });
    const restarted = (await h.store.getSubscriberById(id))!;
    expect(restarted.journeyNumber).toBe(2);
    expect(restarted.journeyPosition).toBe(0);
    expect(restarted.startDaySlug).toBeNull();

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
