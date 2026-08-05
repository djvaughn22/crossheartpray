// @vitest-environment jsdom

// The shared Deep Dive inside the one Scripture reader: every chapter read on
// CrossHeartPray (Reading Plan "Read Here", Life Essentials, Bible Bingo 7's
// book readers, Behind the Verse, the homepage connected verse) exposes the
// same verified Greek/Hebrew word study Bible Bingo 7 uses — and never
// fabricates data when a verse has none.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ScriptureReader from "../scripture/ScriptureReader";
import OriginalWordStudyModal from "../OriginalWordStudyModal";
import { getScriptureBook } from "../../lib/scripture";
import type { VerifiedWordStudy } from "../../lib/originalLanguageWordStudy";

Element.prototype.scrollIntoView = vi.fn();
Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;

function verseText(book: string, chapter: number, verse: number) {
  if (book === "JHN" && chapter === 3 && verse === 16) {
    return "For God so loved the world.";
  }
  if (book === "GEN" && chapter === 1 && verse === 1) {
    return "In the beginning God created the heavens and the earth.";
  }
  return `${book} ${chapter}:${verse} text.`;
}

function chapterPayload(book: string, chapter: number) {
  const name = getScriptureBook(book)?.name ?? book;
  const chapters = getScriptureBook(book)?.chapters ?? 1;
  return {
    book,
    bookName: name,
    chapter,
    chapterCount: chapters,
    verses: Array.from({ length: 20 }, (_, index) => ({
      verse: index + 1,
      text: verseText(book, chapter, index + 1),
    })),
    previous: chapter > 1 ? { book, chapter: chapter - 1 } : null,
    next: chapter < chapters ? { book, chapter: chapter + 1 } : null,
    attribution: "Berean Standard Bible (BSB), public domain.",
  };
}

const GREEK_LOVED: VerifiedWordStudy = {
  reference: "John 3:16",
  code: "JHN",
  chapter: "3",
  verse: "16",
  englishWord: "loved",
  language: "greek",
  originalWord: "ἠγάπησεν",
  transliteration: "agapao",
  strongs: "G25",
  lemma: "ἀγαπάω",
  morphology: "V-AAI-3S",
  sourceGloss: "he loved",
  lexiconMeaning: "to love",
  sourceName: "MACULA Greek SBLGNT alignment",
  lexiconSourceName: "STEPBible TBESG Greek brief lexicon",
  sourceUrl: "https://github.com/Clear-Bible/macula-greek",
};

const HEBREW_CREATED: VerifiedWordStudy = {
  reference: "Genesis 1:1",
  code: "GEN",
  chapter: "1",
  verse: "1",
  englishWord: "created",
  language: "hebrew",
  originalWord: "בָּרָ֣א",
  transliteration: "ba.Ra'",
  strongs: "H1254",
  lemma: "בָּרָ֣א",
  morphology: "HVqp3ms",
  sourceGloss: "he created",
  lexiconMeaning: "to create",
  sourceName: "STEPBible TAHOT Hebrew alignment",
  lexiconSourceName: "STEPBible TBESH Hebrew brief lexicon",
  sourceUrl: "https://github.com/STEPBible/STEPBible-Data",
};

function wordStudiesFor(code: string | null, chapter: string | null, verse: string | null) {
  if (code === "JHN" && chapter === "3" && verse === "16") return [GREEK_LOVED];
  if (code === "GEN" && chapter === "1" && verse === "1") return [HEBREW_CREATED];
  return [];
}

beforeEach(() => {
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
      if (url.includes("deep-dive-word-studies")) {
        const params = new URL(url).searchParams;
        return new Response(
          JSON.stringify({
            wordStudies: wordStudiesFor(
              params.get("code"),
              params.get("chapter"),
              params.get("verse"),
            ),
          }),
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
});

describe("the shared reader carries a VISIBLE Deep Dive control on every verse", () => {
  it("every rendered verse has its own visible, labeled Deep Dive button", async () => {
    render(<ScriptureReader initialReference={{ book: "JHN", chapter: 3 }} />);

    await screen.findByText(
      "Choose Deep Dive beside any verse to explore its original Hebrew or Greek words.",
    );

    // One real button per verse — visible, not hidden click behavior.
    const controls = await screen.findAllByRole("button", {
      name: /Open Greek Deep Dive for John 3:\d+/,
    });
    expect(controls.length).toBe(20);
    // The visible label names the language a first-time visitor will get.
    expect(controls[0].textContent).toContain("Greek");
    // Verse-specific accessible label, e.g. "Open Greek Deep Dive for John 3:16".
    expect(
      screen.getByRole("button", { name: "Open Greek Deep Dive for John 3:16" }),
    ).toBeTruthy();
    // Still calm: the panel-level Deep Dive action waits for a selection.
    expect(screen.queryByRole("button", { name: "Deep Dive" })).toBeNull();
  });

  it("an Old Testament chapter shows Hebrew controls before any data loads", async () => {
    render(<ScriptureReader initialReference={{ book: "GEN", chapter: 1 }} />);

    const controls = await screen.findAllByRole("button", {
      name: /Open Hebrew Deep Dive for Genesis 1:\d+/,
    });
    expect(controls.length).toBe(20);
    expect(controls[0].textContent).toContain("Hebrew");
  });

  it("selecting the control visibly highlights the verse row", async () => {
    const user = userEvent.setup();
    render(<ScriptureReader initialReference={{ book: "JHN", chapter: 3 }} />);

    const control = await screen.findByRole("button", {
      name: "Open Greek Deep Dive for John 3:16",
    });
    const row = control.closest("[data-verse]") as HTMLElement;
    expect(row.className).not.toContain("chp-study-verse");

    await user.click(control);

    expect(control.getAttribute("aria-expanded")).toBe("true");
    expect(row.className).toContain("chp-study-verse");
  });

  it("keyboard users can reach and activate the control", async () => {
    const user = userEvent.setup();
    render(<ScriptureReader initialReference={{ book: "JHN", chapter: 3 }} />);

    const control = await screen.findByRole("button", {
      name: "Open Greek Deep Dive for John 3:16",
    });
    control.focus();
    expect(document.activeElement).toBe(control);
    await user.keyboard("{Enter}");

    await screen.findByText(/Verified Greek for verse 16/);
    expect(control.getAttribute("aria-expanded")).toBe("true");
  });

  it("a New Testament verse opens verified Greek data", async () => {
    const user = userEvent.setup();
    render(<ScriptureReader initialReference={{ book: "JHN", chapter: 3 }} />);

    await user.click(
      await screen.findByRole("button", { name: "Open Greek Deep Dive for John 3:16" }),
    );

    // The verse's verified word becomes an underlined word link…
    const wordLink = await screen.findByRole("button", { name: "loved" });
    expect(wordLink.title).toBe("Open Behind the Verse");
    await screen.findByText(/Verified Greek for verse 16/);

    // …and Deep Dive opens the same verified Strong's panel Bingo uses.
    await user.click(screen.getByRole("button", { name: "Deep Dive" }));
    await screen.findByText("Verified Strong's Data");
    const dialog = screen.getByRole("dialog", { name: "Behind the Verse" });
    expect(within(dialog).getByText("Greek")).toBeTruthy();
    expect(within(dialog).getAllByText(/G25/).length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText("ηγαπησεν").length).toBeGreaterThan(0);
  });

  it("an Old Testament verse opens verified Hebrew data", async () => {
    const user = userEvent.setup();
    render(<ScriptureReader initialReference={{ book: "GEN", chapter: 1 }} />);

    await user.click(
      await screen.findByRole("button", { name: "Open Hebrew Deep Dive for Genesis 1:1" }),
    );
    await screen.findByText(/Verified Hebrew for verse 1/);

    await user.click(screen.getByRole("button", { name: "Deep Dive" }));
    await screen.findByText("Verified Strong's Data");
    const dialog = screen.getByRole("dialog", { name: "Behind the Verse" });
    expect(within(dialog).getByText("Hebrew")).toBeTruthy();
    expect(within(dialog).getAllByText(/H1254/).length).toBeGreaterThan(0);
  });

  it("tapping an underlined word opens that word's study directly", async () => {
    const user = userEvent.setup();
    render(<ScriptureReader initialReference={{ book: "JHN", chapter: 3 }} />);

    await user.click(
      await screen.findByRole("button", { name: "Open Greek Deep Dive for John 3:16" }),
    );
    await user.click(await screen.findByRole("button", { name: "loved" }));

    await screen.findByText("Verified Strong's Data");
    expect(screen.getAllByText("ηγαπησεν").length).toBeGreaterThan(0);
  });

  it("a verse without verified data gets an honest, calm fallback — nothing invented", async () => {
    const user = userEvent.setup();
    render(<ScriptureReader initialReference={{ book: "JHN", chapter: 3 }} />);

    await user.click(
      await screen.findByRole("button", { name: "Open Greek Deep Dive for John 3:2" }),
    );

    await screen.findByText(
      "No verified original-language data for this verse yet — the Scripture stands on its own.",
    );
    expect(screen.queryByRole("button", { name: "Deep Dive" })).toBeNull();
  });

  it("Deep Dive fetch failures stay calm — the Scripture remains readable", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
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
      if (url.includes("deep-dive-word-studies")) {
        throw new TypeError("network down");
      }
      return new Response(JSON.stringify({}), { status: 200 });
    });

    render(<ScriptureReader initialReference={{ book: "PSA", chapter: 23 }} />);
    await user.click(
      await screen.findByRole("button", { name: "Open Hebrew Deep Dive for Psalms 23:1" }),
    );

    await screen.findByText(
      "No verified original-language data for this verse yet — the Scripture stands on its own.",
    );
    // The verse text itself is untouched.
    expect(screen.getByText("PSA 23:1 text.")).toBeTruthy();
  });

  it("moving to another chapter clears the selection back to calm reading", async () => {
    const user = userEvent.setup();
    render(<ScriptureReader initialReference={{ book: "JHN", chapter: 3 }} />);

    await user.click(
      await screen.findByRole("button", { name: "Open Greek Deep Dive for John 3:16" }),
    );
    await screen.findByText(/Verified Greek for verse 16/);

    await user.click(screen.getByRole("button", { name: "Next chapter, John 4" }));
    await screen.findByText("JHN 4:1 text.");
    expect(screen.queryByRole("button", { name: "Deep Dive" })).toBeNull();
  });
});

describe("closing Deep Dive never closes the Scripture reader", () => {
  it("Escape in the word-study panel stops before any parent modal's listener", async () => {
    const onCloseWordStudy = vi.fn();
    const parentModalClose = vi.fn();

    // The parent reader modal listens exactly like KindleReaderModal does —
    // a bubble-phase window keydown.
    function parentListener(event: KeyboardEvent) {
      if (event.key === "Escape") parentModalClose();
    }
    window.addEventListener("keydown", parentListener);

    render(
      <OriginalWordStudyModal
        passage={{ label: "John 3:16", code: "JHN", chapter: "3", verse: "16", text: "For God so loved the world." }}
        wordStudy={GREEK_LOVED}
        wordStudies={[GREEK_LOVED]}
        onClose={onCloseWordStudy}
      />,
    );

    const user = userEvent.setup();
    await user.keyboard("{Escape}");

    expect(onCloseWordStudy).toHaveBeenCalledTimes(1);
    expect(parentModalClose).not.toHaveBeenCalled();

    window.removeEventListener("keydown", parentListener);
  });
});

describe("translation choice persists from the reader", () => {
  it("keeps using the saved translation preference storage key", async () => {
    // The preference key is stable — the reader saves picks through
    // saveTranslationPreference (provider contract), nothing else.
    const { saveTranslationPreference, loadTranslationPreference } = await import(
      "../../lib/scripture"
    );
    saveTranslationPreference(206);
    expect(loadTranslationPreference()).toBe(206);
    expect(
      window.localStorage.getItem("crossheartpray:scripture:translation:v1"),
    ).toBe("206");
  });
});
