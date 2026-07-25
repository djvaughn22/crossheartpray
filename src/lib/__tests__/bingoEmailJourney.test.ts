import { describe, expect, it } from "vitest";
import {
  BINGO_EMAIL_BATCH_SIZE,
  bingoEmailBatchReadingIds,
  bingoEmailCardForReadingId,
  bingoEmailJourneyOrder,
  bingoEmailPlanSize,
  bingoEmailTotalBatches,
} from "../bingoEmail/journey";
import { BIBLE_READING_PLAN_WEEKS } from "../bibleReadingPlan";

describe("bingo email journey order", () => {
  it("uses the existing reading plan as the only source: every plan entry appears exactly once", () => {
    const order = bingoEmailJourneyOrder("seed-a");
    const planSize = bingoEmailPlanSize();

    expect(order).toHaveLength(planSize);
    expect(new Set(order).size).toBe(planSize);
    for (const id of order) {
      expect(bingoEmailCardForReadingId(id)).not.toBeNull();
    }
  });

  it("is deterministic for a seed and different across seeds", () => {
    expect(bingoEmailJourneyOrder("seed-a")).toEqual(
      bingoEmailJourneyOrder("seed-a"),
    );
    expect(bingoEmailJourneyOrder("seed-a")).not.toEqual(
      bingoEmailJourneyOrder("seed-b"),
    );
  });

  it("gives every batch of seven one reading per bingo lane (weekday)", () => {
    const order = bingoEmailJourneyOrder("seed-lanes");
    const totalBatches = bingoEmailTotalBatches(order.length);

    for (let sequence = 0; sequence < totalBatches; sequence += 1) {
      const ids = bingoEmailBatchReadingIds(order, sequence);
      expect(ids).toHaveLength(BINGO_EMAIL_BATCH_SIZE);
      const slugs = ids.map((id) => bingoEmailCardForReadingId(id)!.daySlug);
      expect(new Set(slugs).size).toBe(BINGO_EMAIL_BATCH_SIZE);
    }
  });

  it("never repeats a reading across batches until the whole plan is used", () => {
    const order = bingoEmailJourneyOrder("seed-norepeat");
    const seen = new Set<string>();
    for (let s = 0; s < bingoEmailTotalBatches(order.length); s += 1) {
      for (const id of bingoEmailBatchReadingIds(order, s)) {
        expect(seen.has(id)).toBe(false);
        seen.add(id);
      }
    }
    expect(seen.size).toBe(order.length);
  });

  it("handles a plan not divisible by seven: the final batch holds the remainder", () => {
    const shortWeeks = [
      BIBLE_READING_PLAN_WEEKS[0],
      { week: 2, days: BIBLE_READING_PLAN_WEEKS[1].days.slice(0, 3) },
    ];
    const order = bingoEmailJourneyOrder("seed-short", shortWeeks);

    expect(order).toHaveLength(10);
    expect(bingoEmailBatchReadingIds(order, 0)).toHaveLength(7);
    expect(bingoEmailBatchReadingIds(order, 1)).toHaveLength(3);
    expect(bingoEmailBatchReadingIds(order, 2)).toHaveLength(0);
    expect(bingoEmailTotalBatches(order.length)).toBe(2);
  });

  it("rejects nonsense sequences", () => {
    const order = bingoEmailJourneyOrder("seed-a");
    expect(bingoEmailBatchReadingIds(order, -1)).toHaveLength(0);
    expect(bingoEmailBatchReadingIds(order, 2.5)).toHaveLength(0);
  });

  it("card data links each reading to the existing plan cell", () => {
    const card = bingoEmailCardForReadingId("week-1-monday");
    expect(card).not.toBeNull();
    expect(card!.reading).toBe("Gen 1-3");
    expect(card!.category).toBe("The Law");
    expect(card!.planHref).toBe(
      "/bible-reading-plan?week=1&day=monday#week-1-monday",
    );
    expect(bingoEmailCardForReadingId("week-99-nope")).toBeNull();
  });
});
