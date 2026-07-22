// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";

import BibleReadingPlanProgress from "../BibleReadingPlanProgress";
import {
  BIBLE_READING_PLAN_WEEKS,
  bibleReadingPlanReadingReference,
} from "../../lib/bibleReadingPlan";
import { getScriptureBook } from "../../lib/scripture";

// jsdom has no scrollIntoView.
const scrollIntoViewMock = vi.fn();
Element.prototype.scrollIntoView = scrollIntoViewMock;

beforeEach(() => {
  scrollIntoViewMock.mockClear();
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

describe("every plan reading offers Read here", () => {
  it("all 364 readings — whole-book labels included — resolve to a real starting chapter", () => {
    const days = BIBLE_READING_PLAN_WEEKS.flatMap((week) => week.days);
    expect(days.length).toBe(364);

    for (const day of days) {
      const reference = bibleReadingPlanReadingReference(day.reading);
      expect(reference, `"${day.reading}" (week ${day.week})`).not.toBeNull();

      const book = getScriptureBook(reference!.code);
      expect(book, `"${day.reading}" resolves to unknown book`).not.toBeNull();
      expect(reference!.chapter).toBeGreaterThanOrEqual(1);
      expect(reference!.chapter, `"${day.reading}" starts past the end of ${book!.name}`).toBeLessThanOrEqual(
        book!.chapters,
      );
    }
  });

  it("whole-book and compact labels resolve to chapter 1 of the right book", () => {
    expect(bibleReadingPlanReadingReference("Malachi")).toEqual({ code: "MAL", chapter: 1 });
    expect(bibleReadingPlanReadingReference("Jude")).toEqual({ code: "JUD", chapter: 1 });
    expect(bibleReadingPlanReadingReference("2Pet")).toEqual({ code: "2PE", chapter: 1 });
    expect(bibleReadingPlanReadingReference("2John")).toEqual({ code: "2JN", chapter: 1 });
    expect(bibleReadingPlanReadingReference("Obadiah")).toEqual({ code: "OBA", chapter: 1 });
    expect(bibleReadingPlanReadingReference("Deut 16-19")).toEqual({ code: "DEU", chapter: 16 });
  });

  it("a whole-book cell renders the in-app Read here button", async () => {
    window.history.replaceState(null, "", "/bible-reading-plan");
    const { container } = render(
      <BibleReadingPlanProgress weeks={BIBLE_READING_PLAN_WEEKS} />,
    );

    // Week 48 Friday is the plan's "Malachi" whole-book reading.
    const cell = container.querySelector("#week-48-friday");
    const readHere = cell?.querySelector('button[aria-label*="here on CrossHeartPray"]');
    expect(readHere, "Malachi cell is missing Read here").toBeTruthy();

    // And its external link goes to Malachi 1, never a search page.
    const link = cell?.querySelector("a");
    expect(link?.getAttribute("href")).toBe(
      "https://www.bible.com/bible/206/MAL.1.WEBUS",
    );
  });
});

describe("Reading Plan deep links — direct load lands on the exact week and lane", () => {
  it("scrolls, highlights, and focuses the Malachi reading from its anchor", async () => {
    window.history.replaceState(null, "", "/bible-reading-plan#week-48-friday");

    const { container } = render(
      <BibleReadingPlanProgress weeks={BIBLE_READING_PLAN_WEEKS} />,
    );

    const cell = container.querySelector("#week-48-friday");
    expect(cell).not.toBeNull();
    // The Friday lane of week 48 really is the plan's Malachi reading.
    expect(cell?.textContent).toContain("Malachi");

    await waitFor(() => {
      expect(cell?.className).toContain("chp-reading-target-cell");
    });

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled();
      expect(cell?.contains(document.activeElement)).toBe(true);
    });
  });

  it("also resolves the query-parameter form ?week=48&day=friday", async () => {
    window.history.replaceState(null, "", "/bible-reading-plan?week=48&day=friday");

    const { container } = render(
      <BibleReadingPlanProgress weeks={BIBLE_READING_PLAN_WEEKS} />,
    );

    const cell = container.querySelector("#week-48-friday");

    await waitFor(() => {
      expect(cell?.className).toContain("chp-reading-target-cell");
    });
  });

  it("saved progress survives a deep-link visit", async () => {
    window.localStorage.setItem(
      "crossheartpray:bible-reading-plan:v1",
      JSON.stringify({ "week-48-friday": true }),
    );
    window.history.replaceState(null, "", "/bible-reading-plan#week-48-friday");

    const { container } = render(
      <BibleReadingPlanProgress weeks={BIBLE_READING_PLAN_WEEKS} />,
    );

    await waitFor(() => {
      const checkButton = container.querySelector(
        "#week-48-friday button[aria-pressed]",
      );
      expect(checkButton?.getAttribute("aria-pressed")).toBe("true");
    });
  });
});
