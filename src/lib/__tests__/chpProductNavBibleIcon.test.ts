// Header Bible-icon contract, Aug 9 2026 proof pass.
//
// There is exactly ONE Bible icon in the shared header (ChpProductNav), not
// two. It is alt-labeled "Holy Bible" and opens the internal Bible Reading
// Plan. Before 2026-07-31 (commit 381d4c2, "Keep all Scripture interactions
// internal — fix link behavior") the same icon opened bible.com's external
// Verse of the Day in a new tab; that was a deliberate, site-wide policy
// change — CrossHeartPray never sends a visitor's first click off-site for
// Scripture (see siteFooter.test.ts for the matching footer contract) — not
// an accident. This test locks the current, intentional destination and
// guards against the external link silently coming back.
//
// No separate "YouVersion" icon or internal "Verse of the Day" page exists
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
  it("opens the internal Bible Reading Plan", () => {
    const iconLink = nav.slice(
      nav.indexOf('alt="Holy Bible"') - 400,
      nav.indexOf('alt="Holy Bible"'),
    );

    expect(iconLink).toContain('href="/bible-reading-plan"');
    expect(iconLink).toContain('aria-label="Open Bible Reading Plan"');
  });

  it("never links off-site for Scripture", () => {
    for (const banned of ["bible.com", "biblehub", "target=\"_blank\""]) {
      expect(nav.toLowerCase()).not.toContain(banned.toLowerCase());
    }
  });

  it("has exactly one Bible icon link", () => {
    const matches = nav.match(/alt="Holy Bible"/g) ?? [];
    expect(matches).toHaveLength(1);
  });
});
