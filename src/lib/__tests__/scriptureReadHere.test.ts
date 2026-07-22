// The shared "Read here" experience: reference conversion, the reader-bus
// contract, honest fallback labeling in the reader, and Gene Getz integrity —
// Getz actions appear only for genuinely mapped passages, with only official
// destinations, and are never fabricated.
import { describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  SCRIPTURE_READER_OPEN_EVENT,
  openScriptureReader,
  referenceForPassage,
} from "../scripture";
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

describe("reader bus", () => {
  it("dispatches the open event with the reference", () => {
    const listener = vi.fn();
    const fakeWindow = {
      dispatchEvent: listener,
    };
    vi.stubGlobal("window", fakeWindow);
    try {
      openScriptureReader({ book: "JHN", chapter: 3, verse: 16 });
      expect(listener).toHaveBeenCalledTimes(1);
      const event = listener.mock.calls[0][0] as CustomEvent;
      expect(event.type).toBe(SCRIPTURE_READER_OPEN_EVENT);
      expect(event.detail).toEqual({ reference: { book: "JHN", chapter: 3, verse: 16 } });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("is a safe no-op during SSR (no window)", () => {
    expect(() => openScriptureReader({ book: "JHN", chapter: 3 })).not.toThrow();
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

describe("shared reader overlay (source contract)", () => {
  const overlay = read(path.join("scripture", "ScriptureReaderOverlay.tsx"));

  it("is a real dialog with focus, Escape, and back-button handling", () => {
    expect(overlay).toContain('role="dialog"');
    expect(overlay).toContain('aria-modal="true"');
    expect(overlay).toContain('event.key === "Escape"');
    expect(overlay).toContain("popstate");
    expect(overlay).toContain("panelRef.current?.focus()");
  });

  it("shows Gene Getz actions only for genuinely matched chapters", () => {
    expect(overlay).toContain("getGeneGetzPrinciplesForChapter");
    expect(overlay).toContain("getzMatches.length > 0 ?");
    // Only official destinations: the in-app official video or the official
    // video URL from the verified index — never a constructed Getz URL.
    expect(overlay).toContain("principle.officialVideoUrl");
    expect(overlay).not.toMatch(/bibleprinciples\.org\/[^"']*\$\{/);
  });
});

describe("CardReadMenu Context matters group (source contract)", () => {
  const menu = read("CardReadMenu.tsx");

  it("derives every action from one canonical resolved reference", () => {
    expect(menu).toContain("resolveScriptureSelection(reference)");
    expect(menu).toContain("openScriptureReader(resolved.reference)");
    expect(menu).toContain("openScriptureReader(resolved.chapterReference)");
    // No separately passed hrefs — that was how a card once showed Malachi
    // while its buttons still said Zechariah.
    expect(menu).not.toContain("verseHref");
    expect(menu).not.toContain("chapterHref");
  });

  it("separates staying on CrossHeartPray from leaving for Bible.com", () => {
    expect(menu).toContain("Context matters");
    expect(menu).toContain("Stay on CrossHeartPray");
    expect(menu).toContain("Read chapter here");
    expect(menu).toContain("Other destinations");
    expect(menu).toContain('rel="noopener noreferrer"');
    expect(menu).toContain("on Bible.com in a new tab");
  });

  it("shows the Reading Plan action only for real dataset matches", () => {
    expect(menu).toContain("resolved.readingPlan ? (");
    expect(menu).toContain("resolved.readingPlan.href");
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
