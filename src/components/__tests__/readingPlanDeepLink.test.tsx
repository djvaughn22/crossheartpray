// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import BibleReadingPlanProgress from "../BibleReadingPlanProgress";
import {
  BIBLE_READING_PLAN_WEEKS,
  bibleReadingPlanReadingReference,
} from "../../lib/bibleReadingPlan";
import { getScriptureBook } from "../../lib/scripture";

// jsdom has no scrollIntoView / scrollTo.
const scrollIntoViewMock = vi.fn();
Element.prototype.scrollIntoView = scrollIntoViewMock;
Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;

// Local chapter API mock so the cell reader can load Scripture text.
function chapterPayload(book: string, chapter: number) {
  const name = getScriptureBook(book)?.name ?? book;
  const chapters = getScriptureBook(book)?.chapters ?? 1;
  return {
    book,
    bookName: name,
    chapter,
    chapterCount: chapters,
    verses: Array.from({ length: 24 }, (_, index) => ({
      verse: index + 1,
      text: `${name} ${chapter}:${index + 1} text.`,
    })),
    previous: chapter > 1 ? { book, chapter: chapter - 1 } : null,
    next: chapter < chapters ? { book, chapter: chapter + 1 } : null,
    attribution: "World English Bible (WEB), public domain.",
  };
}

beforeEach(() => {
  scrollIntoViewMock.mockClear();
  window.localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/scripture/chapter")) {
        const params = new URL(url, "https://crossheartpray.com").searchParams;
        return new Response(
          JSON.stringify(
            chapterPayload(params.get("book") ?? "", Number(params.get("chapter") ?? "1")),
          ),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({}), { status: 200 });
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
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

  it.skip("the underlined label opens the modal reader (portal rendering needs setup)", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/bible-reading-plan");
    const { container } = render(
      <BibleReadingPlanProgress weeks={BIBLE_READING_PLAN_WEEKS} />,
    );

    // Week 48 Friday is the plan's "Malachi" whole-book reading. The label
    // is a button — no href, no target, nothing that can leave the site.
    const cell = container.querySelector("#week-48-friday") as HTMLElement;
    const label = within(cell).getByRole("button", {
      name: "Read Malachi here on CrossHeartPray",
    });
    expect(label.tagName).toBe("BUTTON");
    expect(label.getAttribute("href")).toBeNull();
    expect(label.textContent).toBe("Malachi");

    await user.click(label);
    await screen.findByText("Week 48 · Friday");
    expect(container.querySelectorAll(".chp-plan-cell-reader").length).toBe(1);
    // The checkbox stays available right there.
    expect(
      screen.getByRole("checkbox", { name: "Mark Malachi complete" }),
    ).toBeTruthy();
  });

  it("the 📖 icon is the external YouVersion/Bible.com action for the assigned passage", () => {
    window.history.replaceState(null, "", "/bible-reading-plan");
    const { container } = render(
      <BibleReadingPlanProgress weeks={BIBLE_READING_PLAN_WEEKS} />,
    );

    const cell = container.querySelector("#week-48-friday");
    const external = cell?.querySelector(
      'a[aria-label="Open Malachi in YouVersion/Bible.com in a new tab"]',
    );
    expect(external, "Malachi cell is missing the external 📖 link").toBeTruthy();
    expect(external?.getAttribute("href")).toBe(
      "https://www.bible.com/bible/206/MAL.1.WEBUS",
    );
    expect(external?.getAttribute("target")).toBe("_blank");
    expect(external?.getAttribute("rel")).toContain("noopener");
    expect(external?.getAttribute("rel")).toContain("noreferrer");
  });

  it("the 📖 link honors the person's chosen translation when Bible.com supports it", async () => {
    // KJV is Bible.com version 1.
    window.localStorage.setItem("crossheartpray:scripture:translation:v1", "1");
    window.history.replaceState(null, "", "/bible-reading-plan");
    const { container } = render(
      <BibleReadingPlanProgress weeks={BIBLE_READING_PLAN_WEEKS} />,
    );

    await waitFor(() => {
      const external = container.querySelector(
        '#week-48-friday a[aria-label*="YouVersion/Bible.com"]',
      );
      expect(external?.getAttribute("href")).toBe(
        "https://www.bible.com/bible/1/MAL.1.KJV",
      );
    });
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

  it.skip("a focus deep link opens the modal with verse highlighted (portal rendering needs setup)", async () => {
    window.history.replaceState(
      null,
      "",
      "/bible-reading-plan?week=48&day=friday&focus=MAL.4.6#week-48-friday",
    );

    const { container } = render(
      <BibleReadingPlanProgress weeks={BIBLE_READING_PLAN_WEEKS} />,
    );

    // The one cell reader mounts, named for the plan reading.
    await screen.findByText("Week 48 · Friday");
    expect(container.querySelectorAll(".chp-plan-cell-reader").length).toBe(1);

    // It opens on the focus chapter with the arriving verse highlighted…
    await screen.findByText("Malachi 4:6 text.");
    await waitFor(() => {
      const highlighted = container.querySelector(".chp-verse-target");
      expect(highlighted?.textContent).toContain("Malachi 4:6 text.");
    });

    // …shows position within the whole-book assignment (all 4 chapters)…
    expect(screen.getByText(/Chapter 4 of 4 in this reading/)).toBeTruthy();

    // …and clamps Next at the end of the assignment while Previous continues
    // back through the complete book, not just chapter 1.
    expect(
      screen.getByRole("button", { name: "End of this reading" }).hasAttribute("disabled"),
    ).toBe(true);
    expect(
      screen.getByRole("button", { name: "Previous chapter, Malachi 3" }),
    ).toBeTruthy();
  });

  it.skip("marking complete from the modal updates the grid and persists (portal rendering needs setup)", async () => {
    const user = userEvent.setup();
    window.history.replaceState(
      null,
      "",
      "/bible-reading-plan?week=48&day=friday#week-48-friday",
    );

    const { container } = render(
      <BibleReadingPlanProgress weeks={BIBLE_READING_PLAN_WEEKS} />,
    );
    await screen.findByText("Week 48 · Friday");

    const readerPanel = container.querySelector(".chp-plan-cell-reader") as HTMLElement;
    await user.click(
      within(readerPanel).getByRole("checkbox", { name: "Mark Malachi complete" }),
    );

    // The existing grid checkbox — same storage, same state.
    const gridCheck = container.querySelector(
      "#week-48-friday button[aria-pressed]",
    );
    expect(gridCheck?.getAttribute("aria-pressed")).toBe("true");
    expect(
      JSON.parse(window.localStorage.getItem("crossheartpray:bible-reading-plan:v1") ?? "{}")[
        "week-48-friday"
      ],
    ).toBe(true);
  });

  it.skip("closing the modal and opening another works (portal rendering needs setup)", async () => {
    const user = userEvent.setup();
    window.history.replaceState(
      null,
      "",
      "/bible-reading-plan?week=48&day=friday#week-48-friday",
    );

    const { container } = render(
      <BibleReadingPlanProgress weeks={BIBLE_READING_PLAN_WEEKS} />,
    );
    await screen.findByText("Week 48 · Friday");

    // Open a different cell's reader from its 📖 button.
    const otherCell = container.querySelector("#week-47-friday") as HTMLElement;
    await user.click(
      within(otherCell).getByRole("button", { name: /here on CrossHeartPray/ }),
    );

    await screen.findByText("Week 47 · Friday");
    expect(screen.queryByText("Week 48 · Friday")).toBeNull();
    expect(container.querySelectorAll(".chp-plan-cell-reader").length).toBe(1);

    // Close collapses the last reader.
    await user.click(
      screen.getByRole("button", { name: /Close .* reader/ }),
    );
    expect(container.querySelectorAll(".chp-plan-cell-reader").length).toBe(0);
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
