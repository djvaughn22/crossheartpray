// The picker's first principle: never make anyone decode an abbreviation.
// These tests lock the human names, the calm Recommended set, and search
// that works whether people type "niv" or "King".
import { describe, expect, it } from "vitest";
import {
  isRecommendedTranslation,
  matchesTranslationSearch,
  recommendedRank,
  translationDisplayName,
  type ScriptureTranslation,
} from "../scripture";

function translation(
  abbreviation: string,
  label = abbreviation,
  access: ScriptureTranslation["access"] = "readHere",
): ScriptureTranslation {
  return { id: 1, abbreviation, label, access };
}

describe("full names, never bare abbreviations", () => {
  it("names every translation the Scripture system can surface", () => {
    for (const abbreviation of [
      "WEBUS",
      "CSB",
      "KJV",
      "NIV",
      "ESV",
      "NLT",
      "BSB",
      "ASV",
      "LSV",
      "FBV",
      "WMB",
      "WMBBE",
      "TCENT",
      "CPDV",
      "TOJB2011",
    ]) {
      const name = translationDisplayName(translation(abbreviation));
      expect(name).not.toBe(abbreviation);
      expect(name.length).toBeGreaterThan(abbreviation.length);
    }
  });

  it("resolves the Geneva Bible from either its platform code or its label", () => {
    expect(translationDisplayName(translation("enggnv", "GNV"))).toBe("Geneva Bible");
    expect(translationDisplayName(translation("GNV"))).toBe("Geneva Bible");
  });

  it("falls back to the label for unknown codes — never blank", () => {
    expect(translationDisplayName(translation("XYZ2099", "XYZ"))).toBe("XYZ");
  });
});

describe("the Recommended set stays calm", () => {
  it("always recommends WEB, KJV, and NIV", () => {
    expect(isRecommendedTranslation(translation("WEBUS", "WEB"))).toBe(true);
    expect(isRecommendedTranslation(translation("KJV", "KJV", "bibleComLink"))).toBe(true);
    expect(isRecommendedTranslation(translation("NIV", "NIV", "bibleComLink"))).toBe(true);
  });

  it("recommends CSB only when it genuinely reads here", () => {
    expect(isRecommendedTranslation(translation("CSB", "CSB", "readHere"))).toBe(true);
    expect(isRecommendedTranslation(translation("CSB", "CSB", "bibleComLink"))).toBe(false);
  });

  it("keeps the long tail out of the first screen", () => {
    for (const abbreviation of ["BSB", "LSV", "FBV", "WMBBE", "TCENT", "TOJB2011"]) {
      expect(isRecommendedTranslation(translation(abbreviation))).toBe(false);
    }
  });

  it("orders licensed CSB first, then WEB, KJV, NIV", () => {
    const ranks = ["CSB", "WEBUS", "KJV", "NIV"].map((abbreviation) =>
      recommendedRank(translation(abbreviation)),
    );
    expect([...ranks]).toEqual([...ranks].sort((a, b) => a - b));
  });
});

describe("search works the way people type", () => {
  it('finds New International Version from "niv"', () => {
    expect(matchesTranslationSearch(translation("NIV"), "niv")).toBe(true);
  });

  it('finds King James Version from "king"', () => {
    expect(matchesTranslationSearch(translation("KJV"), "king")).toBe(true);
  });

  it("matches the full name and the short code for local WEB", () => {
    const web = translation("WEBUS", "WEB");
    expect(matchesTranslationSearch(web, "world english")).toBe(true);
    expect(matchesTranslationSearch(web, "web")).toBe(true);
  });

  it("does not match unrelated text", () => {
    expect(matchesTranslationSearch(translation("KJV"), "standard")).toBe(false);
  });
});
