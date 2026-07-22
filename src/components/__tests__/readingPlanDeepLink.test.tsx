// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";

import BibleReadingPlanProgress from "../BibleReadingPlanProgress";
import { BIBLE_READING_PLAN_WEEKS } from "../../lib/bibleReadingPlan";

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
