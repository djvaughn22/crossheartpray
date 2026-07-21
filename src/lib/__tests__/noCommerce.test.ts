// CrossHeartPray is a standalone, free Christian resource. No page, menu,
// share surface, or config may carry stores, products, promotions, or
// cross-site commercial messages — ever. The one allowed ownership mention
// is the quiet Open Mirror LLC line under the footer copyright.
//
// Scripture and Life Essentials data files are exempt: biblical text
// legitimately says "buy", "store", "be prepared", etc.
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
      expect(src, rel).not.toMatch(
        /\b(shop|merch|buy|sale|sales|donate|donation|etsy|amazon|cart|checkout|pricing|sponsor)\b/i,
      );
    }
  });
});
