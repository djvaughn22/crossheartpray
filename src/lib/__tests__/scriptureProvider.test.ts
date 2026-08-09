import { afterEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  ACTIVE_BIBLE_TRANSLATION,
  externalLinkFallbackProvider,
  getScriptureProvider,
  localWebProvider,
  pickDefaultTranslation,
  type ScriptureTranslation,
} from "../scripture";
import { normalizeBookToCode } from "../geneGetzLifeEssentials";
import { SCRIPTURE_BOOK_NAME_TO_CODE } from "../scripture";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("provider selection and capability", () => {
  it("the embedded reader provider is local WEB; YouVersion rides through it server-side", () => {
    expect(getScriptureProvider().id).toBe("localWeb");
    expect(getScriptureProvider().determineReaderCapability()).toBe("embeddedReader");
  });

  it("external fallback provider refuses loadChapter and still offers only real translations", async () => {
    expect(externalLinkFallbackProvider.determineReaderCapability()).toBe("externalLinksOnly");
    await expect(
      externalLinkFallbackProvider.loadChapter({ book: "JHN", chapter: 3 }),
    ).rejects.toThrow(/buildExternalUrl/);
    // Even the degraded provider never advertises a translation it has no
    // text for — that is what produced KJV-labelled BSB on screen.
    expect(
      externalLinkFallbackProvider.listAvailableTranslations().every(
        (translation) => translation.access === "readHere" && translation.source === "local",
      ),
    ).toBe(true);
  });
});

describe("translation truthfulness", () => {
  // The picker is a promise: every name in it renders that translation's own
  // words. A version with no readable text must simply not be offered.
  it("offers only translations that can genuinely be read here", () => {
    const translations = localWebProvider.listAvailableTranslations();
    expect(translations.length).toBeGreaterThan(0);
    for (const translation of translations) {
      expect(translation.access, translation.abbreviation).toBe("readHere");
      expect(translation.source, translation.abbreviation).toBe("local");
    }
  });

  it("offers every public-domain translation that ships a local dataset", () => {
    const abbreviations = localWebProvider
      .listAvailableTranslations()
      .map((translation) => translation.abbreviation);
    expect(abbreviations).toEqual(expect.arrayContaining(["BSB", "WEBUS", "KJV"]));
  });

  it("never offers a translation CrossHeartPray has no licence or text for", () => {
    const abbreviations = localWebProvider
      .listAvailableTranslations()
      .map((translation) => translation.abbreviation);
    for (const unlicensed of ["CSB", "NIV", "ESV", "NLT"]) {
      expect(abbreviations, unlicensed).not.toContain(unlicensed);
    }
  });

  it("the active site-wide translation is among the readable ones", () => {
    const active = localWebProvider
      .listAvailableTranslations()
      .find(
        (translation) =>
          translation.abbreviation === ACTIVE_BIBLE_TRANSLATION.bibleComAbbreviation,
      );
    expect(active?.access).toBe("readHere");
    expect(active?.source).toBe("local");
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
    attribution: ACTIVE_BIBLE_TRANSLATION.attribution,
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
      "https://www.bible.com/bible/3034/PHM.1.BSB",
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
        // BIBLE_TRANSLATION is not a secret: next.config.ts inlines its
        // normalized value into both bundles at build time on purpose.
        expect(match[1], `${file} references process.env.${match[1]}`).toMatch(
          /^(NEXT_PUBLIC_|BIBLE_TRANSLATION$)/,
        );
      }
      // The YouVersion App Key is server-side only: client Scripture code may
      // neither read the env var nor import the server module that holds it.
      for (const banned of [
        "SOCIAL_ADMIN_KEY",
        "META_ACCESS_TOKEN",
        "CRON_SECRET",
        "YVP_APP_KEY",
        "youversionPlatform",
      ]) {
        expect(source.includes(banned), `${file} mentions ${banned}`).toBe(false);
      }
    }
  });
});

describe("truthful default-translation priority", () => {
  // The site-wide translation is BSB (src/lib/scripture/translationConfig.ts).
  const siteWide: ScriptureTranslation = {
    id: ACTIVE_BIBLE_TRANSLATION.bibleComId,
    abbreviation: ACTIVE_BIBLE_TRANSLATION.bibleComAbbreviation,
    label: ACTIVE_BIBLE_TRANSLATION.shortName,
    access: "readHere",
    source: "local",
  };
  const kjvLocal: ScriptureTranslation = {
    id: 1,
    abbreviation: "KJV",
    label: "KJV",
    access: "readHere",
    source: "local",
  };
  const csbReadable: ScriptureTranslation = {
    id: 1713,
    abbreviation: "CSB",
    label: "CSB",
    access: "readHere",
    source: "youVersion",
  };
  const unreadable: ScriptureTranslation = {
    id: 111,
    abbreviation: "NIV",
    label: "NIV",
    access: "bibleComLink",
    source: "bibleCom",
  };

  it("defaults to the site-wide translation, not merely the first local one", () => {
    // KJV is listed first; the default must still be the site-wide Bible.
    expect(pickDefaultTranslation([kjvLocal, siteWide, csbReadable], null)).toBe(siteWide);
  });

  it("the site-wide translation outranks licensed YouVersion translations", () => {
    expect(pickDefaultTranslation([csbReadable, siteWide], null)).toBe(siteWide);
  });

  it("a saved readable preference beats the site default", () => {
    expect(pickDefaultTranslation([siteWide, kjvLocal], kjvLocal.id)).toBe(kjvLocal);
  });

  it("a saved preference that cannot be read here is ignored", () => {
    expect(pickDefaultTranslation([siteWide, kjvLocal, unreadable], unreadable.id)).toBe(
      siteWide,
    );
  });
});
