import { afterEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  externalLinkFallbackProvider,
  getScriptureProvider,
  isYouVersionReady,
  localWebProvider,
  youVersionAppKey,
} from "../scripture";
import { normalizeBookToCode } from "../geneGetzLifeEssentials";
import { SCRIPTURE_BOOK_NAME_TO_CODE } from "../scripture";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("provider selection and capability", () => {
  it("uses the local WEB provider when no YouVersion key is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_YOUVERSION_APP_KEY", "");
    expect(youVersionAppKey()).toBeNull();
    expect(isYouVersionReady()).toBe(false);
    expect(getScriptureProvider().id).toBe("localWeb");
    expect(getScriptureProvider().determineReaderCapability()).toBe("embeddedReader");
  });

  it("stays on local WEB even with a key while the SDK is not installed", () => {
    vi.stubEnv("NEXT_PUBLIC_YOUVERSION_APP_KEY", "some-future-key");
    expect(youVersionAppKey()).toBe("some-future-key");
    expect(isYouVersionReady()).toBe(false);
    expect(getScriptureProvider().id).toBe("localWeb");
  });

  it("external fallback provider offers links only and refuses loadChapter", async () => {
    expect(externalLinkFallbackProvider.determineReaderCapability()).toBe("externalLinksOnly");
    await expect(
      externalLinkFallbackProvider.loadChapter({ book: "JHN", chapter: 3 }),
    ).rejects.toThrow(/buildExternalUrl/);
    expect(
      externalLinkFallbackProvider.listAvailableTranslations().every(
        (translation) => translation.access === "bibleComLink",
      ),
    ).toBe(true);
  });
});

describe("translation truthfulness", () => {
  it("only WEB is readable inside CrossHeartPray without the SDK", () => {
    const translations = localWebProvider.listAvailableTranslations();
    const web = translations.find((translation) => translation.abbreviation === "WEBUS");
    expect(web?.access).toBe("readHere");
    for (const translation of translations) {
      if (translation.abbreviation !== "WEBUS") {
        expect(translation.access).toBe("bibleComLink");
      }
    }
  });

  it("licensed translations build correct external Bible.com links", () => {
    const niv = localWebProvider
      .listAvailableTranslations()
      .find((translation) => translation.abbreviation === "NIV")!;
    expect(
      localWebProvider.buildExternalUrl({ book: "JHN", chapter: 3, verse: 16 }, niv),
    ).toBe("https://www.bible.com/bible/111/JHN.3.16.NIV");
  });
});

describe("localWeb chapter loading", () => {
  const payload = {
    book: "TIT",
    bookName: "Titus",
    chapter: 2,
    chapterCount: 3,
    verses: [{ verse: 1, text: "..." }],
    previous: { book: "TIT", chapter: 1 },
    next: { book: "TIT", chapter: 3 },
    attribution: "World English Bible (WEB), public domain.",
  };

  it("loads a chapter and caches repeat reads", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const first = await localWebProvider.loadChapter({ book: "TIT", chapter: 2 });
    expect(first.bookName).toBe("Titus");
    expect(first.next).toEqual({ book: "TIT", chapter: 3 });

    const second = await localWebProvider.loadChapter({ book: "TIT", chapter: 2 });
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects on a failed request so callers can fall back to Bible.com", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    await expect(localWebProvider.loadChapter({ book: "PHM", chapter: 1 })).rejects.toThrow(
      /unavailable/,
    );
    // The fallback URL still works without any network.
    expect(localWebProvider.buildExternalUrl({ book: "PHM", chapter: 1 })).toBe(
      "https://www.bible.com/bible/206/PHM.1.WEBUS",
    );
  });
});

describe("reference operations through the provider", () => {
  it("rejects malformed references", () => {
    expect(localWebProvider.resolveReference("Bananas 3")).toBeNull();
    expect(localWebProvider.resolveReference("")).toBeNull();
  });

  it("handles roman numerals and abbreviations", () => {
    expect(localWebProvider.resolveReference("II Timothy 2")).toEqual({
      book: "2TI",
      chapter: 2,
    });
    expect(localWebProvider.suggestReferences("1 pe")[0]?.label).toBe("1 Peter");
    expect(localWebProvider.suggestReferences("Matt 5")[0]?.label).toBe("Matthew 5");
  });
});

describe("legacy book resolvers now delegate to the shared table", () => {
  it("normalizeBookToCode keeps its old accepted spellings", () => {
    expect(normalizeBookToCode("1 jn")).toBe("1JN");
    expect(normalizeBookToCode("1 John")).toBe("1JN");
    expect(normalizeBookToCode("song of songs")).toBe("SNG");
    expect(normalizeBookToCode("revelations")).toBe("REV");
    expect(normalizeBookToCode("rv")).toBe("REV");
    expect(normalizeBookToCode("jd")).toBe("JUD");
    expect(normalizeBookToCode("GEN")).toBe("GEN");
    expect(normalizeBookToCode("")).toBe("");
    expect(normalizeBookToCode("nonsense")).toBe("");
  });

  it("the display-name table covers all 66 books plus display variants", () => {
    expect(SCRIPTURE_BOOK_NAME_TO_CODE).toHaveLength(68);
    const lookup = new Map(SCRIPTURE_BOOK_NAME_TO_CODE);
    expect(lookup.get("Psalm")).toBe("PSA");
    expect(lookup.get("Psalms")).toBe("PSA");
    expect(lookup.get("Song of Songs")).toBe("SNG");
    expect(lookup.get("Song of Solomon")).toBe("SNG");
    expect(lookup.get("Revelation")).toBe("REV");
  });
});

describe("no server-only secrets in client Scripture code", () => {
  const roots = [
    path.join(__dirname, "..", "scripture"),
    path.join(__dirname, "..", "..", "components", "scripture"),
  ];

  function sourceFiles(dir: string): string[] {
    return fs
      .readdirSync(dir)
      .filter((name) => name.endsWith(".ts") || name.endsWith(".tsx"))
      .map((name) => path.join(dir, name));
  }

  it("only NEXT_PUBLIC_ env vars are referenced", () => {
    for (const file of roots.flatMap(sourceFiles)) {
      const source = fs.readFileSync(file, "utf8");
      for (const match of source.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
        expect(match[1], `${file} references process.env.${match[1]}`).toMatch(/^NEXT_PUBLIC_/);
      }
      for (const banned of ["SOCIAL_ADMIN_KEY", "META_ACCESS_TOKEN", "CRON_SECRET"]) {
        expect(source.includes(banned), `${file} mentions ${banned}`).toBe(false);
      }
    }
  });
});
