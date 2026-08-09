// The centralized translation architecture: one configuration decides the
// translation everywhere, BSB is the default, WEBUS stays a fully working
// fallback, and no surface hard-codes its own translation.
import { afterEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  DEFAULT_BIBLE_TRANSLATION,
  ACTIVE_BIBLE_TRANSLATION,
  FALLBACK_BIBLE_TRANSLATION,
  SUPPORTED_BIBLE_TRANSLATIONS,
  parseConfiguredTranslation,
} from "../scripture/translationConfig";
import { LOCAL_BIBLE_VERSES } from "../localBibleVerses";
import { BSB_BIBLE_VERSES } from "../bibleText/bsbBibleVerses";
import { WEBUS_BIBLE_VERSES } from "../bibleText/webusBibleVerses";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("central translation configuration", () => {
  it("defaults to BSB when no environment override exists", () => {
    expect(FALLBACK_BIBLE_TRANSLATION).toBe("BSB");
    expect(DEFAULT_BIBLE_TRANSLATION).toBe("BSB");
    expect(ACTIVE_BIBLE_TRANSLATION.name).toBe("Berean Standard Bible");
    expect(LOCAL_BIBLE_VERSES).toBe(BSB_BIBLE_VERSES);
  });

  it("validates configured values against the registry", () => {
    expect(parseConfiguredTranslation("BSB")).toBe("BSB");
    expect(parseConfiguredTranslation("WEBUS")).toBe("WEBUS");
    expect(parseConfiguredTranslation(" webus ")).toBe("WEBUS");
    expect(parseConfiguredTranslation("NIV")).toBeNull();
    expect(parseConfiguredTranslation("nonsense")).toBeNull();
    expect(parseConfiguredTranslation("")).toBeNull();
    expect(parseConfiguredTranslation(undefined)).toBeNull();
  });

  it("BIBLE_TRANSLATION=WEBUS switches the whole provider stack, no page edits", async () => {
    vi.stubEnv("BIBLE_TRANSLATION", "WEBUS");
    vi.resetModules();

    const config = await import("../scripture/translationConfig");
    expect(config.DEFAULT_BIBLE_TRANSLATION).toBe("WEBUS");
    expect(config.ACTIVE_BIBLE_TRANSLATION.bibleComId).toBe(206);

    const dataset = await import("../localBibleVerses");
    expect(dataset.LOCAL_BIBLE_VERSES[0].text).toBe(
      "In the beginning, God created the heavens and the earth.",
    );

    const reference = await import("../scripture/reference");
    expect(reference.BIBLE_COM_DEFAULT_VERSION).toEqual({
      id: 206,
      abbreviation: "WEBUS",
      label: "WEB",
    });
    expect(reference.bibleComUrl({ book: "JHN", chapter: 3, verse: 16 })).toBe(
      "https://www.bible.com/bible/206/JHN.3.16.WEBUS",
    );
  });

  it("an invalid BIBLE_TRANSLATION value falls back safely to BSB", async () => {
    // NIV has no local dataset and is not in the registry.
    vi.stubEnv("BIBLE_TRANSLATION", "NIV");
    vi.resetModules();

    const config = await import("../scripture/translationConfig");
    expect(config.DEFAULT_BIBLE_TRANSLATION).toBe("BSB");

    const dataset = await import("../localBibleVerses");
    expect(dataset.LOCAL_BIBLE_VERSES[0].text).toBe(
      "In the beginning God created the heavens and the earth.",
    );
  });

  it("the dataset selector and the config can never disagree", async () => {
    // The selector's bare env comparison and parseConfiguredTranslation must
    // pick the same translation for every value next.config.ts can inline
    // (it always inlines a normalized registry key).
    for (const value of Object.keys(SUPPORTED_BIBLE_TRANSLATIONS)) {
      vi.stubEnv("BIBLE_TRANSLATION", value);
      vi.resetModules();
      const config = await import("../scripture/translationConfig");
      const dataset = await import("../localBibleVerses");
      // Genesis 1:1 reads differently in each supported translation, so a
      // selector that folded to the wrong dataset could not pass silently.
      const expectedByTranslation: Record<string, string> = {
        WEBUS: "In the beginning, God created the heavens and the earth.",
        BSB: "In the beginning God created the heavens and the earth.",
        KJV: "In the beginning God created the heaven and the earth.",
      };
      expect(dataset.LOCAL_BIBLE_VERSES[0].text, value).toBe(
        expectedByTranslation[config.DEFAULT_BIBLE_TRANSLATION],
      );
    }
  });
});

describe("BSB dataset integrity (official Berean text, both Testaments)", () => {
  const verse = (code: string, chapter: string, verseNo: string) =>
    BSB_BIBLE_VERSES.find(
      (entry) => entry.code === code && entry.chapter === chapter && entry.verse === verseNo,
    );

  it("resolves representative Old Testament verses exactly", () => {
    expect(verse("GEN", "1", "1")?.text).toBe(
      "In the beginning God created the heavens and the earth.",
    );
    expect(verse("PSA", "23", "1")?.text).toBe(
      "A Psalm of David. The LORD is my shepherd; I shall not want.",
    );
  });

  it("resolves representative New Testament verses exactly", () => {
    expect(verse("JHN", "3", "16")?.text).toBe(
      "For God so loved the world that He gave His one and only Son, that everyone who believes in Him shall not perish but have eternal life.",
    );
    expect(verse("ROM", "8", "28")?.text).toBe(
      "And we know that God works all things together for the good of those who love Him, who are called according to His purpose.",
    );
  });

  it("covers all 66 books and every chapter the WEB dataset covers", () => {
    const chapters = (verses: typeof BSB_BIBLE_VERSES) =>
      new Set(verses.map((entry) => `${entry.code}.${entry.chapter}`));
    expect(new Set(BSB_BIBLE_VERSES.map((entry) => entry.code)).size).toBe(66);
    expect(chapters(BSB_BIBLE_VERSES)).toEqual(chapters(WEBUS_BIBLE_VERSES));
  });

  it("keeps the same schema as the WEB dataset (labels, groups, book names)", () => {
    const bsbGenesis = BSB_BIBLE_VERSES[0];
    const webGenesis = WEBUS_BIBLE_VERSES[0];
    expect(bsbGenesis.label).toBe(webGenesis.label);
    expect(bsbGenesis.group).toBe(webGenesis.group);
    expect(bsbGenesis.book).toBe(webGenesis.book);
    const bsbPsalm = BSB_BIBLE_VERSES.find((entry) => entry.code === "PSA");
    expect(bsbPsalm?.book).toBe("Psalms");
  });

  it("legacy WEB verse references still resolve (versification differences stay readable)", () => {
    // BSB footnotes rather than numbers a handful of disputed verses
    // (e.g. Matthew 17:21). Their chapters must still render, and the WEB
    // dataset — where those verses remain — must stay intact for rollback.
    expect(verse("MAT", "17", "21")).toBeUndefined();
    expect(
      BSB_BIBLE_VERSES.filter((entry) => entry.code === "MAT" && entry.chapter === "17").length,
    ).toBeGreaterThan(20);
    expect(
      WEBUS_BIBLE_VERSES.find(
        (entry) => entry.code === "MAT" && entry.chapter === "17" && entry.verse === "21",
      ),
    ).toBeDefined();
  });
});

describe("no scattered translation defaults (source contract)", () => {
  const srcRoot = path.join(__dirname, "..", "..");

  function walk(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return entry.name === "__tests__" || entry.name === "bibleText"
          ? []
          : walk(full);
      }
      return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
    });
  }

  it("no app or component file hard-codes a WEBUS deep link or version id", () => {
    for (const file of walk(path.join(srcRoot, "app")).concat(
      walk(path.join(srcRoot, "components")),
      walk(path.join(srcRoot, "lib")),
    )) {
      const source = fs.readFileSync(file, "utf8");
      expect(
        /bible\.com\/bible\/206\//.test(source),
        `${file} hard-codes a WEBUS deep link — use bibleComUrl()`,
      ).toBe(false);
      expect(
        /bible\.com\/bible\/3034\//.test(source),
        `${file} hard-codes a BSB deep link — use bibleComUrl()`,
      ).toBe(false);
    }
  });
});
