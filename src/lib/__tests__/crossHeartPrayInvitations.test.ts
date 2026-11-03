// The four invitations: Cross, Heart, Pray, and the tagline Share the Good
// News. Their Scripture quotes must stay the Berean Standard Bible word for
// word, and the homepage hero keeps Scripture first while carrying the tagline.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { BSB_BIBLE_VERSES } from "../bibleText/bsbBibleVerses";
import { CROSS_HEART_PRAY_INVITATIONS } from "../crossHeartPrayInvitations";
import { parseScriptureReference } from "../scripture";

function bsbText(reference: string) {
  const parsed = parseScriptureReference(reference);
  if (!parsed?.chapter || !parsed.verse) throw new Error(`Unparseable: ${reference}`);
  const last = parsed.endVerse ?? parsed.verse;
  return BSB_BIBLE_VERSES.filter(
    (entry) =>
      entry.code === parsed.book &&
      Number(entry.chapter) === parsed.chapter &&
      Number(entry.verse) >= parsed.verse! &&
      Number(entry.verse) <= last,
  )
    .map((entry) => entry.text)
    .join(" ");
}

describe("the four invitations", () => {
  it("are Cross, Heart, Pray, and Share, in that order", () => {
    expect(CROSS_HEART_PRAY_INVITATIONS.map((item) => item.word)).toEqual([
      "Cross",
      "Heart",
      "Pray",
      "Share",
    ]);
    expect(CROSS_HEART_PRAY_INVITATIONS.map((item) => item.invitation)).toEqual([
      "Come to Jesus…",
      "Receive God's Love…",
      "Dear God…",
      "Share the Good News.",
    ]);
  });

  it("say plainly that the Good News is the gospel of Jesus Christ", () => {
    const share = CROSS_HEART_PRAY_INVITATIONS.find((item) => item.word === "Share")!;
    expect(share.note).toMatch(/gospel of Jesus Christ/);
  });

  it("quote the Berean Standard Bible word for word", () => {
    for (const item of CROSS_HEART_PRAY_INVITATIONS) {
      const expected = bsbText(item.reference).replace(/,$/, "");
      expect(expected.length, `${item.reference} missing from BSB`).toBeGreaterThan(0);
      expect(item.quote, item.reference).toBe(expected);
    }
  });
});

describe("homepage hero", () => {
  const hero = readFileSync(
    join(__dirname, "..", "..", "components", "CrossHeartPrayHero.tsx"),
    "utf8",
  );

  it("keeps BIBLE EVERY DAY and adds the tagline after it", () => {
    const bible = hero.indexOf("BIBLE EVERY DAY");
    const tagline = hero.indexOf("Share the Good News.");
    expect(bible).toBeGreaterThan(-1);
    expect(tagline).toBeGreaterThan(bible);
  });
});
