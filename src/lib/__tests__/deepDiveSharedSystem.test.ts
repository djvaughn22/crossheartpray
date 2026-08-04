// One shared Scripture Reader + Deep Dive system — source contracts.
//
// The locked shape: every internal Scripture-reading surface (Bible Reading
// Plan "Read Here", Life Essentials, Bible Bingo 7, Behind the Verse, Daily
// Hope, the homepage connected verse) reaches Scripture through the one
// shared reader, and Deep Dive is the one verified Greek/Hebrew word-study
// system — same data fetch, same word links, same Strong's panel everywhere.
// No feature-specific Deep Dive clones, no second reader, no fabricated data.
import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const srcDir = path.join(__dirname, "..", "..");
const read = (relative: string) => fs.readFileSync(path.join(srcDir, relative), "utf8");

const reader = read(path.join("components", "scripture", "ScriptureReader.tsx"));
const wordStudyLib = read(path.join("lib", "originalLanguageWordStudy.ts"));
const wordStudyModal = read(path.join("components", "OriginalWordStudyModal.tsx"));

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "__tests__") yield* sourceFiles(full);
    else if (/\.(tsx|ts)$/.test(entry.name) && !/\.test\./.test(entry.name)) yield full;
  }
}

describe("the one reader carries the one Deep Dive", () => {
  it("the shared ScriptureReader renders the shared word-study components", () => {
    expect(reader).toContain("VerifiedVerseText");
    expect(reader).toContain("OriginalWordStudyModal");
    expect(reader).toContain("fetchVerifiedWordStudies");
    expect(reader).toContain("hasVerifiedWordStudies");
  });

  it("Deep Dive in the reader is honest: loading, verified, or a calm empty state", () => {
    expect(reader).toContain("Checking verified Greek");
    expect(reader).toContain("No verified original-language data for this verse yet");
  });

  it("the reader invites Deep Dive compactly, without covering the Scripture", () => {
    expect(reader).toContain(
      "Tap any verse for Deep Dive — the original Greek or Hebrew, word by word.",
    );
  });

  it("the Deep Dive cache is session memory only — never persisted", () => {
    expect(reader).not.toContain("localStorage");
    expect(reader).not.toContain("sessionStorage");
  });
});

describe("every surface reaches Deep Dive data through one fetch", () => {
  it("the fetch lives once, in the word-study lib", () => {
    expect(wordStudyLib).toContain("export async function fetchVerifiedWordStudies");
    expect(wordStudyLib).toContain("deep-dive-word-studies");
  });

  it("no component builds its own Deep Dive request", () => {
    for (const file of [
      ...sourceFiles(path.join(srcDir, "components")),
      ...sourceFiles(path.join(srcDir, "app")),
    ]) {
      const source = fs.readFileSync(file, "utf8");
      expect(
        source.includes("buildDeepDiveWordStudiesUrl"),
        `${path.relative(srcDir, file)} bypasses fetchVerifiedWordStudies`,
      ).toBe(false);
      expect(
        source.includes("deep-dive-word-studies"),
        `${path.relative(srcDir, file)} hardcodes the Deep Dive endpoint`,
      ).toBe(false);
    }
  });

  it("all connected surfaces use the shared fetch", () => {
    for (const file of [
      path.join("components", "scripture", "ScriptureReader.tsx"),
      path.join("components", "BehindTheVerse.tsx"),
      path.join("components", "BibleVerseLookup.tsx"),
      path.join("components", "BibleBingoShareBoard.tsx"),
      path.join("components", "DailyHopeRoutine.tsx"),
      path.join("app", "explorebible", "page.tsx"),
    ]) {
      expect(read(file), `${file} should use fetchVerifiedWordStudies`).toContain(
        "fetchVerifiedWordStudies",
      );
    }
  });
});

describe("no feature-specific Deep Dive clones", () => {
  it("exactly one component renders the verified Strong's panel", () => {
    const withPanel: string[] = [];
    for (const file of sourceFiles(path.join(srcDir, "components"))) {
      if (fs.readFileSync(file, "utf8").includes("Verified Strong&apos;s Data")) {
        withPanel.push(path.relative(srcDir, file));
      }
    }
    expect(withPanel).toEqual([path.join("components", "OriginalWordStudyModal.tsx")]);
  });

  it("exactly one component renders tappable verified word links", () => {
    const withLinks: string[] = [];
    for (const file of sourceFiles(path.join(srcDir, "components"))) {
      if (fs.readFileSync(file, "utf8").includes("Open Behind the Verse")) {
        withLinks.push(path.relative(srcDir, file));
      }
    }
    expect(withLinks).toEqual([path.join("components", "VerifiedVerseText.tsx")]);
  });

  it("the retired duplicate plan-cell reader stays deleted", () => {
    expect(
      fs.existsSync(path.join(srcDir, "components", "ReadingPlanCellReader.tsx")),
    ).toBe(false);
  });
});

describe("every reading surface reaches the one shared reader", () => {
  it("Reading Plan Read Here opens the shared modal reader with plan context", () => {
    const planProgress = read(path.join("components", "BibleReadingPlanProgress.tsx"));
    expect(planProgress).toContain("KindleReaderModal");
    expect(planProgress).toContain("readingContext");
    expect(planProgress).toContain("onMarkComplete");
  });

  it("Life Essentials reaches Scripture through CardReadMenu's shared reader", () => {
    expect(read(path.join("components", "GeneGetzFullIndex.tsx"))).toContain("<CardReadMenu");
    const menu = read(path.join("components", "CardReadMenu.tsx"));
    expect(menu).toContain("KindleReaderModal");
  });

  it("Behind the Verse / homepage connected verse uses the shared reader and real word studies", () => {
    const behind = read(path.join("components", "BehindTheVerse.tsx"));
    expect(behind).toContain("KindleReaderModal");
    expect(behind).toContain("fetchVerifiedWordStudies");
    expect(behind).toContain("getDefaultWordStudy");
    expect(behind).toContain("OriginalWordStudyModal");
  });

  it("the shared modal reader is ScriptureReader in a portal — one implementation", () => {
    const modal = read(path.join("components", "scripture", "KindleReaderModal.tsx"));
    expect(modal).toContain("<ScriptureReader");
    expect(modal).toContain("createPortal");
  });
});

describe("Deep Dive layering and mobile safety", () => {
  it("Escape closes only the word-study panel — capture phase, stopped", () => {
    expect(wordStudyModal).toContain('window.addEventListener("keydown", onKeyDown, true)');
    expect(wordStudyModal).toContain("event.stopPropagation()");
  });

  it("long Greek/Hebrew fields wrap instead of overflowing", () => {
    expect(wordStudyModal).toContain("break-words");
    expect(reader).toContain("break-words");
  });

  it("the word-study panel scrolls inside itself on small screens", () => {
    expect(wordStudyModal).toContain("max-h-[92vh]");
    expect(wordStudyModal).toContain("overflow-y-auto");
  });
});
