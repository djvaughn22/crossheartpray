// The Scripture reading experience: one shared reader across every surface,
// calm accessible chrome, truthful labels, and no second implementation.
// Source contracts — they lock the shape of the design without freezing
// every class name.
import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const srcDir = path.join(__dirname, "..", "..");
const read = (relative: string) => fs.readFileSync(path.join(srcDir, relative), "utf8");

const reader = read(path.join("components", "scripture", "ScriptureReader.tsx"));
const overlay = read(path.join("components", "scripture", "ScriptureReaderOverlay.tsx"));
const picker = read(path.join("components", "scripture", "TranslationPicker.tsx"));
const globals = read(path.join("app", "globals.css"));

describe("one shared reader across the seven primary surfaces", () => {
  it("the root layout mounts the single shared overlay", () => {
    const layout = read(path.join("app", "layout.tsx"));
    expect(layout).toContain("<ScriptureReaderOverlay />");
  });

  it("every surface reaches Scripture through the shared reader, not a copy", () => {
    // Homepage + Bible Bingo + Daily Hope + Life Essentials go through
    // CardReadMenu; the reading plan and bingo share-board call the bus
    // directly; Explore Bible embeds the same ScriptureReader component.
    for (const [file, marker] of [
      ["components/CardReadMenu.tsx", "openScriptureReader("],
      ["components/BibleReadingPlanProgress.tsx", "openScriptureReader("],
      ["components/BibleBingoShareBoard.tsx", "openScriptureReader("],
      ["app/explorebible/page.tsx", "ScriptureReader"],
    ] as const) {
      expect(read(file)).toContain(marker);
    }
  });

  it("no second chapter-rendering implementation exists outside the reader", () => {
    // The verse-list render loop lives in exactly one component.
    const componentFiles = fs
      .readdirSync(path.join(srcDir, "components"), { recursive: true })
      .map(String)
      .filter((file) => file.endsWith(".tsx"));
    const withChapterLoop = componentFiles.filter((file) =>
      read(path.join("components", file)).includes("chapterData.verses.map"),
    );
    expect(withChapterLoop).toEqual([path.join("scripture", "ScriptureReader.tsx")]);
  });
});

describe("reader chrome (source contract)", () => {
  it("keeps close/back, previous, and next as labeled controls", () => {
    expect(reader).toContain('aria-label="Close Scripture reader"');
    expect(reader).toContain("Previous chapter, ${formatScriptureReference(chapterData.previous)}");
    expect(reader).toContain("Next chapter, ${formatScriptureReference(chapterData.next)}");
  });

  it("highlights a requested verse range, not just a single verse", () => {
    expect(reader).toContain("targetEndVerse");
    expect(reader).toContain("initialReference.endVerse");
  });

  it("shows a Scripture-shaped loading state with a screen-reader status", () => {
    expect(reader).toContain("chp-scripture-skeleton");
    expect(reader).toContain('role="status"');
  });

  it("labels an external-only translation pick truthfully over local WEB text", () => {
    expect(reader).toContain("can't be read inside CrossHeartPray yet");
  });

  it("keeps the translation picker an accessible native select", () => {
    expect(picker).toContain("<select");
    expect(picker).toContain("aria-label={ariaLabel}");
    expect(picker).toContain('ariaLabel = "Translation"');
  });
});

describe("overlay accessibility (source contract)", () => {
  it("traps Tab focus inside the open dialog", () => {
    expect(overlay).toContain('event.key === "Tab"');
    expect(overlay).toContain("event.shiftKey");
  });

  it("prevents background scrolling and restores it on close", () => {
    expect(overlay).toContain('document.body.style.overflow = "hidden"');
    expect(overlay).toContain("document.body.style.overflow = previousOverflow");
  });

  it("respects safe-area insets on the phone sheet", () => {
    expect(overlay).toContain("env(safe-area-inset-top)");
    expect(reader).toContain("env(safe-area-inset-bottom)");
  });
});

describe("motion and theming (source contract)", () => {
  it("the open animation is disabled under prefers-reduced-motion", () => {
    expect(globals).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{\s*\.chp-reader-backdrop,\s*\.chp-reader-panel \{\s*animation: none;/,
    );
  });

  it("light theme covers the skeleton and the selected-verse emphasis", () => {
    expect(globals).toContain('html[data-chp-visual-theme="light"] .chp-scripture-skeleton');
    expect(globals).toContain('html[data-chp-visual-theme="light"] .chp-verse-target');
  });

  it("the Scripture voice is a system serif — no font dependency added", () => {
    expect(globals).toContain('font-family: Georgia, "Times New Roman", Times, serif;');
    const pkg = read(path.join("..", "package.json"));
    expect(pkg).not.toContain("@fontsource");
    expect(pkg).not.toContain("typeface-");
  });
});

describe("no client key exposure, no licensed-text persistence", () => {
  it("reader components never touch the server App Key", () => {
    for (const file of [reader, overlay, picker]) {
      expect(file).not.toContain("YVP_APP_KEY");
      expect(file).not.toContain("X-App-Key");
    }
  });

  it("only the translation preference is persisted — never Scripture text", () => {
    // The reader itself writes nothing to storage…
    expect(reader).not.toContain("localStorage");
    expect(overlay).not.toContain("localStorage");
    // …and the provider persists only the numeric translation id.
    const provider = read(path.join("lib", "scripture", "provider.ts"));
    const setCalls = provider.match(/localStorage\.setItem\(\w+/g) ?? [];
    expect(setCalls).toEqual(["localStorage.setItem(TRANSLATION_PREF_KEY"]);
  });
});
