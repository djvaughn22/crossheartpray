// CrossHeartPray is a standalone, free Christian resource. No page, menu,
// share surface, or config may carry stores, products, promotions, or
// cross-site commercial messages — ever. The one allowed ownership mention
// is the quiet Open Mirror LLC line under the footer copyright.
//
// Scripture and Life Essentials data files are exempt: biblical text
// legitimately says "buy", "store", "be prepared", etc.
//
// ONE narrow exception, owner decision 2026-08-08: Save on Any Device (Sync).
// Scripture, the Reading Plan, Daily Hope, Bible Bingo 7, and Deep Dive stay
// free and un-gated forever. The only thing a subscription may ever buy is
// cross-device persistence. The exception is deliberately scoped to the
// listed Sync files and to billing words alone — storefront words (shop,
// merch, cart, etsy, amazon, donate, sponsor) stay banned even there, so a
// store can never grow out of this seam.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "..", "..");

// Data files whose text is Scripture or published Bible teaching.
const SCRIPTURE_DATA = new Set([
  "lib/localBibleVerses.ts",
  "lib/geneGetzLifeEssentials.ts",
  "lib/strongsDictionaryData.ts",
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "__tests__" || name === "node_modules") continue;
      walk(full, out);
    } else if (/\.(ts|tsx|css|json)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

const allFiles = walk(SRC).map((f) => relative(SRC, f));

// The isolated Save on Any Device surface. Nothing may be added here that is
// not part of Sync itself.
const SYNC_SURFACE = new Set([
  "components/SyncCard.tsx",
  "components/SyncBridge.tsx",
  "app/api/sync/redeem/route.ts",
  "app/api/sync/admin/codes/route.ts",
  "app/api/sync/auth/beta/route.ts",
  "app/api/sync/progress/route.ts",
  "app/api/sync/routeShared.ts",
  "app/api/sync/auth/register/route.ts",
  "app/api/sync/auth/login/route.ts",
  "app/api/sync/auth/logout/route.ts",
  "app/api/sync/auth/me/route.ts",
  "app/api/sync/auth/account/route.ts",
]);

// Never allowed anywhere, including on the Sync surface.
const STOREFRONT_WORDS =
  /\b(shop|merch|sale|sales|donate|donation|etsy|amazon|cart|sponsor)\b/i;

// Allowed only on the Sync surface, and only once billing is genuinely wired.
const STOREFRONT_WORDS_AND_BILLING =
  /\b(shop|merch|buy|sale|sales|donate|donation|etsy|amazon|cart|checkout|pricing|sponsor)\b/i;

describe("CrossHeartPray carries no commercial or cross-site promotion", () => {
  it("never mentions PleaseBeReady or the removed destination card anywhere", () => {
    for (const rel of allFiles) {
      const src = readFileSync(join(SRC, rel), "utf8");
      expect(src, rel).not.toMatch(
        /pleasebeready|please be ready|AboutDestinationCard|BE_PREPARED/i,
      );
    }
  });

  it("keeps stores, sales, and promotion out of every page and component", () => {
    const uiFiles = allFiles.filter(
      (rel) =>
        (rel.startsWith("app/") || rel.startsWith("components/")) &&
        !SCRIPTURE_DATA.has(rel),
    );
    expect(uiFiles.length).toBeGreaterThan(10);
    for (const rel of uiFiles) {
      const src = readFileSync(join(SRC, rel), "utf8");
      const banned = SYNC_SURFACE.has(rel)
        ? STOREFRONT_WORDS
        : STOREFRONT_WORDS_AND_BILLING;
      expect(src, rel).not.toMatch(banned);
    }
  });

  it("confines the Sync exception to Sync files that actually exist", () => {
    for (const rel of SYNC_SURFACE) {
      expect(allFiles, rel).toContain(rel);
      expect(rel).toMatch(/[Ss]ync/);
    }
  });

  it("never gates Scripture or any reading feature behind the subscription", () => {
    for (const rel of allFiles) {
      const src = readFileSync(join(SRC, rel), "utf8");
      expect(src, rel).not.toMatch(
        /\b(paywall|premium|subscribers? only|upgrade to (?:read|unlock))\b/i,
      );
    }
  });

  // No price or cadence has been approved for CrossHeartPray and no payment
  // provider is wired. Until both are true, the Sync surface must not imply
  // that anything can be charged.
  it("shows no price on the Sync surface until billing is real", () => {
    for (const rel of SYNC_SURFACE) {
      const src = readFileSync(join(SRC, rel), "utf8");
      expect(src, rel).not.toMatch(/\$\s?\d/);
      expect(src, rel).not.toMatch(
        /\b(free trial|discount|limited time|act now|hurry)\b/i,
      );
    }
  });
});
