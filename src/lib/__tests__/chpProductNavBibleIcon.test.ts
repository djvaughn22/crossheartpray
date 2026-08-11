// Header Bible-icon contract, updated 2026-08-10 (owner decision).
//
// There is exactly ONE Bible icon in the shared header (ChpProductNav), not
// two. It is alt-labeled "Holy Bible" and opens YouVersion's official Verse
// of the Day in a new tab: https://www.bible.com/verse-of-the-day.
//
// From 2026-07-31 (commit 381d4c2) through 2026-08-10 this icon instead
// opened the internal Bible Reading Plan — a deliberate, site-wide policy
// that kept all Scripture interactions internal. The owner has now granted
// a scoped, explicit exception for this one icon only (2026-08-10): it is
// the single intentional external Scripture link on the site. The footer's
// "Love God, love your neighbor" control (see siteFooter.test.ts) still
// opens Scripture internally — this exception does not extend there or
// anywhere else.
//
// No separate "internal Verse of the Day" page or second Bible icon exists
// anywhere in this codebase's history — do not assume either exists without
// a fresh, explicit decision to build one.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const nav = readFileSync(
  join(__dirname, "../../components/ChpProductNav.tsx"),
  "utf8",
);

describe("CrossHeartPray header Bible icon", () => {
  it("opens the official YouVersion Verse of the Day in a new tab", () => {
    const iconLink = nav.slice(
      nav.indexOf('alt="Holy Bible"') - 400,
      nav.indexOf('alt="Holy Bible"'),
    );

    expect(iconLink).toContain('href="https://www.bible.com/verse-of-the-day"');
    expect(iconLink).toContain('target="_blank"');
    expect(iconLink).toContain('rel="noopener noreferrer"');
    expect(iconLink).toMatch(/aria-label="Open YouVersion Verse of the Day/);
  });

  it("does not route to the internal Bible Reading Plan", () => {
    const iconLink = nav.slice(
      nav.indexOf('alt="Holy Bible"') - 400,
      nav.indexOf('alt="Holy Bible"'),
    );

    expect(iconLink).not.toContain('href="/bible-reading-plan"');
  });

  it("has exactly one Bible icon link", () => {
    const matches = nav.match(/alt="Holy Bible"/g) ?? [];
    expect(matches).toHaveLength(1);
  });
});
