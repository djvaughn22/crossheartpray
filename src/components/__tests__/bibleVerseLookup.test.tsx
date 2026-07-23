// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import BibleVerseLookup from "../BibleVerseLookup";

// jsdom has no scrollIntoView.
Element.prototype.scrollIntoView = vi.fn();

type Deferred = {
  resolve: () => void;
  response: Promise<Response>;
};

// Controllable /api/scripture/chapter responses, keyed by "BOOK.CHAPTER".
const deferredChapters = new Map<string, Deferred>();

function chapterPayload(book: string, bookName: string, chapter: number) {
  return {
    book,
    bookName,
    chapter,
    chapterCount: 99,
    verses: Array.from({ length: 20 }, (_, index) => ({
      verse: index + 1,
      text: `${bookName} ${chapter}:${index + 1} text.`,
    })),
    previous: null,
    next: null,
    attribution: "World English Bible (WEB), public domain.",
  };
}

const BOOK_NAMES: Record<string, string> = {
  ROM: "Romans",
  ZEC: "Zechariah",
  MAL: "Malachi",
  REV: "Revelation",
};

function installFetchMock() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/api/scripture/chapter")) {
        const params = new URL(url, "https://crossheartpray.com").searchParams;
        const book = params.get("book") ?? "";
        const chapter = Number(params.get("chapter") ?? "1");
        const key = `${book}.${chapter}`;
        const payload = chapterPayload(book, BOOK_NAMES[book] ?? book, chapter);

        const pending = deferredChapters.get(key);
        if (pending) return pending.response;

        return new Response(JSON.stringify(payload), { status: 200 });
      }

      // Deep Dive word studies — always empty here.
      return new Response(JSON.stringify({ wordStudies: [] }), { status: 200 });
    }),
  );
}

function deferChapter(book: string, chapter: number): Deferred {
  const key = `${book}.${chapter}`;
  let release: () => void = () => {};
  const response = new Promise<Response>((resolvePromise) => {
    release = () =>
      resolvePromise(
        new Response(
          JSON.stringify(chapterPayload(book, BOOK_NAMES[book] ?? book, chapter)),
          { status: 200 },
        ),
      );
  });
  const deferred = { resolve: release, response };
  deferredChapters.set(key, deferred);
  return deferred;
}

beforeEach(() => {
  deferredChapters.clear();
  installFetchMock();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function renderReady(initialReference = "Romans 15:7") {
  const view = render(<BibleVerseLookup initialReference={initialReference} />);
  await screen.findByText(initialReference);
  return view;
}

describe("BibleVerseLookup — one canonical reference drives everything", () => {
  it("a slow earlier search can never overwrite a newer one (Zechariah → Malachi 4:6)", async () => {
    const user = userEvent.setup();
    const { container } = await renderReady();

    const input = screen.getByRole("combobox") as HTMLInputElement;

    // Search #1: Zechariah 4:6 — its chapter request stays pending.
    const slowZechariah = deferChapter("ZEC", 4);
    await user.clear(input);
    await user.type(input, "Zechariah 4:6");
    await user.keyboard("{Enter}");

    // Search #2: Malachi 4:6 — resolves immediately.
    await user.clear(input);
    await user.type(input, "Malachi 4:6");
    await user.keyboard("{Enter}");

    await screen.findByRole("heading", { name: "Malachi 4:6" });

    // The stale Zechariah response lands late…
    slowZechariah.resolve();
    await new Promise((settle) => setTimeout(settle, 50));

    // …and changes nothing: field, heading, and card all say Malachi.
    expect(input.value).toBe("Malachi 4:6");
    expect(screen.getByRole("heading", { name: "Malachi 4:6" })).toBeTruthy();
    expect(container.textContent).not.toContain("Zechariah");
  });

  it("every action in the Context matters group derives from the selected Malachi 4:6", async () => {
    const user = userEvent.setup();
    await renderReady();

    const input = screen.getByRole("combobox");
    await user.clear(input);
    await user.type(input, "Malachi 4:6");
    await user.keyboard("{Enter}");
    await screen.findByRole("heading", { name: "Malachi 4:6" });

    await user.click(screen.getByRole("button", { name: "Read Malachi 4:6" }));
    const menu = screen.getByRole("menu", { name: "Read Malachi 4:6" });

    // Quick verse: Open in Bible.com for the exact verse.
    const verseLink = within(menu).getByRole("menuitem", {
      name: /^Open Malachi 4:6 on Bible.com/,
    }) as HTMLAnchorElement;
    expect(verseLink.getAttribute("href")).toBe(
      "https://www.bible.com/bible/206/MAL.4.6.WEBUS",
    );
    expect(verseLink.getAttribute("target")).toBe("_blank");

    // Read in context: Read Chapter Here opens a modal on the current page.
    const readChapter = within(menu).getByRole("menuitem", {
      name: /^Read Chapter Here/,
    });
    expect(readChapter.tagName).toBe("BUTTON");

    // Read in context: Read Chapter on Bible.com shows the full chapter.
    const chapterLink = within(menu).getByRole("menuitem", {
      name: /Open Malachi 4:\d+ on Bible.com in a new tab/,
    }) as HTMLAnchorElement;
    expect(chapterLink.getAttribute("href")).toContain("/bible/206/MAL.4");
    expect(chapterLink.getAttribute("target")).toBe("_blank");

    // Read in context: Open Reading Plan navigates to the plan (if it exists).
    const readOnPlan = within(menu).queryByRole("menuitem", {
      name: /^Open Reading Plan/,
    });
    if (readOnPlan) {
      expect(readOnPlan.getAttribute("href")).toContain("/bible-reading-plan");
    }
  });

  it("an invalid search clears the previous verse card and its actions", async () => {
    const user = userEvent.setup();
    await renderReady();

    const input = screen.getByRole("combobox");
    await user.clear(input);
    await user.type(input, "Malachi 4:6");
    await user.keyboard("{Enter}");
    await screen.findByRole("heading", { name: "Malachi 4:6" });

    await user.clear(input);
    await user.type(input, "Notabook 99:9");
    await user.keyboard("{Enter}");

    await screen.findByText(/Couldn’t find/);
    expect(screen.queryByRole("heading", { name: "Malachi 4:6" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Read / })).toBeNull();
  });

  it("rapidly selecting two references leaves the verse and controls on the latest one", async () => {
    const user = userEvent.setup();
    const { container } = await renderReady();

    const input = screen.getByRole("combobox");

    const slowRevelation = deferChapter("REV", 21);
    await user.clear(input);
    await user.type(input, "Revelation 21:4");
    await user.keyboard("{Enter}");

    await user.clear(input);
    await user.type(input, "Malachi 4:6");
    await user.keyboard("{Enter}");
    await screen.findByRole("heading", { name: "Malachi 4:6" });

    slowRevelation.resolve();
    await new Promise((settle) => setTimeout(settle, 50));

    expect(screen.getByRole("heading", { name: "Malachi 4:6" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Read Malachi 4:6" })).toBeTruthy();
    expect(container.textContent).not.toContain("Revelation 21:4");
  });

  it("a verse past the end of the chapter reports honestly instead of showing stale actions", async () => {
    const user = userEvent.setup();
    await renderReady();

    const input = screen.getByRole("combobox");
    await user.clear(input);
    // The mocked chapter has 20 verses.
    await user.type(input, "Malachi 4:99");
    await user.keyboard("{Enter}");

    await screen.findByText(/Malachi 4 has 20 verses/);
    expect(screen.queryByRole("button", { name: /^Read / })).toBeNull();
  });
});
