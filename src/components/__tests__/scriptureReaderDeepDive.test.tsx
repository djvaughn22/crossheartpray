// @vitest-environment jsdom

// The shared Deep Dive inside the one Scripture reader: every chapter read on
// CrossHeartPray (Reading Plan "Read Here", Life Essentials, Bible Bingo 7's
// book readers, Behind the Verse, the homepage connected verse) exposes the
// same verified Greek/Hebrew word study Bible Bingo 7 uses — and never
// fabricates data when a verse has none.
//
// The reader interface: no per-verse buttons. Instead, verified words appear
// as dotted underlines directly in the Scripture text. Clicking a dotted word
// opens the shared OriginalWordStudyModal. Unverified verses remain readable
// without inline failure messages.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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
  if (book === "PSA" && chapter === 3 && verse === 1) {
    return "Lord, how many are my foes! Many are rising against me.";
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

const HEBREW_LORD: VerifiedWordStudy = {
  reference: "Psalms 3:1",
  code: "PSA",
  chapter: "3",
  verse: "1",
  englishWord: "Lord",
  language: "hebrew",
  originalWord: "יְהוָ֣ה",
  transliteration: "Yahweh",
  strongs: "H3068",
  lemma: "יְהוָ֣ה",
  morphology: "HNcmsc",
  sourceGloss: "Yahweh",
  lexiconMeaning: "the divine name",
  sourceName: "STEPBible TAHOT Hebrew alignment",
  lexiconSourceName: "STEPBible TBESH Hebrew brief lexicon",
  sourceUrl: "https://github.com/STEPBible/STEPBible-Data",
};

function wordStudiesFor(code: string | null, chapter: string | null, verse: string | null) {
  if (code === "JHN" && chapter === "3" && verse === "16") return [GREEK_LOVED];
  if (code === "GEN" && chapter === "1" && verse === "1") return [HEBREW_CREATED];
  if (code === "PSA" && chapter === "3" && verse === "1") return [HEBREW_LORD];
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

describe("the shared reader shows dotted-word Deep Dive, not per-verse buttons", () => {
  it("renders an intro explaining dotted words, no per-verse buttons", async () => {
    render(<ScriptureReader initialReference={{ book: "JHN", chapter: 3 }} />);

    await screen.findByRole("heading", { name: "John 3" });
    // Intro text explains the dotted-word interaction.
    expect(
      screen.getByText("Dotted words open the original Hebrew or Greek study."),
    ).toBeTruthy();
    // No per-verse controls.
    expect(screen.queryByRole("button", { name: /Open.*Deep Dive for/ })).toBeNull();
  });

  it("verified words appear as dotted underlines, not just plain text", async () => {
    render(<ScriptureReader initialReference={{ book: "JHN", chapter: 3 }} />);

    await screen.findByRole("heading", { name: "John 3" });
    // The verified word "loved" in John 3:16 is a clickable button with underline styling.
    const lovedButton = await screen.findByRole("button", { name: "loved" });
    expect(lovedButton).toBeTruthy();
    expect(lovedButton.title).toBe("Open Behind the Verse");
    expect(lovedButton.className).toContain("underline");
  });

  it("clicking a dotted word opens the shared Deep Dive modal with that word's study", async () => {
    const user = userEvent.setup();
    render(<ScriptureReader initialReference={{ book: "JHN", chapter: 3 }} />);

    await user.click(await screen.findByRole("button", { name: "loved" }));

    // The shared modal opens.
    await screen.findByRole("dialog", { name: "Behind the Verse" });
    await screen.findByText("Verified Strong's Data");
    // Greek study data is shown.
    expect(screen.getAllByText("G25").length).toBeGreaterThan(0);
  });

  it("an Old Testament verse shows Hebrew words as dotted underlines", async () => {
    const user = userEvent.setup();
    render(<ScriptureReader initialReference={{ book: "GEN", chapter: 1 }} />);

    // "created" in Genesis 1:1 is verified Hebrew.
    const createdButton = await screen.findByRole("button", { name: "created" });
    await user.click(createdButton);

    await screen.findByText("Verified Strong's Data");
    expect(screen.getAllByText("H1254").length).toBeGreaterThan(0);
  });

  it("unverified verses remain readable without inline failure boxes", async () => {
    render(<ScriptureReader initialReference={{ book: "JHN", chapter: 3 }} />);

    await screen.findByRole("heading", { name: "John 3" });
    // The verses render without any large inline failure messages.
    // This ensures unverified verses stay quiet and readable.
    expect(screen.queryByText(/No verified original-language data/)).toBeNull();
  });

  it("Psalms 3:1 loads verified Hebrew word studies (Psalms/Psalm normalization)", async () => {
    const user = userEvent.setup();
    render(<ScriptureReader initialReference={{ book: "PSA", chapter: 3 }} />);

    await screen.findByRole("heading", { name: "Psalms 3" });
    // Verse 1 contains "Lord" which should be matched to the Hebrew study.
    const lordButton = await screen.findByRole("button", { name: "Lord" });
    await user.click(lordButton);

    await screen.findByRole("dialog", { name: "Behind the Verse" });
    // Verify Hebrew word study is shown.
    expect(screen.getAllByText("H3068").length).toBeGreaterThan(0);
  });

  it("navigating to another chapter clears the modal and loads fresh data", async () => {
    const user = userEvent.setup();
    render(<ScriptureReader initialReference={{ book: "JHN", chapter: 3 }} />);

    // Open a word study.
    await user.click(await screen.findByRole("button", { name: "loved" }));
    await screen.findByRole("dialog", { name: "Behind the Verse" });

    // Navigate away.
    await user.click(screen.getByRole("button", { name: "Next chapter, John 4" }));
    await screen.findByRole("heading", { name: "John 4" });
    // Modal is closed.
    expect(screen.queryByRole("dialog", { name: "Behind the Verse" })).toBeNull();
  });

  it("loading Deep Dive data for all verses in a chapter", async () => {
    render(<ScriptureReader initialReference={{ book: "JHN", chapter: 3 }} />);

    // After chapter loads, all 20 verses should have been fetched for Deep Dive data.
    // Only verse 16 has verified data, so only it shows a dotted word.
    await screen.findByRole("button", { name: "loved" });
    // Other verses (without data) should not have word-study buttons.
    expect(screen.queryByRole("button", { name: /text/ })).toBeNull();
  });

  it("Deep Dive fetch failures keep Scripture readable", async () => {
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
        // Simulate network failure for deep dive fetch only.
        return new Response(JSON.stringify({}), { status: 500 });
      }
      return new Response(JSON.stringify({}), { status: 200 });
    });

    render(<ScriptureReader initialReference={{ book: "JHN", chapter: 3 }} />);

    // Scripture still loads and is readable even when Deep Dive data fails.
    await screen.findByRole("heading", { name: "John 3" });
    // No dotted words appear because Deep Dive data fetch failed.
    // The word "loved" exists in the verse text (John 3:16), but it's not
    // rendered as a button because no data was returned from the API.
    expect(screen.queryByRole("button", { name: "loved" })).toBeNull();
  });

  it("keyboard users can activate dotted-word links via Enter", async () => {
    const user = userEvent.setup();
    render(<ScriptureReader initialReference={{ book: "JHN", chapter: 3 }} />);

    const lovedButton = await screen.findByRole("button", { name: "loved" });
    lovedButton.focus();
    expect(document.activeElement).toBe(lovedButton);

    await user.keyboard("{Enter}");

    await screen.findByRole("dialog", { name: "Behind the Verse" });
  });
});

describe("closing Deep Dive never closes the Scripture reader", () => {
  it("Escape in the word-study panel closes the modal", async () => {
    const onCloseWordStudy = vi.fn();

    render(
      <OriginalWordStudyModal
        passage={{
          label: "John 3:16",
          code: "JHN",
          chapter: "3",
          verse: "16",
          text: "For God so loved the world.",
        }}
        wordStudy={GREEK_LOVED}
        wordStudies={[GREEK_LOVED]}
        onClose={onCloseWordStudy}
      />,
    );

    const user = userEvent.setup();
    await user.keyboard("{Escape}");

    expect(onCloseWordStudy).toHaveBeenCalledTimes(1);
  });
});

describe("translation choice persists from the reader", () => {
  it("keeps using the saved translation preference storage key", async () => {
    const { saveTranslationPreference, loadTranslationPreference } = await import(
      "../../lib/scripture"
    );
    saveTranslationPreference(206);
    expect(loadTranslationPreference()).toBe(206);
    expect(window.localStorage.getItem("crossheartpray:scripture:translation:v1")).toBe(
      "206",
    );
  });
});
