import { describe, expect, it } from "vitest";

import {
  SCRIPTURE_BOOKS,
  adjacentChapter,
  bibleComUrl,
  formatScriptureReference,
  getScriptureBook,
  matchScriptureBooks,
  parseScriptureReference,
  suggestScriptureReferences,
  toUsfmString,
} from "../scripture";
import { bibleChapterUrl, bibleVerseUrl } from "../dailyBibleBingo";

describe("scripture books", () => {
  it("has all 66 books with sane chapter counts", () => {
    expect(SCRIPTURE_BOOKS).toHaveLength(66);
    expect(getScriptureBook("PSA")?.chapters).toBe(150);
    expect(getScriptureBook("JUD")?.chapters).toBe(1);
    expect(getScriptureBook("REV")?.chapters).toBe(22);
  });

  it("never suggests John for '1 John' or vice versa incorrectly", () => {
    expect(matchScriptureBooks("1 John")[0]?.usfm).toBe("1JN");
    expect(matchScriptureBooks("John")[0]?.usfm).toBe("JHN");
    expect(matchScriptureBooks("2 jn")[0]?.usfm).toBe("2JN");
  });

  it("handles roman numerals and ordinal words", () => {
    expect(matchScriptureBooks("II Timothy")[0]?.usfm).toBe("2TI");
    expect(matchScriptureBooks("I Peter")[0]?.usfm).toBe("1PE");
    expect(matchScriptureBooks("III John")[0]?.usfm).toBe("3JN");
    expect(matchScriptureBooks("2nd Kings")[0]?.usfm).toBe("2KI");
    expect(matchScriptureBooks("First Samuel")[0]?.usfm).toBe("1SA");
  });

  it("handles dotted and short abbreviations", () => {
    expect(matchScriptureBooks("Matt.")[0]?.usfm).toBe("MAT");
    expect(matchScriptureBooks("Ps")[0]?.usfm).toBe("PSA");
    expect(matchScriptureBooks("Gen")[0]?.usfm).toBe("GEN");
    expect(matchScriptureBooks("Song of Songs")[0]?.usfm).toBe("SNG");
  });
});

describe("parseScriptureReference (every format from the brief)", () => {
  const cases: Array<[string, string]> = [
    ["John", "JHN"],
    ["John 3", "JHN.3"],
    ["John 3:16", "JHN.3.16"],
    ["Psalm 23", "PSA.23"],
    ["Romans 8", "ROM.8"],
    ["1 Peter", "1PE"],
    ["II Timothy", "2TI"],
    ["Genesis 1", "GEN.1"],
    ["Matt 5", "MAT.5"],
    ["Jn 3.16", "JHN.3.16"],
    ["John 3:16-18", "JHN.3.16-18"],
    ["JHN.3.16", "JHN.3.16"],
    ["1 Kings 8", "1KI.8"],
  ];

  it.each(cases)("parses %s → %s", (input, usfm) => {
    const reference = parseScriptureReference(input);
    expect(reference).not.toBeNull();
    expect(toUsfmString(reference!)).toBe(usfm);
  });

  it("rejects nonsense and out-of-range chapters", () => {
    expect(parseScriptureReference("Bananas 3")).toBeNull();
    expect(parseScriptureReference("John 99")).toBeNull();
    expect(parseScriptureReference("")).toBeNull();
  });

  it("round-trips through format", () => {
    expect(formatScriptureReference(parseScriptureReference("john 3:16")!)).toBe("John 3:16");
    expect(formatScriptureReference(parseScriptureReference("ii tim 2")!)).toBe("2 Timothy 2");
    expect(formatScriptureReference(parseScriptureReference("1 pet")!)).toBe("1 Peter");
  });
});

describe("bibleComUrl", () => {
  it("matches the legacy WEBUS deep-link format exactly", () => {
    expect(bibleComUrl({ book: "JHN", chapter: 3, verse: 16 })).toBe(
      "https://www.bible.com/bible/206/JHN.3.16.WEBUS",
    );
    expect(bibleComUrl({ book: "PSA", chapter: 23 })).toBe(
      "https://www.bible.com/bible/206/PSA.23.WEBUS",
    );
  });

  it("keeps dailyBibleBingo URL builders identical to their historical output", () => {
    expect(bibleVerseUrl({ code: "ROM", chapter: "15", verse: "7" })).toBe(
      "https://www.bible.com/bible/206/ROM.15.7.WEBUS",
    );
    expect(bibleChapterUrl({ code: "ROM", chapter: "15" })).toBe(
      "https://www.bible.com/bible/206/ROM.15.WEBUS",
    );
  });

  it("opens chapter 1 for book-only references", () => {
    expect(bibleComUrl({ book: "JUD" })).toBe("https://www.bible.com/bible/206/JUD.1.WEBUS");
  });

  it("supports other translations for outbound links only", () => {
    expect(bibleComUrl({ book: "JHN", chapter: 3, verse: 16 }, { id: 111, abbreviation: "NIV" })).toBe(
      "https://www.bible.com/bible/111/JHN.3.16.NIV",
    );
  });
});

describe("adjacentChapter", () => {
  it("moves within a book", () => {
    expect(adjacentChapter({ book: "JHN", chapter: 3 }, 1)).toEqual({ book: "JHN", chapter: 4 });
    expect(adjacentChapter({ book: "JHN", chapter: 3 }, -1)).toEqual({ book: "JHN", chapter: 2 });
  });

  it("crosses book boundaries", () => {
    expect(adjacentChapter({ book: "JHN", chapter: 21 }, 1)).toEqual({ book: "ACT", chapter: 1 });
    expect(adjacentChapter({ book: "MAT", chapter: 1 }, -1)).toEqual({ book: "MAL", chapter: 4 });
  });

  it("stops at the ends of the canon", () => {
    expect(adjacentChapter({ book: "GEN", chapter: 1 }, -1)).toBeNull();
    expect(adjacentChapter({ book: "REV", chapter: 22 }, 1)).toBeNull();
  });
});

describe("suggestScriptureReferences", () => {
  it("suggests books for partial names", () => {
    const labels = suggestScriptureReferences("Jo").map((s) => s.label);
    expect(labels).toContain("John");
    expect(labels).toContain("Job");
    expect(labels).toContain("Joel");
  });

  it("suggests the typed chapter plus valid completions", () => {
    const labels = suggestScriptureReferences("John 2").map((s) => s.label);
    expect(labels[0]).toBe("John 2");
    expect(labels).toContain("John 20");
    expect(labels).toContain("John 21");
    expect(labels).not.toContain("John 22");
  });

  it("suggests a single verse for full references", () => {
    const suggestions = suggestScriptureReferences("John 3:16");
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].label).toBe("John 3:16");
    expect(suggestions[0].reference).toEqual({ book: "JHN", chapter: 3, verse: 16 });
  });

  it("handles ordinal books", () => {
    expect(suggestScriptureReferences("1 pe")[0]?.label).toBe("1 Peter");
    expect(suggestScriptureReferences("II Tim")[0]?.label).toBe("2 Timothy");
  });

  it("returns nothing for junk", () => {
    expect(suggestScriptureReferences("xyzzy")).toEqual([]);
    expect(suggestScriptureReferences("")).toEqual([]);
  });
});
