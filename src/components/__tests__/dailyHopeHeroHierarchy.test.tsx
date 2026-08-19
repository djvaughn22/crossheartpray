// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import DailyHopeRoutine from "../DailyHopeRoutine";
import {
  dailyHopeClosingPrayer,
  dailyHopeOpeningPrayers,
  getDailyHopeDays,
  getDailyHopeMissingReferences,
} from "../../lib/dailyHopeRoutine";

// jsdom has no scrollIntoView.
Element.prototype.scrollIntoView = vi.fn();

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify([]), { status: 200 })),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/daily-hope");
});

function renderDailyHope() {
  return render(
    <DailyHopeRoutine
      openingPrayers={dailyHopeOpeningPrayers}
      closingPrayer={dailyHopeClosingPrayer}
      days={getDailyHopeDays()}
      missingReferences={getDailyHopeMissingReferences()}
    />,
  );
}

describe("Daily Hope hero hierarchy", () => {
  it("does not render a second, page-level Cross Heart Pray brand row", () => {
    renderDailyHope();

    // The global site header owns this identity; Daily Hope must not repeat it.
    expect(screen.queryByText("Cross")).toBeNull();
    expect(screen.queryByText("Heart")).toBeNull();
    expect(screen.queryByText("Pray")).toBeNull();
  });

  it("does not render the floating Home / Bible Reading flow pills", () => {
    renderDailyHope();

    expect(screen.queryByRole("link", { name: /previous: home/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /next: bible reading/i })).toBeNull();
  });

  it("offers Bible Reading Plan as exactly one contextual link", () => {
    renderDailyHope();

    const links = screen.getAllByRole("link", { name: /bible reading plan/i });
    expect(links.length).toBe(1);
    expect(links[0].getAttribute("href")).toBe("/bible-reading-plan");
  });

  it("keeps today/day-selection, expand-all, and share controls next to the date", async () => {
    const user = userEvent.setup();
    renderDailyHope();

    const dayView = screen.getByLabelText("Quick day view");
    expect(within(dayView).getByRole("button", { name: /today/i })).toBeTruthy();
    // Today + Sun..Sat quick-jump buttons.
    expect(within(dayView).getAllByRole("button").length).toBe(8);

    const actions = screen.getByLabelText("Daily Hope actions");
    const expandButton = within(actions).getByRole("button", { name: /expand all/i });
    expect(expandButton.getAttribute("aria-expanded")).toBe("false");

    await user.click(expandButton);
    const collapseButton = within(actions).getByRole("button", { name: /collapse all/i });
    expect(collapseButton.getAttribute("aria-expanded")).toBe("true");

    expect(within(actions).getByRole("button", { name: /^share$/i })).toBeTruthy();
  });

  it("preserves Sinner Prayer and Salvation Prayer accordions with their original wording", async () => {
    const user = userEvent.setup();
    renderDailyHope();

    const sinnerToggle = screen.getByRole("button", { name: /read sinner prayer/i });
    await user.click(sinnerToggle);
    expect(
      screen.getByText(/i invite jesus to become the lord of my life/i),
    ).toBeTruthy();

    const salvationToggle = screen.getByRole("button", { name: /read salvation prayer/i });
    await user.click(salvationToggle);
    expect(screen.getByText(/be my king, my lord, and my savior/i)).toBeTruthy();
  });

  it("still surfaces the selected day, week, and every weekday button", () => {
    renderDailyHope();

    expect(screen.getByText(/^Week \d+$/)).toBeTruthy();

    const dayView = screen.getByLabelText("Quick day view");
    for (const label of ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]) {
      expect(within(dayView).getByRole("button", { name: label })).toBeTruthy();
    }
  });
});
