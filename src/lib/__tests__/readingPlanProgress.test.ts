// @vitest-environment jsdom
//
// The canonical annual Reading Plan progress service: year-keyed storage,
// legacy (v1) preservation, id normalization, cross-feature events, and
// calendar-year separation.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  READING_PLAN_PROGRESS_EVENT,
  READING_PLAN_PROGRESS_KEY_V1,
  READING_PLAN_PROGRESS_KEY_V2,
  completedReadingPlanEntryIds,
  currentPlanYear,
  loadReadingPlanProgress,
  normalizeReadingPlanEntryId,
  saveReadingPlanProgress,
  setReadingPlanEntriesCompleted,
  setReadingPlanEntryCompleted,
  subscribeToReadingPlanProgress,
} from "../readingPlanProgress";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const YEAR = currentPlanYear();

describe("id normalization", () => {
  it("canonicalizes case and zero-padding, rejects non-plan ids", () => {
    expect(normalizeReadingPlanEntryId("week-5-friday")).toBe("week-5-friday");
    expect(normalizeReadingPlanEntryId("Week-05-Friday")).toBe("week-5-friday");
    expect(normalizeReadingPlanEntryId("  WEEK-52-SATURDAY ")).toBe("week-52-saturday");
    expect(normalizeReadingPlanEntryId("week-0-sunday")).toBeNull();
    expect(normalizeReadingPlanEntryId("week-53-sunday")).toBeNull();
    expect(normalizeReadingPlanEntryId("week-9-caturday")).toBeNull();
    expect(normalizeReadingPlanEntryId("john-3-16")).toBeNull();
    expect(normalizeReadingPlanEntryId("")).toBeNull();
  });
});

describe("legacy (v1) data preservation", () => {
  it("adopts a legacy flat map as the current year's progress", () => {
    window.localStorage.setItem(
      READING_PLAN_PROGRESS_KEY_V1,
      JSON.stringify({ "week-1-sunday": true, "week-30-friday": true }),
    );

    const progress = loadReadingPlanProgress();
    expect(progress["week-1-sunday"]).toBe(true);
    expect(progress["week-30-friday"]).toBe(true);
  });

  it("understands every legacy checklist shape and normalizes legacy ids", () => {
    window.localStorage.setItem(
      READING_PLAN_PROGRESS_KEY_V1,
      JSON.stringify(["Week-02-Monday", "week-3-tuesday"]),
    );
    const progress = loadReadingPlanProgress();
    expect(progress["week-2-monday"]).toBe(true);
    expect(progress["week-3-tuesday"]).toBe(true);
  });

  it("keeps unknown legacy ids stored instead of destroying them", () => {
    window.localStorage.setItem(
      READING_PLAN_PROGRESS_KEY_V1,
      JSON.stringify({ "custom-note-id": true, "week-4-wednesday": true }),
    );
    setReadingPlanEntryCompleted("week-5-thursday", true);

    const v2 = JSON.parse(window.localStorage.getItem(READING_PLAN_PROGRESS_KEY_V2)!);
    expect(v2.years[String(YEAR)]["custom-note-id"]).toBe(true);
    expect(v2.years[String(YEAR)]["week-4-wednesday"]).toBe(true);
    expect(v2.years[String(YEAR)]["week-5-thursday"]).toBe(true);
  });

  it("survives corrupt v1 and v2 payloads", () => {
    window.localStorage.setItem(READING_PLAN_PROGRESS_KEY_V1, "{not json");
    window.localStorage.setItem(READING_PLAN_PROGRESS_KEY_V2, '{"years": 7}');
    expect(loadReadingPlanProgress()).toEqual({});
    expect(() => setReadingPlanEntryCompleted("week-1-sunday", true)).not.toThrow();
    expect(loadReadingPlanProgress()["week-1-sunday"]).toBe(true);
  });

  it("mirrors the current year back to v1 for older readers", () => {
    setReadingPlanEntryCompleted("week-7-sunday", true);
    const v1 = JSON.parse(window.localStorage.getItem(READING_PLAN_PROGRESS_KEY_V1)!);
    expect(v1["week-7-sunday"]).toBe(true);
  });
});

describe("year separation and rollover", () => {
  it("keeps each plan year's progress in its own bucket", () => {
    setReadingPlanEntryCompleted("week-1-sunday", true, YEAR);
    setReadingPlanEntryCompleted("week-2-monday", true, YEAR + 1);

    expect(loadReadingPlanProgress(YEAR)).toEqual({ "week-1-sunday": true });
    expect(loadReadingPlanProgress(YEAR + 1)).toEqual({ "week-2-monday": true });
    expect(loadReadingPlanProgress(YEAR - 1)).toEqual({});
  });

  it("a new year starts empty without touching the old year's history", () => {
    setReadingPlanEntryCompleted("week-52-saturday", true, YEAR);
    expect(completedReadingPlanEntryIds(YEAR + 1).size).toBe(0);
    expect(completedReadingPlanEntryIds(YEAR).has("week-52-saturday")).toBe(true);
  });

  it("computes the plan year in America/Chicago", () => {
    // 2026-01-01T03:00Z is still Dec 31, 2025 in Chicago (UTC-6).
    expect(currentPlanYear(new Date("2026-01-01T03:00:00Z"))).toBe(2025);
    expect(currentPlanYear(new Date("2026-01-01T12:00:00Z"))).toBe(2026);
  });
});

describe("writes and events", () => {
  it("set/unset round-trips and bulk updates work", () => {
    setReadingPlanEntriesCompleted(["week-1-sunday", "week-1-monday"], true);
    expect(completedReadingPlanEntryIds()).toEqual(
      new Set(["week-1-sunday", "week-1-monday"]),
    );

    setReadingPlanEntryCompleted("week-1-sunday", false);
    expect(completedReadingPlanEntryIds()).toEqual(new Set(["week-1-monday"]));
  });

  it("saveReadingPlanProgress replaces the year's map (plan-board toggle flow)", () => {
    setReadingPlanEntryCompleted("week-9-friday", true);
    saveReadingPlanProgress({ "week-10-sunday": true });
    expect(loadReadingPlanProgress()).toEqual({ "week-10-sunday": true });
  });

  it("notifies subscribers on save and cleans up listeners", () => {
    const seen: Array<Record<string, boolean>> = [];
    const unsubscribe = subscribeToReadingPlanProgress((progress) => {
      seen.push(progress);
    });

    // Subscription fires immediately with current state…
    expect(seen).toHaveLength(1);

    // …and again on every canonical write.
    setReadingPlanEntryCompleted("week-6-tuesday", true);
    expect(seen.at(-1)?.["week-6-tuesday"]).toBe(true);

    unsubscribe();
    setReadingPlanEntryCompleted("week-6-wednesday", true);
    expect(seen.at(-1)?.["week-6-wednesday"]).toBeUndefined();
  });

  it("dispatches the legacy progress event name for existing listeners", () => {
    const listener = vi.fn();
    window.addEventListener(READING_PLAN_PROGRESS_EVENT, listener);
    setReadingPlanEntryCompleted("week-8-sunday", true);
    window.removeEventListener(READING_PLAN_PROGRESS_EVENT, listener);
    expect(listener).toHaveBeenCalled();
  });
});
