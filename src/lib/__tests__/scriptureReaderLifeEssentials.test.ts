// The embedded Life Essentials principle experience inside the shared
// Scripture reader: full cards (number, title, summary, reference) with the
// existing in-app player revealed on an explicit tap — genuine matches only,
// no duplicated data, no fabricated destinations, no autoplay on open.
import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  LIFE_ESSENTIALS_PRINCIPLES,
  getGeneGetzPrinciplesForChapter,
} from "../geneGetzLifeEssentials";

const componentsDir = path.join(__dirname, "..", "..", "components");
const read = (relative: string) =>
  fs.readFileSync(path.join(componentsDir, relative), "utf8");

const overlay = read(path.join("scripture", "ScriptureReaderOverlay.tsx"));
const youTubeModal = read("YouTubeModal.tsx");

describe("matching stays genuine", () => {
  it("a chapter with exactly one verified principle produces exactly one card's data", () => {
    // Found from the verified data itself — never hand-picked or invented.
    const single = LIFE_ESSENTIALS_PRINCIPLES.map((principle) => ({
      code: principle.code,
      chapter: principle.startChapter,
    })).find(
      ({ code, chapter }) => getGeneGetzPrinciplesForChapter(code, chapter).length === 1,
    );
    expect(single).toBeDefined();
    const [match] = getGeneGetzPrinciplesForChapter(single!.code, single!.chapter);
    expect(match.principleNumber).toBeGreaterThan(0);
    expect(match.principleTitle.length).toBeGreaterThan(0);
    expect(match.shortPrincipleSummary.length).toBeGreaterThan(0);
    expect(
      match.officialVideoUrl.startsWith("https://ssl.bhpublishinggroup.com/QR/GetzBible/"),
    ).toBe(true);
  });

  it("a chapter with multiple verified principles produces every one of them", () => {
    const matches = getGeneGetzPrinciplesForChapter("GEN", 1);
    expect(matches.length).toBeGreaterThanOrEqual(2);
    const numbers = matches.map((principle) => principle.principleNumber);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it("an unmatched chapter renders no Life Essentials section at all", () => {
    expect(getGeneGetzPrinciplesForChapter("GEN", 10)).toEqual([]);
    // The section is gated on genuine matches — no empty shell.
    expect(overlay).toContain("getzMatches.length > 0 ?");
  });
});

describe("reader principle cards (source contract)", () => {
  it("renders every match as a full card — no truncation to two, no chip-only teaser", () => {
    expect(overlay).toContain("getzMatches.map((principle)");
    expect(overlay).not.toContain("slice(0, 2)");
  });

  it("shows number, title, summary, and the principle's Scripture range", () => {
    expect(overlay).toContain("Principle {principle.principleNumber}");
    expect(overlay).toContain("{principle.principleTitle}");
    expect(overlay).toContain("principle.shortPrincipleSummary");
    expect(overlay).toContain("formatPrincipleRange(principle)");
  });

  it("embeds the same player CrossHeartPray already uses, at video aspect ratio", () => {
    const params = "?autoplay=1&rel=0&controls=1&playsinline=1&fs=1";
    expect(overlay).toContain("youtube-nocookie.com/embed/");
    expect(overlay).toContain(params);
    expect(youTubeModal).toContain(params); // stays in lockstep with the site player
    expect(overlay).toContain("aspect-video");
  });

  it("mounts the player only after the explicit Watch tap — nothing plays on open", () => {
    expect(overlay).toContain("const [playingKey, setPlayingKey]");
    expect(overlay).toContain("playing && principle.youtubeId ?");
    expect(overlay).toContain("setPlayingKey(playing ? null : key)");
    expect(overlay).toContain("aria-expanded={playing}");
  });

  it("always offers the official destination: embed fallback and no-embed fallback", () => {
    expect(overlay).toContain("Watch on the official player");
    // Principles without an embeddable video get the official player directly.
    expect(overlay.match(/href=\{principle\.officialVideoUrl\}/g)?.length).toBeGreaterThanOrEqual(
      3,
    );
  });

  it("keeps keyboard access: the focus trap covers the embedded player", () => {
    expect(overlay).toContain("iframe, [tabindex]");
  });

  it("builds no fabricated URLs — only verified ids and official destinations", () => {
    expect(overlay).toMatch(/embed\/\$\{principle\.youtubeId\}/);
    expect(overlay).not.toMatch(/bibleprinciples\.org\/[^"']*\$\{/);
    expect(overlay).not.toMatch(/youtube[^"'`]*embed\/[A-Za-z0-9_-]{6,}/); // no hardcoded video ids
  });

  it("duplicates no Life Essentials data or mapping logic", () => {
    expect(overlay).toContain('from "../../lib/geneGetzLifeEssentials"');
    expect(overlay).not.toContain("LIFE_ESSENTIALS_PRINCIPLES = [");
    expect(overlay).not.toContain("principleTitle:");
    expect(overlay).not.toContain("startChapter:");
  });
});

describe("existing Life Essentials surfaces stay intact", () => {
  it("the resource card keeps its own player behavior and official links", () => {
    const resourceCard = read("GeneGetzResourceCard.tsx");
    expect(resourceCard).toContain("YouTubeModal");
    expect(resourceCard).toContain("Watch Gene Getz video");
    expect(resourceCard).toContain("principle.officialVideoUrl");
  });

  it("the reader links back to the main Life Essentials page", () => {
    expect(overlay).toContain('href="/life-essentials"');
  });
});
