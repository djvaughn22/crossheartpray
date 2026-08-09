// @vitest-environment jsdom

// The reader's translation contract, asserted on RENDERED SCRIPTURE.
//
// Owner-reported production bug (2026-08-08): the picker changed its label
// while the Scripture body stayed the same translation. Labels, attribution
// and React state are all things that can agree with each other and still be
// wrong, so every assertion here reads the actual verse text on screen.
//
// Known-distinct wording, chosen so a mislabeled fallback cannot pass by
// looking plausible:
//   Genesis 1:1 — KJV "the heaven",     BSB "the heavens"
//   John 3:16   — KJV "only begotten",  BSB "one and only"
//
// Also locked here, from the same investigation:
//   - an interrupted Deep Dive load must never permanently disable dotted
//     words for that chapter (the header promises them; it has to be true);
//   - a translation that does not contain the book on screen is never
//     advertised as readable for it, and never silently replaced by another
//     Bible.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ScriptureReader from "../scripture/ScriptureReader";
import { getScriptureBook } from "../../lib/scripture";
import type { VerifiedWordStudy } from "../../lib/originalLanguageWordStudy";

Element.prototype.scrollIntoView = vi.fn();
Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;

const KJV_ID = 1;
const BSB_ID = 3034;
const WEB_ID = 206;
const TCENT_ID = 3427;

// Every book code TCENT actually contains: the New Testament only. This is
// the shape /api/scripture/translations really returns for it.
const NEW_TESTAMENT = [
  "MAT", "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH",
  "PHP", "COL", "1TH", "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAS",
  "1PE", "2PE", "1JN", "2JN", "3JN", "JUD", "REV",
];

const TRANSLATIONS = [
  { id: BSB_ID, abbreviation: "BSB", label: "BSB", access: "readHere", source: "local" },
  { id: WEB_ID, abbreviation: "WEBUS", label: "WEB", access: "readHere", source: "local" },
  { id: KJV_ID, abbreviation: "KJV", label: "KJV", access: "readHere", source: "local" },
  {
    id: TCENT_ID,
    abbreviation: "TCENT",
    label: "TCENT",
    access: "readHere",
    source: "youVersion",
    books: NEW_TESTAMENT,
  },
];

// Genuine wording per translation — never the same string under two names.
const TEXT: Record<number, Record<string, string>> = {
  [KJV_ID]: {
    "GEN|1|1": "In the beginning God created the heaven and the earth.",
    "JHN|3|16":
      "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
  },
  [BSB_ID]: {
    "GEN|1|1": "In the beginning God created the heavens and the earth.",
    "JHN|3|16":
      "For God so loved the world that He gave His one and only Son, that everyone who believes in Him shall not perish but have eternal life.",
  },
  [WEB_ID]: {
    "GEN|1|1": "In the beginning, God created the heavens and the earth.",
    "JHN|3|16":
      "For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.",
  },
  [TCENT_ID]: {
    "JHN|3|16":
      "For God loved the world in this way: He gave his one and only Son, so that whoever believes in him should not perish but have eternal life.",
  },
};

const ATTRIBUTION: Record<number, string> = {
  [KJV_ID]: "King James Version (KJV), public domain.",
  [BSB_ID]: "Berean Standard Bible (BSB), public domain.",
  [WEB_ID]: "World English Bible (WEB), public domain.",
  [TCENT_ID]: "Text-Critical English New Testament (TCENT), via YouVersion.",
};

const ABBREVIATION: Record<number, string> = {
  [KJV_ID]: "KJV",
  [BSB_ID]: "BSB",
  [WEB_ID]: "WEBUS",
  [TCENT_ID]: "TCENT",
};

function verseText(versionId: number, book: string, chapter: number, verse: number) {
  return (
    TEXT[versionId]?.[`${book}|${chapter}|${verse}`] ??
    `${ABBREVIATION[versionId]} ${book} ${chapter}:${verse} text.`
  );
}

function chapterPayload(versionId: number, book: string, chapter: number) {
  const definition = getScriptureBook(book);
  return {
    book,
    bookName: definition?.name ?? book,
    chapter,
    chapterCount: definition?.chapters ?? 1,
    verses: Array.from({ length: 20 }, (_, index) => ({
      verse: index + 1,
      text: verseText(versionId, book, chapter, index + 1),
    })),
    previous: chapter > 1 ? { book, chapter: chapter - 1 } : null,
    next: chapter < (definition?.chapters ?? 1) ? { book, chapter: chapter + 1 } : null,
    attribution: ATTRIBUTION[versionId],
    translation: {
      id: versionId,
      abbreviation: ABBREVIATION[versionId],
      label: versionId === WEB_ID ? "WEB" : ABBREVIATION[versionId],
    },
  };
}

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

/** Deep Dive requests hang (until aborted) while this is true. */
let hangWordStudies = false;
let wordStudyRequests = 0;

beforeEach(() => {
  window.localStorage.clear();
  hangWordStudies = false;
  wordStudyRequests = 0;

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("/api/scripture/translations")) {
        return new Response(JSON.stringify({ translations: TRANSLATIONS }), { status: 200 });
      }

      if (url.includes("/api/scripture/chapter")) {
        const params = new URL(url, "https://crossheartpray.com").searchParams;
        const book = params.get("book") ?? "";
        const chapter = Number(params.get("chapter") ?? "1");
        const versionId = Number(params.get("version") ?? String(BSB_ID));

        // The server never serves a book a translation does not contain.
        if (versionId === TCENT_ID && !NEW_TESTAMENT.includes(book)) {
          return new Response(
            JSON.stringify({ error: "TCENT does not include that book." }),
            { status: 404 },
          );
        }
        return new Response(JSON.stringify(chapterPayload(versionId, book, chapter)), {
          status: 200,
        });
      }

      if (url.includes("deep-dive-word-studies")) {
        wordStudyRequests += 1;
        const params = new URL(url).searchParams;
        const match =
          params.get("code") === "GEN" &&
          params.get("chapter") === "1" &&
          params.get("verse") === "1";

        if (hangWordStudies) {
          // Never resolves on its own — only the reader's abort settles it,
          // exactly like a switch away mid-fetch in a real browser.
          return new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            );
          });
        }

        return new Response(
          JSON.stringify({ wordStudies: match ? [HEBREW_CREATED] : [] }),
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

/** Open the picker and choose a Bible by its full name. */
async function chooseBible(user: ReturnType<typeof userEvent.setup>, fullName: string) {
  await user.click(screen.getByRole("button", { name: /Choose a Bible/ }));
  const card = await screen.findByRole("button", { name: new RegExp(fullName) });
  await user.click(card);
}

function verseOnScreen(verse: number) {
  const node = document.querySelector(`[data-verse="${verse}"]`);
  return node?.textContent?.replace(/^\d+/, "").trim() ?? "";
}

describe("changing the Bible changes the Scripture on screen", () => {
  it("Genesis 1:1 moves between real BSB and real KJV wording, repeatedly", async () => {
    const user = userEvent.setup();
    render(<ScriptureReader initialReference={{ book: "GEN", chapter: 1 }} />);

    await screen.findByRole("heading", { name: "Genesis 1" });
    await waitFor(() => expect(verseOnScreen(1)).toContain("the heavens"));
    expect(verseOnScreen(1)).toBe(TEXT[BSB_ID]["GEN|1|1"]);

    await chooseBible(user, "King James Version");
    await waitFor(() => expect(verseOnScreen(1)).toBe(TEXT[KJV_ID]["GEN|1|1"]));
    // The distinguishing word, asserted directly.
    expect(verseOnScreen(1)).toContain("the heaven and");
    expect(verseOnScreen(1)).not.toContain("the heavens");

    await chooseBible(user, "Berean Standard Bible");
    await waitFor(() => expect(verseOnScreen(1)).toBe(TEXT[BSB_ID]["GEN|1|1"]));
    expect(verseOnScreen(1)).toContain("the heavens");

    // And back again — a second switch must not serve the first one's cache.
    await chooseBible(user, "King James Version");
    await waitFor(() => expect(verseOnScreen(1)).toBe(TEXT[KJV_ID]["GEN|1|1"]));
  });

  it("John 3:16 shows KJV's 'only begotten' and BSB's own distinct wording", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("crossheartpray:scripture:translation:v1", String(KJV_ID));
    render(<ScriptureReader initialReference={{ book: "JHN", chapter: 3 }} />);

    await screen.findByRole("heading", { name: "John 3" });
    await waitFor(() => expect(verseOnScreen(16)).toContain("only begotten"));
    expect(verseOnScreen(16)).toContain("whosoever believeth");

    await chooseBible(user, "Berean Standard Bible");
    await waitFor(() => expect(verseOnScreen(16)).toBe(TEXT[BSB_ID]["JHN|3|16"]));
    // BSB must never masquerade as the KJV wording.
    expect(verseOnScreen(16)).not.toContain("only begotten");
    expect(verseOnScreen(16)).toContain("one and only");
  });

  it("WEB is its own text, not BSB wearing WEB's name", async () => {
    const user = userEvent.setup();
    render(<ScriptureReader initialReference={{ book: "GEN", chapter: 1 }} />);

    await screen.findByRole("heading", { name: "Genesis 1" });
    await waitFor(() => expect(verseOnScreen(1)).toBe(TEXT[BSB_ID]["GEN|1|1"]));

    await chooseBible(user, "World English Bible");
    await waitFor(() => expect(verseOnScreen(1)).toBe(TEXT[WEB_ID]["GEN|1|1"]));
    expect(verseOnScreen(1)).not.toBe(TEXT[BSB_ID]["GEN|1|1"]);
  });

  it("the attribution names the translation actually rendered", async () => {
    const user = userEvent.setup();
    render(<ScriptureReader initialReference={{ book: "GEN", chapter: 1 }} />);

    await screen.findByRole("heading", { name: "Genesis 1" });
    await chooseBible(user, "King James Version");

    await waitFor(() => expect(verseOnScreen(1)).toBe(TEXT[KJV_ID]["GEN|1|1"]));
    expect(screen.getByText(`Reading here: ${ATTRIBUTION[KJV_ID]}`)).toBeTruthy();
  });

  it("keeps the chosen translation when moving to the next chapter", async () => {
    const user = userEvent.setup();
    render(<ScriptureReader initialReference={{ book: "GEN", chapter: 1 }} />);

    await screen.findByRole("heading", { name: "Genesis 1" });
    await chooseBible(user, "King James Version");
    await waitFor(() => expect(verseOnScreen(1)).toBe(TEXT[KJV_ID]["GEN|1|1"]));

    await user.click(screen.getByRole("button", { name: /Next chapter/ }));
    await screen.findByRole("heading", { name: "Genesis 2" });
    expect(screen.getByText(`Reading here: ${ATTRIBUTION[KJV_ID]}`)).toBeTruthy();
  });
});

describe("Deep Dive belongs to the translation it was verified against", () => {
  it("dots BSB words and leaves KJV as plain, honest Scripture", async () => {
    const user = userEvent.setup();
    render(<ScriptureReader initialReference={{ book: "GEN", chapter: 1 }} />);

    await screen.findByRole("heading", { name: "Genesis 1" });
    // BSB: the verified word is clickable.
    await screen.findByRole("button", { name: "created" });

    await chooseBible(user, "King James Version");
    await waitFor(() => expect(verseOnScreen(1)).toBe(TEXT[KJV_ID]["GEN|1|1"]));
    // KJV: no dotted words, and the header says why.
    expect(screen.queryByRole("button", { name: "created" })).toBeNull();
    expect(
      screen.getByText(/verified against the BSB. Switch to it to open words here./),
    ).toBeTruthy();
    // KJV is never rebuilt out of BSB tokens.
    expect(verseOnScreen(1)).toBe(TEXT[KJV_ID]["GEN|1|1"]);
  });

  it("a Deep Dive load interrupted mid-fetch recovers instead of dying for good", async () => {
    const user = userEvent.setup();
    // The reader opens in KJV, so the first BSB visit is what starts the
    // chapter's word-study load.
    window.localStorage.setItem("crossheartpray:scripture:translation:v1", String(KJV_ID));
    hangWordStudies = true;

    render(<ScriptureReader initialReference={{ book: "GEN", chapter: 1 }} />);
    await screen.findByRole("heading", { name: "Genesis 1" });
    await waitFor(() => expect(verseOnScreen(1)).toBe(TEXT[KJV_ID]["GEN|1|1"]));

    // First BSB visit: the word-study fetch starts but never lands.
    await chooseBible(user, "Berean Standard Bible");
    await waitFor(() => expect(verseOnScreen(1)).toBe(TEXT[BSB_ID]["GEN|1|1"]));
    await waitFor(() => expect(wordStudyRequests).toBeGreaterThan(0));
    expect(screen.queryByRole("button", { name: "created" })).toBeNull();

    // Switching away aborts it mid-flight.
    await chooseBible(user, "King James Version");
    await waitFor(() => expect(verseOnScreen(1)).toBe(TEXT[KJV_ID]["GEN|1|1"]));

    // Coming back must try again — the chapter was never actually loaded.
    hangWordStudies = false;
    await chooseBible(user, "Berean Standard Bible");
    await waitFor(() => expect(verseOnScreen(1)).toBe(TEXT[BSB_ID]["GEN|1|1"]));

    // The header promises dotted words; they have to actually be there.
    expect(
      screen.getByText("Dotted words open the original Hebrew or Greek study."),
    ).toBeTruthy();
    await screen.findByRole("button", { name: "created" });
  });
});

describe("the picker never offers a Bible that cannot render this passage", () => {
  it("marks a New Testament translation unavailable on Genesis, and disables it", async () => {
    const user = userEvent.setup();
    render(<ScriptureReader initialReference={{ book: "GEN", chapter: 1 }} />);

    await screen.findByRole("heading", { name: "Genesis 1" });
    await user.click(screen.getByRole("button", { name: /Choose a Bible/ }));
    await user.click(await screen.findByRole("button", { name: /More translations/ }));

    const tcent = await screen.findByRole("button", {
      name: /Text-Critical English New Testament/,
    });
    expect(tcent.textContent).toContain("Doesn't include Genesis");
    expect(tcent.textContent).not.toContain("Reads inside CrossHeartPray");
    expect((tcent as HTMLButtonElement).disabled).toBe(true);
  });

  it("offers that same translation normally where it does have the book", async () => {
    const user = userEvent.setup();
    render(<ScriptureReader initialReference={{ book: "JHN", chapter: 3 }} />);

    await screen.findByRole("heading", { name: "John 3" });
    await user.click(screen.getByRole("button", { name: /Choose a Bible/ }));
    await user.click(await screen.findByRole("button", { name: /More translations/ }));

    const tcent = await screen.findByRole("button", {
      name: /Text-Critical English New Testament/,
    });
    expect(tcent.textContent).toContain("Reads inside CrossHeartPray");
    expect((tcent as HTMLButtonElement).disabled).toBe(false);
  });

  it("says plainly why the book is missing, with no Try again that cannot work", async () => {
    // A saved TCENT preference carried into Genesis — reachable in real use
    // by reading the New Testament in TCENT and then navigating back.
    window.localStorage.setItem("crossheartpray:scripture:translation:v1", String(TCENT_ID));
    render(<ScriptureReader initialReference={{ book: "GEN", chapter: 1 }} />);

    expect(
      await screen.findByText(
        "TCENT doesn't include Genesis. Choose another Bible to read it here.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    // No other Bible is quietly substituted under TCENT's name.
    expect(document.querySelector("[data-verse]")).toBeNull();
  });
});
