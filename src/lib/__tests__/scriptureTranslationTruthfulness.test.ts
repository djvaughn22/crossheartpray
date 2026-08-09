// The translation contract, locked.
//
// Owner-reported production bug (2026-08-08): the picker said KJV while the
// reader rendered the Berean Standard Bible under that label. These tests
// exist so the selected version and the Scripture on screen can never
// disagree again.
//
// Assertions deliberately use verses whose wording differs between
// translations, so a mislabeled fallback cannot pass by looking plausible.
// Genesis 1:1 — KJV "the heaven", BSB/WEB "the heavens".
// John 3:16   — KJV "only begotten", BSB "one and only".

import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { GET as getChapter } from "../../app/api/scripture/chapter/route";
import {
  ACTIVE_BIBLE_TRANSLATION,
  localWebProvider,
  pickDefaultTranslation,
} from "../scripture";
import {
  LOCAL_READABLE_TRANSLATIONS,
  localChapterIndex,
  translationIdForBibleComId,
} from "../scripture/localDatasets";
import { SUPPORTED_BIBLE_TRANSLATIONS } from "../scripture/translationConfig";

const KJV = SUPPORTED_BIBLE_TRANSLATIONS.KJV.bibleComId;
const BSB = SUPPORTED_BIBLE_TRANSLATIONS.BSB.bibleComId;
const WEB = SUPPORTED_BIBLE_TRANSLATIONS.WEBUS.bibleComId;

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function chapterRequest(query: string) {
  return new Request(`http://localhost/api/scripture/chapter?${query}`);
}

async function readChapter(query: string) {
  const response = await getChapter(chapterRequest(query));
  return { status: response.status, data: await response.json() };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("each translation renders its own words", () => {
  it("KJV returns real KJV text, never the Berean Standard Bible", async () => {
    const { status, data } = await readChapter(`book=GEN&chapter=1&version=${KJV}`);

    expect(status).toBe(200);
    expect(data.translation.abbreviation).toBe("KJV");
    expect(data.verses[0].text).toBe(
      "In the beginning God created the heaven and the earth.",
    );
    // The BSB reading of the same verse must not appear under KJV.
    expect(data.verses[0].text).not.toContain("the heavens");
  });

  it("KJV John 3:16 reads 'only begotten', not the BSB wording", async () => {
    const { data } = await readChapter(`book=JHN&chapter=3&version=${KJV}`);
    const verse16 = data.verses.find(
      (verse: { verse: number }) => verse.verse === 16,
    );

    expect(verse16.text).toContain("only begotten");
    expect(verse16.text).not.toContain("one and only");
  });

  it("BSB and WEB each return their own distinct wording", async () => {
    const bsb = await readChapter(`book=GEN&chapter=1&version=${BSB}`);
    const web = await readChapter(`book=GEN&chapter=1&version=${WEB}`);

    expect(bsb.data.translation.abbreviation).toBe("BSB");
    expect(bsb.data.verses[0].text).toBe(
      "In the beginning God created the heavens and the earth.",
    );

    expect(web.data.translation.abbreviation).toBe("WEBUS");
    expect(web.data.verses[0].text).toBe(
      "In the beginning, God created the heavens and the earth.",
    );

    expect(bsb.data.verses[0].text).not.toBe(web.data.verses[0].text);
  });

  it("every publicly exposed translation resolves to its own source id", () => {
    for (const translation of LOCAL_READABLE_TRANSLATIONS) {
      expect(
        translationIdForBibleComId(translation.bibleComId),
        translation.id,
      ).toBe(translation.id);
    }
  });

  it("every exposed translation has a complete dataset, not a stub", () => {
    for (const translation of LOCAL_READABLE_TRANSLATIONS) {
      const index = localChapterIndex(translation.id as "BSB" | "WEBUS" | "KJV");
      // All 66 books present, and a known long chapter is fully populated.
      expect(index.size, translation.id).toBe(66);
      expect(index.get("PSA")?.get(119)?.length, translation.id).toBe(176);
    }
  });

  it("the response never claims a translation it did not serve", async () => {
    for (const id of [KJV, BSB, WEB]) {
      const { data } = await readChapter(`book=JHN&chapter=1&version=${id}`);
      expect(data.translation.id, String(id)).toBe(id);
    }
  });
});

describe("the default translation is the site-wide one", () => {
  const readable = (id: number, abbreviation: string) => ({
    id,
    abbreviation,
    label: abbreviation,
    access: "readHere" as const,
    source: "local" as const,
  });

  it("opens in the site-wide translation even when another is listed first", () => {
    // KJV outranks BSB in picker order; that must not change which Bible the
    // reader opens in, or Deep Dive would silently switch off by default.
    const picked = pickDefaultTranslation(
      [readable(KJV, "KJV"), readable(BSB, "BSB"), readable(WEB, "WEBUS")],
      null,
    );

    expect(picked.id).toBe(ACTIVE_BIBLE_TRANSLATION.bibleComId);
    expect(picked.abbreviation).toBe("BSB");
  });

  it("still honours a saved preference over the site-wide default", () => {
    const picked = pickDefaultTranslation(
      [readable(KJV, "KJV"), readable(BSB, "BSB")],
      KJV,
    );

    expect(picked.abbreviation).toBe("KJV");
  });
});

describe("unavailable translations cannot masquerade", () => {
  it("an unlicensed version is an error, never someone else's Scripture", async () => {
    // 111 = NIV on Bible.com: no local dataset, no licence.
    const { status, data } = await readChapter("book=GEN&chapter=1&version=111");

    expect(status).toBeGreaterThanOrEqual(400);
    expect(data.verses).toBeUndefined();
    expect(JSON.stringify(data)).not.toContain("In the beginning");
  });

  it("the picker offers no translation that cannot be rendered", () => {
    for (const translation of localWebProvider.listAvailableTranslations()) {
      expect(translation.access, translation.abbreviation).toBe("readHere");
    }
  });
});

describe("translation is part of Scripture identity", () => {
  it("the request URL always carries the version", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(String(url));
        return new Response(
          JSON.stringify({
            book: "TIT",
            bookName: "Titus",
            chapter: 2,
            chapterCount: 3,
            verses: [{ verse: 1, text: "..." }],
            previous: null,
            next: null,
            attribution: "x",
            translation: { id: KJV, abbreviation: "KJV", label: "KJV" },
          }),
          { status: 200 },
        );
      }),
    );

    await localWebProvider.loadChapter(
      { book: "TIT", chapter: 2 },
      {
        translation: {
          id: KJV,
          abbreviation: "KJV",
          label: "KJV",
          access: "readHere",
          source: "local",
        },
      },
    );

    expect(calls[0]).toContain(`version=${KJV}`);
  });

  it("two translations of one chapter never share a cache entry", async () => {
    const byVersion: Record<number, string> = {
      [KJV]: "KJV text",
      [BSB]: "BSB text",
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const id = Number(new URL(String(url), "http://localhost").searchParams.get("version"));
        return new Response(
          JSON.stringify({
            book: "PHM",
            bookName: "Philemon",
            chapter: 1,
            chapterCount: 1,
            verses: [{ verse: 1, text: byVersion[id] }],
            previous: null,
            next: null,
            attribution: "x",
            translation: { id, abbreviation: String(id), label: String(id) },
          }),
          { status: 200 },
        );
      }),
    );

    const translation = (id: number) => ({
      id,
      abbreviation: String(id),
      label: String(id),
      access: "readHere" as const,
      source: "local" as const,
    });

    const kjv = await localWebProvider.loadChapter(
      { book: "PHM", chapter: 1 },
      { translation: translation(KJV) },
    );
    const bsb = await localWebProvider.loadChapter(
      { book: "PHM", chapter: 1 },
      { translation: translation(BSB) },
    );

    expect(kjv.verses[0].text).toBe("KJV text");
    expect(bsb.verses[0].text).toBe("BSB text");

    // Re-reading the first translation must still give its own text.
    const kjvAgain = await localWebProvider.loadChapter(
      { book: "PHM", chapter: 1 },
      { translation: translation(KJV) },
    );
    expect(kjvAgain.verses[0].text).toBe("KJV text");
  });
});

describe("the reader keeps its promises (source contract)", () => {
  const reader = source("src/components/scripture/ScriptureReader.tsx");

  it("a stale response cannot overwrite a newer translation pick", () => {
    expect(reader).toContain("latestRequestRef");
    expect(reader).toContain("const isStale = ()");
    // Every commit path is guarded, including the cached-instant-resolve case.
    expect(reader).toContain("if (isStale()) return;");
  });

  it("loads the selected translation, with no substitution branch", () => {
    expect(reader).toContain("const readTranslation = translation;");
    expect(reader).not.toMatch(/translations\.find\([^)]*source === "local"/);
  });

  it("navigation and go-to carry the active translation", () => {
    // Both are reference changes; the load effect depends on the translation,
    // so the active pick always travels with them.
    expect(reader).toContain("[current, readTranslation, reloadToken]");
    expect(reader).toContain("translation: readTranslation");
  });

  it("an error state renders no Scripture at all", () => {
    expect(reader).toContain("setChapterData(null);");
    expect(reader).toContain("setLoadFailed(true);");
  });

  it("selector state and rendered metadata are checked against each other", () => {
    // Deep Dive availability is judged on what was actually served.
    expect(reader).toContain("chapterData?.translation?.id ?? translation.id");
  });
});

describe("Deep Dive stays truthful across translations", () => {
  const reader = source("src/components/scripture/ScriptureReader.tsx");

  it("dotted words are offered only on the translation they are aligned to", () => {
    expect(reader).toContain("DEEP_DIVE_ALIGNED_TRANSLATION");
    // The studies handed to VerifiedVerseText are gated on alignment, so an
    // unaligned translation renders plain text with nothing clickable.
    expect(reader).toMatch(
      /const studies\s*=\s*deepDiveAligned\s*\?\s*chapterWordStudies\[studyKey\]\s*\?\?\s*\[\]\s*:\s*\[\]/,
    );
  });

  it("word studies are not even fetched for an unaligned translation", () => {
    expect(reader).toContain("if (!chapterData || !deepDiveAligned) return;");
  });

  it("Deep Dive remains reachable through dotted words on the aligned text", () => {
    expect(reader).toContain("VerifiedVerseText");
    expect(source("src/components/VerifiedVerseText.tsx")).toContain(
      "decoration-dotted",
    );
  });

  it("Life Essentials has not resurrected its own Hebrew/Greek pill", () => {
    const index = source("src/components/GeneGetzFullIndex.tsx");
    expect(index).not.toMatch(/"(Hebrew|Greek|Hebrew\/Greek)"/);
    expect(index).not.toContain("OriginalWordStudyModal");
    expect(index).not.toContain("fetchVerifiedWordStudies");
  });
});
