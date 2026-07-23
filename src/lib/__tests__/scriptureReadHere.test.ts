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

  it("names WEB plainly when falling back from a licensed translation", () => {
    expect(reader).toContain("showing the World English Bible (WEB) instead.");
  });

  it("attributes text to what is actually on screen", () => {
    expect(reader).toContain("Reading here: {chapterData?.attribution");
  });

  it("skips versions that genuinely lack the requested book", () => {
    expect(reader).toContain("doesn't include this book");
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
    // Menu items: Read here, Read in Bible Plan (if available), Open verse in Bible.com, Open chapter in Bible.com
    expect(menu.match(/role="menuitem"/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("separates internal CrossHeartPray actions from external Bible.com links", () => {
    expect(menu).toContain("Read on CrossHeartPray");
    expect(menu).toContain("Read here");
    expect(menu).toContain("Read in Bible Plan");
    expect(menu).toContain("Open on Bible.com");
    expect(menu).toContain("Open verse in Bible.com");
    expect(menu).toContain("Open chapter in Bible.com");
    expect(menu).toContain('rel="noopener noreferrer"');
    expect(menu).toContain("in a new tab");
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
