// @vitest-environment jsdom
//
// The duration switch as a reader meets it: two choices, 1 Year active until
// they say otherwise, each pace holding its own progress across a switch and
// a reload, and Catch-up cells that are visibly a rest rather than a broken
// reading.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import BibleReadingPlanBoard from "../BibleReadingPlanBoard";
import ReadingPlanDurationTabs from "../ReadingPlanDurationTabs";
import { BIBLE_READING_PLAN_WEEKS } from "../../lib/bibleReadingPlan";
import { BIBLE_READING_PLAN_104_WEEKS } from "../../lib/bibleReadingPlan104";
import { READING_PLAN_104_PROGRESS_KEY } from "../../lib/readingPlan104Progress";
import { READING_PLAN_PROGRESS_KEY_V2 } from "../../lib/readingPlanProgress";
import { readingPlanPdfAsset } from "../../lib/readingPlanPdf";
import {
  CHP_OFFICIAL_BIBLE_READING_PLAN_104_PDF,
  CHP_OFFICIAL_BIBLE_READING_PLAN_PDF,
} from "../../lib/crossHeartPrayOfficialAssets";

// jsdom has no layout APIs.
Element.prototype.scrollIntoView = vi.fn();
Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;

// The page composes these as siblings: the tabs sit above the board shell so
// the compact-table CSS can't shrink them, and the two stay in agreement
// through the shared duration store.
function renderBoard() {
  return render(
    <>
      <ReadingPlanDurationTabs />
      <BibleReadingPlanBoard
        weeks52={BIBLE_READING_PLAN_WEEKS}
        weeks104={BIBLE_READING_PLAN_104_WEEKS}
      />
    </>,
  );
}

const oneYearTab = () => screen.getByRole("tab", { name: /1 Year/i });
const twoYearTab = () => screen.getByRole("tab", { name: /2 Years/i });

/** The reading label button inside a given plan cell. */
function cellLabel(cellId: string) {
  const cell = document.getElementById(cellId);
  expect(cell, `missing cell ${cellId}`).not.toBeNull();
  return cell as HTMLElement;
}

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, "", "/bible-reading-plan");
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("the duration switch", () => {
  it("offers both pacings and starts on 1 Year", () => {
    renderBoard();

    expect(oneYearTab().getAttribute("aria-selected")).toBe("true");
    expect(twoYearTab().getAttribute("aria-selected")).toBe("false");
    expect(screen.getByText(/52 Weeks/i)).toBeTruthy();
    expect(screen.getByText(/104 Weeks/i)).toBeTruthy();
  });

  it("explains the slower pace without selling it", () => {
    renderBoard();
    expect(screen.getByText(/one year feels like too much/i)).toBeTruthy();
  });

  it("shows the 52-week readings first and swaps to the 104-week readings", async () => {
    const user = userEvent.setup();
    renderBoard();

    // Week 1 Monday, the canonical plan: Gen 1-3.
    expect(within(cellLabel("week-1-monday")).getByText("Gen 1-3")).toBeTruthy();

    await user.click(twoYearTab());

    // The same lane on the 2-year pace: the first half of that reading.
    expect(within(cellLabel("week-1-monday")).getByText("Gen 1-2")).toBeTruthy();
    expect(within(cellLabel("week-2-monday")).getByText("Gen 3")).toBeTruthy();
  });

  it("reaches weeks 53 through 104 on the 2-year pace", async () => {
    const user = userEvent.setup();
    renderBoard();
    await user.click(twoYearTab());

    expect(within(cellLabel("week-53-monday")).getByText("Lev 10-11")).toBeTruthy();
    expect(within(cellLabel("week-104-saturday")).getByText("Acts 28")).toBeTruthy();
    // ...and week 105 does not exist.
    expect(document.getElementById("week-105-sunday")).toBeNull();
  });

  it("restores the original readings when 1 Year is chosen again", async () => {
    const user = userEvent.setup();
    renderBoard();

    await user.click(twoYearTab());
    await user.click(oneYearTab());

    expect(within(cellLabel("week-1-monday")).getByText("Gen 1-3")).toBeTruthy();
    expect(document.getElementById("week-53-monday")).toBeNull();
  });
});

describe("Catch-up cells", () => {
  it("read as a rest, with no checkbox and no reader to open", async () => {
    const user = userEvent.setup();
    renderBoard();
    await user.click(twoYearTab());

    // Week 104 Sunday: source week 52's Epistles reading is Jude — one
    // chapter, indivisible — so week 103 reads it and week 104 rests.
    expect(within(cellLabel("week-103-sunday")).getByText("Jude")).toBeTruthy();

    const restCell = cellLabel("week-104-sunday");
    expect(within(restCell).getByText("Catch-up")).toBeTruthy();
    expect(restCell.querySelectorAll("button")).toHaveLength(0);
    expect(restCell.querySelectorAll("a")).toHaveLength(0);
    expect(restCell.querySelector("input")).toBeNull();
  });

  it("is not counted as an unfinished reading", async () => {
    const user = userEvent.setup();
    renderBoard();
    await user.click(twoYearTab());

    // 728 cells, 17 of which are rest cells, leaves 711 real readings.
    const counter = screen.getByText(
      (_content, element) =>
        element?.tagName === "SPAN" && element.textContent === "0/711",
    );
    expect(counter).toBeTruthy();
  });
});

describe("progress stays separate across a switch and a reload", () => {
  it("keeps each pace's completions to itself", async () => {
    const user = userEvent.setup();
    const { unmount } = renderBoard();

    // Mark a 1-year reading complete.
    await user.click(
      within(cellLabel("week-1-monday")).getByRole("button", { name: /Mark read/i }),
    );
    expect(window.localStorage.getItem(READING_PLAN_PROGRESS_KEY_V2)).toContain(
      "week-1-monday",
    );

    // Switch and mark a 2-year reading complete.
    await user.click(twoYearTab());
    await user.click(
      within(cellLabel("week-3-tuesday")).getByRole("button", { name: /Mark read/i }),
    );

    const annual = window.localStorage.getItem(READING_PLAN_PROGRESS_KEY_V2) ?? "";
    const twoYear = window.localStorage.getItem(READING_PLAN_104_PROGRESS_KEY) ?? "";

    expect(annual).toContain("week-1-monday");
    expect(annual).not.toContain("week-3-tuesday");
    expect(twoYear).toContain("week-3-tuesday");
    expect(twoYear).not.toContain("week-1-monday");

    // Reload: both tracks come back, each on its own pace.
    unmount();
    cleanup();
    renderBoard();

    // The saved choice (2 Years) is restored...
    expect(
      (await screen.findByRole("tab", { name: /2 Years/i })).getAttribute("aria-selected"),
    ).toBe("true");
    expect(
      within(cellLabel("week-3-tuesday")).getByRole("button", { name: /Mark unread/i }),
    ).toBeTruthy();

    // ...and the 1-year completion is still there, untouched.
    await user.click(oneYearTab());
    expect(
      within(cellLabel("week-1-monday")).getByRole("button", { name: /Mark unread/i }),
    ).toBeTruthy();
    // Renders the full 104-week board (728 cells) three times over; the
    // default 5s budget is tight when the whole suite runs in parallel.
  }, 30000);

  it("shows the annual plan when a deep link addresses it", async () => {
    // Scripture Reader / Bingo / email links all mean the annual plan.
    window.history.replaceState(null, "", "/bible-reading-plan?week=5&day=monday");
    window.localStorage.setItem("crossheartpray:bible-reading-plan-duration", "104");

    renderBoard();

    expect(
      (await screen.findByRole("tab", { name: /1 Year/i })).getAttribute("aria-selected"),
    ).toBe("true");
  });
});

describe("the PDF follows the active pace", () => {
  it("keeps the original 52-week file for the 1-year plan", () => {
    expect(readingPlanPdfAsset(52)).toEqual({
      href: CHP_OFFICIAL_BIBLE_READING_PLAN_PDF,
      downloadName: "52-week-bible-reading-plan.pdf",
    });
    // No argument means the original file, exactly as before this feature.
    expect(readingPlanPdfAsset().href).toBe(CHP_OFFICIAL_BIBLE_READING_PLAN_PDF);
  });

  it("selects the 104-week file for the 2-year plan", () => {
    expect(readingPlanPdfAsset(104)).toEqual({
      href: CHP_OFFICIAL_BIBLE_READING_PLAN_104_PDF,
      downloadName: "104-week-bible-reading-plan.pdf",
    });
  });
});
