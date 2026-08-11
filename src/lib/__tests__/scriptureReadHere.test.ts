// The shared "Read here" experience: reference conversion, the plan-cell
// destination contract, honest fallback labeling in the reader, and Gene
// Getz integrity — Getz actions appear only for genuinely mapped passages,
// with only official destinations, and are never fabricated.
import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

import { referenceForPassage } from "../scripture";
import {
  getGeneGetzPrinciplesForChapter,
  getGeneGetzPrinciplesForVerse,
  LIFE_ESSENTIALS_PRINCIPLES,
} from "../geneGetzLifeEssentials";

const componentsDir = path.join(__dirname, "..", "..", "components");
const read = (relative: string) =>
  fs.readFileSync(path.join(componentsDir, relative), "utf8");

describe("referenceForPassage", () => {
  it("converts the legacy passage shape, including range verses", () => {
    expect(referenceForPassage({ code: "JHN", chapter: "3", verse: "16" })).toEqual({
      book: "JHN",
      chapter: 3,
      verse: 16,
    });
    expect(referenceForPassage({ code: "JHN", chapter: "3", verse: "16-18" })).toEqual({
      book: "JHN",
      chapter: 3,
      verse: 16,
    });
    expect(referenceForPassage({ code: "PSA", chapter: 23 })).toEqual({
      book: "PSA",
      chapter: 23,
    });
  });

  it("returns null for unparseable passages so callers omit Read here cleanly", () => {
    expect(referenceForPassage({ code: "NOPE", chapter: "3" })).toBeNull();
    expect(referenceForPassage({ code: "JHN", chapter: "banana" })).toBeNull();
  });
});

describe("reader truthfulness (source contract)", () => {
  const reader = read(path.join("scripture", "ScriptureReader.tsx"));

  // The reported bug: the reader silently rendered the local text under
  // another translation's name. No substitution phrasing may come back.
  it("never substitutes one translation's text for another", () => {
    expect(reader).not.toContain("showing the");
    expect(reader).not.toContain("instead.");
    expect(reader).not.toContain("can't be read inside CrossHeartPray yet");
  });

  it("attributes text to what is actually on screen", () => {
    expect(reader).toContain("Reading here: {chapterData?.attribution");
  });

  it("treats a version that lacks the requested book as an error, not a swap", () => {
    // The missing book is named as the permanent fact it is — never a
    // transient failure, and never another Bible under that version's name.
    expect(reader).toContain("translationIncludesBook(readTranslation, current.book)");
    expect(reader).toContain('setLoadError("missingBook")');
    expect(reader).toContain("doesn't include ${");
  });

  it("offers a real retry rather than quietly loading something else", () => {
    expect(reader).toContain("setReloadToken");
    expect(reader).toContain("Try again");
  });
});

describe("Reading Plan modal reader (source contract)", () => {
  const planProgress = read("BibleReadingPlanProgress.tsx");
  const modal = read(path.join("scripture", "KindleReaderModal.tsx"));

  it("opens a modal reader with bounded chapter navigation", () => {
    expect(planProgress).toContain("KindleReaderModal");
    expect(planProgress).toContain("chapterBounds");
  });

  it("keeps the existing completion checkbox — no second progress system", () => {
    expect(planProgress).toContain("toggleReading");
  });

  it("manages one open reader at a time", () => {
    expect(planProgress).toContain("const [readerOpen, setReaderOpen] = useState");
  });

  it("restores from a refresh-safe deep link and writes one back", () => {
    expect(planProgress).toContain('new URLSearchParams(window.location.search).get("focus")');
    expect(planProgress).toContain("window.history.replaceState(");
  });

  it("has a clean modal with focus trap and escape handling", () => {
    expect(modal).toContain("createPortal");
    expect(modal).toContain('key === "Escape"');
  });
});

describe("CardReadMenu Context matters group (source contract)", () => {
  const menu = read("CardReadMenu.tsx");

  it("derives every action from one canonical resolved reference", () => {
    expect(menu).toContain("resolveScriptureSelection(reference)");
    // No separately passed hrefs as props — that was how a card once showed
    // Malachi while its buttons still said Zechariah. Local chapterHref
    // computation from the canonical reference is fine.
    expect(menu).not.toContain("verseHref");
    expect(menu).not.toContain("chapterHref:"); // As a prop, not as a local var
  });

  it("Read here is first action; Read in Bible Plan is second when available", () => {
    expect(menu).toContain("KindleReaderModal");
    expect(menu).toContain("Read here");
    expect(menu).toContain("Open the chapter in CrossHeartPray");
    // Menu items: Read here, Read in Bible Plan (if available).
    expect(menu.match(/role="menuitem"/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("every action stays on CrossHeartPray — no external Bible.com links", () => {
    expect(menu).toContain("Read on CrossHeartPray");
    expect(menu).toContain("Read here");
    expect(menu).toContain("Read in Bible Plan");
    expect(menu).not.toContain("Bible.com");
    expect(menu).not.toContain('target="_blank"');
    expect(menu).not.toContain("bibleComUrl");
  });
});

describe("no one-click external Scripture/resource links (site-wide contract)", () => {
  // The locked rule: no Scripture-related card, menu, button, text link,
  // fallback, or secondary action may send someone to Bible.com, BibleHub,
  // B&H, BiblePrinciples.org, YouTube, or another external Bible/resource
  // site with one click. Citations stay visible as plain text.
  //
  // One scoped, explicit exception (owner decision, 2026-08-10): the shared
  // header's Holy Bible icon (ChpProductNav.tsx) opens YouVersion's official
  // Verse of the Day. That single link's exact destination and markup are
  // locked by chpProductNavBibleIcon.test.ts — this contract still applies
  // to every other file, including the footer (siteFooter.test.ts).
  const BANNED_HREF_HOSTS = [
    "bible.com",
    "biblehub.com",
    "bhpublishinggroup.com",
    "bibleprinciples.org",
    "youtube.com/", // youtube-nocookie.com iframe embeds stay allowed
    "youtu.be",
  ];
  const SCOPED_EXCEPTION_FILES = ["ChpProductNav.tsx"];

  function* sourceFiles(dir: string): Generator<string> {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== "__tests__") yield* sourceFiles(full);
      else if (
        /\.(tsx|ts)$/.test(entry.name) &&
        !/\.test\./.test(entry.name) &&
        !SCOPED_EXCEPTION_FILES.includes(entry.name)
      )
        yield full;
    }
  }

  const srcDir = path.join(__dirname, "..", "..");

  it("no component or page renders an href to a banned Bible/resource host", () => {
    for (const file of [
      ...sourceFiles(path.join(srcDir, "components")),
      ...sourceFiles(path.join(srcDir, "app")),
    ]) {
      const source = fs.readFileSync(file, "utf8");
      for (const host of BANNED_HREF_HOSTS) {
        // href="https://host/..." or href={`https://host/...`} — a clickable exit.
        const clickable = new RegExp(
          String.raw`href=["'{\` ]*[^"'\`}]*${host.replace(/[./]/g, "\\$&")}`,
        );
        expect(
          clickable.test(source),
          `${path.relative(srcDir, file)} renders a one-click link to ${host}`,
        ).toBe(false);
      }
    }
  });
});

describe("Gene Getz mapping integrity", () => {
  it("a genuinely mapped passage produces its principle", () => {
    const matches = getGeneGetzPrinciplesForVerse("GEN", 1, 1);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].principleTitle).toBe("Chosen in Christ");
    expect(matches[0].officialVideoUrl).toMatch(
      /^https:\/\/ssl\.bhpublishinggroup\.com\/QR\/GetzBible\/\d+\/$/,
    );
  });

  it("an unmapped passage produces no Getz action — nothing is fabricated", () => {
    // Genesis 10 (the table of nations) has no Life Essentials principle.
    expect(getGeneGetzPrinciplesForChapter("GEN", 10)).toEqual([]);
    expect(getGeneGetzPrinciplesForVerse("GEN", 10, 1)).toEqual([]);
  });

  it("every principle keeps its verified official destination", () => {
    for (const principle of LIFE_ESSENTIALS_PRINCIPLES) {
      expect(principle.officialVideoUrl.startsWith("https://ssl.bhpublishinggroup.com/QR/GetzBible/")).toBe(
        true,
      );
    }
  });
});
