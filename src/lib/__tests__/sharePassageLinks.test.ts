// Shared Scripture links land on CrossHeartPray: the recipient opens the
// passage in the site's reader, never on an outside Bible site.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { crossHeartPrayPassageUrl } from "../scripture";

describe("crossHeartPrayPassageUrl", () => {
  it("opens the exact verse in its Reading Plan cell", () => {
    expect(crossHeartPrayPassageUrl({ book: "MAL", chapter: 4, verse: 6 })).toBe(
      "https://crossheartpray.com/bible-reading-plan?week=48&day=friday&focus=MAL.4.6#week-48-friday",
    );
  });

  it("opens a whole chapter when no verse is given", () => {
    expect(crossHeartPrayPassageUrl({ book: "MAL", chapter: 4 })).toBe(
      "https://crossheartpray.com/bible-reading-plan?week=48&day=friday&focus=MAL.4#week-48-friday",
    );
  });

  it("keeps verse ranges", () => {
    expect(crossHeartPrayPassageUrl({ book: "JHN", chapter: 3, verse: 16, endVerse: 18 })).toMatch(
      /^https:\/\/crossheartpray\.com\/bible-reading-plan\?.*&focus=JHN\.3\.16-18#week-\d+-[a-z]+$/,
    );
  });

  it("falls back to the Reading Plan, still on CrossHeartPray", () => {
    expect(crossHeartPrayPassageUrl(null)).toBe("https://crossheartpray.com/bible-reading-plan");
  });
});

describe("Scripture shares build their links from CrossHeartPray", () => {
  const root = join(__dirname, "..", "..");
  const shareBuilders = {
    "verse card": join(root, "components", "BibleBingoVerseCard.tsx"),
    "shared board page": join(root, "app", "bible-bingo", "[boardId]", "page.tsx"),
  };

  for (const [name, file] of Object.entries(shareBuilders)) {
    it(`${name} links recipients to the passage here, not Bible.com`, () => {
      const source = readFileSync(file, "utf8");
      expect(source).toContain("crossHeartPrayPassageUrl(");
      expect(source).not.toContain("bibleComUrlForPassage");
      expect(source).not.toMatch(/Holy Bible app/);
    });
  }
});
