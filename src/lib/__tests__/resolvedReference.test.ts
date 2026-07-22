import { describe, expect, it } from "vitest";

import {
  bibleComUrlForTranslation,
  resolveScriptureSelection,
} from "../scripture";

describe("resolveScriptureSelection — one canonical resolved reference", () => {
  it("resolves Malachi 4:6 with every derived value agreeing (the Zechariah regression)", () => {
    // A previously selected Zechariah reference must leave no trace: the
    // resolver is stateless, and every field of the result is Malachi.
    resolveScriptureSelection("Zechariah 4");

    const resolved = resolveScriptureSelection("Malachi 4:6");

    expect(resolved).not.toBeNull();
    expect(resolved?.bookCode).toBe("MAL");
    expect(resolved?.bookName).toBe("Malachi");
    expect(resolved?.label).toBe("Malachi 4:6");
    expect(resolved?.chapterLabel).toBe("Malachi 4");
    expect(resolved?.usfm).toBe("MAL.4.6");
    expect(resolved?.reference).toEqual({ book: "MAL", chapter: 4, verse: 6 });
    expect(resolved?.chapterReference).toEqual({ book: "MAL", chapter: 4 });
    expect(resolved?.bibleComUrl).toBe(
      "https://www.bible.com/bible/206/MAL.4.6.WEBUS",
    );
    expect(resolved?.bibleComChapterUrl).toBe(
      "https://www.bible.com/bible/206/MAL.4.WEBUS",
    );

    // The real Reading Plan destination, from the actual dataset.
    expect(resolved?.readingPlan).toEqual({
      week: 48,
      daySlug: "friday",
      dayLabel: "Friday",
      lane: "Prophecy",
      reading: "Malachi",
      href: "/bible-reading-plan?week=48&day=friday#week-48-friday",
      label: "Week 48 · Friday — Malachi",
    });

    // Nothing anywhere in the resolved object may still say Zechariah.
    const serialized = JSON.stringify(resolved);
    expect(serialized).not.toContain("Zechariah");
    expect(serialized).not.toContain("ZEC");
  });

  it("resolves Zechariah 4 to its own distinct Reading Plan entry", () => {
    const resolved = resolveScriptureSelection("Zechariah 4");

    expect(resolved?.bookCode).toBe("ZEC");
    expect(resolved?.readingPlan?.reading).toBe("Zechariah 1-7");
    expect(resolved?.readingPlan?.week).not.toBe(48);
  });

  it("resolves a book-only selection to chapter 1", () => {
    const resolved = resolveScriptureSelection("Revelation");

    expect(resolved?.bookCode).toBe("REV");
    expect(resolved?.chapter).toBe(1);
    expect(resolved?.label).toBe("Revelation 1");
    expect(resolved?.verse).toBeUndefined();
  });

  it("resolves verse ranges", () => {
    const resolved = resolveScriptureSelection("John 3:16-18");

    expect(resolved?.label).toBe("John 3:16-18");
    expect(resolved?.endVerse).toBe(18);
    expect(resolved?.bibleComUrl).toBe(
      "https://www.bible.com/bible/206/JHN.3.16-18.WEBUS",
    );
  });

  it("resolves ordinal books like 1 John 4:8", () => {
    const resolved = resolveScriptureSelection("1 John 4:8");

    expect(resolved?.bookCode).toBe("1JN");
    expect(resolved?.label).toBe("1 John 4:8");
  });

  it("returns null for unknown books and out-of-range chapters", () => {
    expect(resolveScriptureSelection("Zzz 9")).toBeNull();
    expect(resolveScriptureSelection("Malachi 5")).toBeNull();
    expect(resolveScriptureSelection({ book: "XXX", chapter: 1 })).toBeNull();
  });

  it("accepts structured references too", () => {
    const resolved = resolveScriptureSelection({ book: "MAL", chapter: 4, verse: 6 });
    expect(resolved?.label).toBe("Malachi 4:6");
  });
});

describe("bibleComUrlForTranslation", () => {
  it("uses the selected translation when Bible.com supports it", () => {
    expect(
      bibleComUrlForTranslation(
        { book: "MAL", chapter: 4, verse: 6 },
        { id: 1, abbreviation: "KJV" },
      ),
    ).toBe("https://www.bible.com/bible/1/MAL.4.6.KJV");
  });

  it("falls back safely to WEB when the translation lacks a usable code", () => {
    expect(
      bibleComUrlForTranslation(
        { book: "MAL", chapter: 4, verse: 6 },
        { id: 0, abbreviation: "" },
      ),
    ).toBe("https://www.bible.com/bible/206/MAL.4.6.WEBUS");

    expect(bibleComUrlForTranslation({ book: "MAL", chapter: 4, verse: 6 })).toBe(
      "https://www.bible.com/bible/206/MAL.4.6.WEBUS",
    );
  });
});
