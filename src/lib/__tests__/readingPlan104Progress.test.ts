// @vitest-environment jsdom
//
// The two pacings keep two completely separate progress tracks. The point of
// these tests is the promise made to people who already use the plan: adding
// the 2-year option must not read, rewrite, or erase a single day of the
// 1-year progress they already have.
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  READING_PLAN_104_PROGRESS_KEY,
  completedReadingPlan104EntryIds,
  loadReadingPlan104Progress,
  normalizeReadingPlan104EntryId,
  saveReadingPlan104Progress,
  subscribeToReadingPlan104Progress,
} from "../readingPlan104Progress";
import {
  READING_PLAN_PROGRESS_KEY_V1,
  READING_PLAN_PROGRESS_KEY_V2,
  completedReadingPlanEntryIds,
  loadReadingPlanProgress,
  saveReadingPlanProgress,
} from "../readingPlanProgress";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("104-week progress storage", () => {
  it("uses its own key and never writes the canonical annual keys", () => {
    saveReadingPlan104Progress({ "week-99-friday": true });

    expect(window.localStorage.getItem(READING_PLAN_104_PROGRESS_KEY)).toContain(
      "week-99-friday",
    );
    expect(window.localStorage.getItem(READING_PLAN_PROGRESS_KEY_V1)).toBeNull();
    expect(window.localStorage.getItem(READING_PLAN_PROGRESS_KEY_V2)).toBeNull();
  });

  it("accepts weeks 1 through 104 and rejects everything else", () => {
    expect(normalizeReadingPlan104EntryId("week-1-sunday")).toBe("week-1-sunday");
    expect(normalizeReadingPlan104EntryId("Week-053-Friday")).toBe("week-53-friday");
    expect(normalizeReadingPlan104EntryId("week-104-saturday")).toBe("week-104-saturday");

    expect(normalizeReadingPlan104EntryId("week-105-sunday")).toBeNull();
    expect(normalizeReadingPlan104EntryId("week-0-sunday")).toBeNull();
    expect(normalizeReadingPlan104EntryId("week-3-someday")).toBeNull();
    expect(normalizeReadingPlan104EntryId("nonsense")).toBeNull();
  });

  it("survives corrupt storage without throwing", () => {
    window.localStorage.setItem(READING_PLAN_104_PROGRESS_KEY, "{not json");
    expect(loadReadingPlan104Progress()).toEqual({});
  });

  it("notifies subscribers when progress is saved", () => {
    const seen: number[] = [];
    const unsubscribe = subscribeToReadingPlan104Progress((progress) => {
      seen.push(Object.keys(progress).length);
    });

    // Subscribing hydrates immediately, then follows saves.
    expect(seen).toEqual([0]);
    saveReadingPlan104Progress({ "week-8-monday": true });
    expect(seen).toEqual([0, 1]);

    unsubscribe();
    saveReadingPlan104Progress({ "week-8-monday": true, "week-9-monday": true });
    expect(seen).toEqual([0, 1]);
  });
});

describe("the two pacings never touch each other", () => {
  it("holds week 20 of the 1-year plan and week 8 of the 2-year plan at once", () => {
    saveReadingPlanProgress({ "week-20-wednesday": true });
    saveReadingPlan104Progress({ "week-8-tuesday": true });

    expect(completedReadingPlanEntryIds()).toEqual(new Set(["week-20-wednesday"]));
    expect(completedReadingPlan104EntryIds()).toEqual(new Set(["week-8-tuesday"]));
  });

  it("does not let a 2-year save disturb existing 1-year progress", () => {
    saveReadingPlanProgress({
      "week-20-wednesday": true,
      "week-21-sunday": true,
    });
    const before = window.localStorage.getItem(READING_PLAN_PROGRESS_KEY_V2);

    saveReadingPlan104Progress({ "week-8-tuesday": true, "week-77-friday": true });

    expect(window.localStorage.getItem(READING_PLAN_PROGRESS_KEY_V2)).toBe(before);
    expect(loadReadingPlanProgress()).toEqual({
      "week-20-wednesday": true,
      "week-21-sunday": true,
    });
  });

  it("does not let a 1-year save disturb existing 2-year progress", () => {
    saveReadingPlan104Progress({ "week-8-tuesday": true, "week-104-saturday": true });
    const before = window.localStorage.getItem(READING_PLAN_104_PROGRESS_KEY);

    saveReadingPlanProgress({ "week-20-wednesday": true });

    expect(window.localStorage.getItem(READING_PLAN_104_PROGRESS_KEY)).toBe(before);
    expect(loadReadingPlan104Progress()).toEqual({
      "week-8-tuesday": true,
      "week-104-saturday": true,
    });
  });

  it("leaves pre-existing 1-year progress readable when the 2-year track is empty", () => {
    // A returning reader: their saved progress predates this feature entirely.
    window.localStorage.setItem(
      READING_PLAN_PROGRESS_KEY_V1,
      JSON.stringify({ "week-12-monday": true }),
    );

    expect(loadReadingPlanProgress()["week-12-monday"]).toBe(true);
    expect(loadReadingPlan104Progress()).toEqual({});
  });

  it("never counts a 2-year week past 52 as annual progress", () => {
    // The canonical service caps at week 52 by design — Bible Bingo reads it.
    saveReadingPlan104Progress({ "week-88-friday": true });
    expect(completedReadingPlanEntryIds().has("week-88-friday")).toBe(false);
    expect(completedReadingPlanEntryIds().size).toBe(0);
  });
});
