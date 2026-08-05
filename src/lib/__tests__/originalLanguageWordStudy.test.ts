// Divine-name matching: real translations spell Hebrew יהוה (Strong's H3068)
// differently — ASV writes "Jehovah", BSB/KJV-style Bibles write "LORD"
// (capitalized to mark the tetragrammaton), while this app's word-study data
// is generated against the World English Bible, which spells it "Yahweh".
// A verse's Deep Dive record only carries one of those spellings as
// englishWord, so the matcher must bridge them or the exact owner case
// (ASV Psalms 3:1, "Jehovah") never gets a dotted underline.
import { describe, expect, it } from "vitest";
import {
  getVerifiedWordStudyForWord,
  type VerifiedWordStudy,
} from "../originalLanguageWordStudy";

// Shape and values captured directly from the live
// /api/deep-dive-word-studies?code=PSA&chapter=3&verse=1 response.
const psalm3YahwehStudy: VerifiedWordStudy = {
  reference: "Psalms 3:1",
  code: "PSA",
  chapter: "3",
  verse: "1",
  englishWord: "yahweh",
  language: "hebrew",
  originalWord: "יְ֭הוָה",
  transliteration: "Yah.weh",
  strongs: "H3068",
  lemma: "יְ֭הוָה",
  morphology: "HNpt",
  sourceGloss: "O Yahweh",
  lexiconMeaning: "LORD",
  sourceName: "STEPBible TAHOT Hebrew alignment + TBESH Strong's meaning",
  sourceUrl: "https://github.com/STEPBible/STEPBible-Data",
  lexiconSourceName: "STEPBible TBESH Hebrew brief lexicon",
};

describe("divine-name matching bridges Yahweh, Jehovah, and LORD", () => {
  it("matches ASV's rendering, 'Jehovah'", () => {
    expect(getVerifiedWordStudyForWord([psalm3YahwehStudy], "Jehovah")).toBe(
      psalm3YahwehStudy,
    );
  });

  it("matches BSB/KJV-style all-caps 'LORD'", () => {
    expect(getVerifiedWordStudyForWord([psalm3YahwehStudy], "LORD")).toBe(
      psalm3YahwehStudy,
    );
  });

  it("matches the WEB reference spelling, 'Yahweh', case-insensitively", () => {
    expect(getVerifiedWordStudyForWord([psalm3YahwehStudy], "Yahweh")).toBe(
      psalm3YahwehStudy,
    );
  });

  it("does NOT alias title-case 'Lord' — ambiguous with Adonai/master, not the tetragrammaton", () => {
    expect(getVerifiedWordStudyForWord([psalm3YahwehStudy], "Lord")).toBeNull();
  });

  it("does NOT alias lowercase 'lord' either", () => {
    expect(getVerifiedWordStudyForWord([psalm3YahwehStudy], "lord")).toBeNull();
  });

  it("still matches ordinary words exactly as before", () => {
    const study: VerifiedWordStudy = {
      ...psalm3YahwehStudy,
      englishWord: "shepherd",
      sourceGloss: "[is] shepherd/ my",
    };
    expect(getVerifiedWordStudyForWord([study], "shepherd")).toBe(study);
    expect(getVerifiedWordStudyForWord([study], "Shepherd")).toBe(study);
    expect(getVerifiedWordStudyForWord([study], "sheep")).toBeNull();
  });
});
