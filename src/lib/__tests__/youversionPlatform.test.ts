// The server-side YouVersion Platform client: key handling that can never
// leak, and the chapter-HTML parser that turns the API's format=html payload
// into verse-numbered text. Fake keys only — the real key must never appear
// in any test file or snapshot.
import { afterEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  parseYouVersionChapterHtml,
  youVersionServerKey,
} from "../youversionPlatform";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("App Key handling", () => {
  it("reports missing when unset or blank", () => {
    vi.stubEnv("YVP_APP_KEY", "");
    expect(youVersionServerKey()).toBeNull();
    vi.stubEnv("YVP_APP_KEY", "   ");
    expect(youVersionServerKey()).toBeNull();
  });

  it("returns the configured key trimmed (server-side only)", () => {
    vi.stubEnv("YVP_APP_KEY", " fake-test-key ");
    expect(youVersionServerKey()).toBe("fake-test-key");
  });

  it("the server module never logs — a key can never reach a log line", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "youversionPlatform.ts"),
      "utf8",
    );
    expect(source.includes("console.")).toBe(false);
  });

  it("is not a NEXT_PUBLIC_ variable anywhere in the codebase", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "youversionPlatform.ts"),
      "utf8",
    );
    expect(source.includes("NEXT_PUBLIC_YVP")).toBe(false);
    expect(source.includes("process.env.YVP_APP_KEY")).toBe(true);
  });
});

describe("chapter HTML parsing", () => {
  it("parses prose paragraphs into verse-numbered text", () => {
    const html =
      '<div><div class="p"><span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>In the beginning was the Word. <span class="yv-v" v="2"></span><span class="yv-vlbl">2</span>He was in the beginning with God.</div></div>';
    expect(parseYouVersionChapterHtml(html)).toEqual([
      { verse: 1, text: "In the beginning was the Word." },
      { verse: 2, text: "He was in the beginning with God." },
    ]);
  });

  it("joins poetry lines (q1/q2) and keeps the Psalm superscription with verse 1", () => {
    const html =
      '<div><div class="d"><span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>A Psalm of David.</div><div class="q1">The <span class="nd">Lord</span> is my shepherd;</div><div class="q2">I shall not want.</div><div class="q1"><span class="yv-v" v="2"></span><span class="yv-vlbl">2</span>He makes me lie down.</div></div>';
    const verses = parseYouVersionChapterHtml(html);
    expect(verses[0]).toEqual({
      verse: 1,
      text: "A Psalm of David. The Lord is my shepherd; I shall not want.",
    });
    expect(verses[1]).toEqual({ verse: 2, text: "He makes me lie down." });
  });

  it("drops editorial section headings — they are not Scripture text", () => {
    const html =
      '<div><div class="s1">The Good Shepherd</div><div class="p"><span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Truly, truly, I tell you.</div></div>';
    expect(parseYouVersionChapterHtml(html)).toEqual([
      { verse: 1, text: "Truly, truly, I tell you." },
    ]);
  });

  it("decodes HTML entities and collapses whitespace", () => {
    const html =
      '<div><div class="p"><span class="yv-v" v="16"></span><span class="yv-vlbl">16</span>God&#39;s love &amp; grace  &#8220;endures&#8221;.</div></div>';
    expect(parseYouVersionChapterHtml(html)).toEqual([
      { verse: 16, text: "God's love & grace “endures”." },
    ]);
  });

  it("returns an empty list for markup without verse markers (caller treats as failure)", () => {
    expect(parseYouVersionChapterHtml("<div><div class=\"p\">No markers.</div></div>")).toEqual(
      [],
    );
    expect(parseYouVersionChapterHtml("")).toEqual([]);
  });
});
