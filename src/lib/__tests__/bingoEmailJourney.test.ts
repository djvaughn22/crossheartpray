import { describe, expect, it } from "vitest";
import {
  BINGO_EMAIL_WEEKDAY_SLUGS,
  bingoEmailBatchReadingIdsAt,
  bingoEmailBatchSizeForCadence,
  bingoEmailCardForReadingId,
  bingoEmailJourneyOrder,
  bingoEmailPlanSize,
  bingoEmailTotalBatches,
  bingoEmailWeekdaySlugFor,
} from "../bingoEmail/journey";
import { BIBLE_READING_PLAN_WEEKS } from "../bibleReadingPlan";

describe("canonical journey order", () => {
  it("covers every plan reading exactly once for every start weekday", () => {
    const planSize = bingoEmailPlanSize();
    for (const start of BINGO_EMAIL_WEEKDAY_SLUGS) {
      const order = bingoEmailJourneyOrder(start);
      expect(order).toHaveLength(planSize);
      expect(new Set(order).size).toBe(planSize);
    }
  });

  it("starts on the subscriber's weekday: Monday, Wednesday, Friday", () => {
    expect(bingoEmailJourneyOrder("monday")[0]).toBe("week-1-monday");
    expect(bingoEmailJourneyOrder("wednesday")[0]).toBe("week-1-wednesday");
    expect(bingoEmailJourneyOrder("friday")[0]).toBe("week-1-friday");
  });

  it("a Wednesday start rotates Wednesday through Tuesday, then Week 2 Wednesday", () => {
    const order = bingoEmailJourneyOrder("wednesday");
    expect(order.slice(0, 8)).toEqual([
      "week-1-wednesday",
      "week-1-thursday",
      "week-1-friday",
      "week-1-saturday",
      "week-1-sunday",
      "week-1-monday",
      "week-1-tuesday",
      "week-2-wednesday",
    ]);
  });

  it("increments the plan week only after all seven weekday readings", () => {
    const order = bingoEmailJourneyOrder("friday");
    const weekOf = (id: string) => Number(id.match(/^week-(\d+)-/)![1]);
    for (let position = 0; position < order.length; position += 1) {
      expect(weekOf(order[position])).toBe(Math.floor(position / 7) + 1);
    }
  });

  it("keeps canonical plan weeks: each group of seven is one complete week", () => {
    const order = bingoEmailJourneyOrder("wednesday");
    for (let week = 0; week < order.length / 7; week += 1) {
      const slice = order.slice(week * 7, week * 7 + 7);
      const slugs = slice.map((id) => id.replace(/^week-\d+-/, ""));
      expect([...slugs].sort()).toEqual([...BINGO_EMAIL_WEEKDAY_SLUGS].sort());
    }
  });

  it("batch sizes follow cadence: Weekly seven, Daily one", () => {
    expect(bingoEmailBatchSizeForCadence("weekly")).toBe(7);
    expect(bingoEmailBatchSizeForCadence("daily")).toBe(1);
  });

  it("slices batches by position, with a short final remainder", () => {
    const shortWeeks = [
      BIBLE_READING_PLAN_WEEKS[0],
      { week: 2, days: BIBLE_READING_PLAN_WEEKS[1].days.slice(0, 3) },
    ];
    const order = bingoEmailJourneyOrder("wednesday", shortWeeks);
    expect(order).toHaveLength(10);
    expect(bingoEmailBatchReadingIdsAt(order, 0, 7)).toHaveLength(7);
    expect(bingoEmailBatchReadingIdsAt(order, 7, 7)).toHaveLength(3);
    expect(bingoEmailBatchReadingIdsAt(order, 3, 1)).toEqual([order[3]]);
    expect(bingoEmailBatchReadingIdsAt(order, 10, 7)).toHaveLength(0);
    expect(bingoEmailBatchReadingIdsAt(order, -1, 7)).toHaveLength(0);
    expect(bingoEmailTotalBatches(order.length)).toBe(2);
  });

  it("resolves weekdays in America/Chicago (the documented default timezone)", () => {
    // 2026-07-22T12:00Z is Wednesday morning in Chicago;
    // 2026-07-23T03:00Z is still Wednesday EVENING there (Thursday UTC).
    expect(bingoEmailWeekdaySlugFor(new Date("2026-07-22T12:00:00.000Z"))).toBe(
      "wednesday",
    );
    expect(bingoEmailWeekdaySlugFor(new Date("2026-07-23T03:00:00.000Z"))).toBe(
      "wednesday",
    );
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
