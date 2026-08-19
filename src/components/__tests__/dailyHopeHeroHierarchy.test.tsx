// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  usePathname: () => "/daily-hope",
}));

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

  it("reuses the site's page-flow pills: Home behind, Bible Reading Plan ahead", () => {
    renderDailyHope();

    const previous = screen.getByRole("link", { name: /previous: home/i });
    expect(previous.getAttribute("href")).toBe("/");

    const next = screen.getByRole("link", { name: /next: bible reading/i });
    expect(next.getAttribute("href")).toBe("/bible-reading-plan");
  });

  it("links to Bible Reading Plan exactly once, only via the forward nav pill", () => {
    renderDailyHope();

    const links = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href") === "/bible-reading-plan");
    expect(links.length).toBe(1);
    expect(links[0].getAttribute("aria-label")).toMatch(/next: bible reading/i);

    // The old small utility-row action must be gone.
    const actions = screen.getByLabelText("Daily Hope actions");
    expect(within(actions).queryByText(/bible reading plan/i)).toBeNull();
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
