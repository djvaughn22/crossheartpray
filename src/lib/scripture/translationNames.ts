// Human-facing names for Bible translations.
//
// The picker never asks anyone to decode an abbreviation: every translation
// the Scripture system can surface (local WEB, the YouVersion-licensed set,
// Bible.com links) shows its full name first and the short code second.
// Unknown codes fall back to the platform label — never blank, never wrong.
//
// Presentation-only: nothing here touches licensing, providers, or API logic.

import type { ScriptureTranslation } from "./provider";

const TRANSLATION_FULL_NAMES: Record<string, string> = {
  WEB: "World English Bible",
  WEBUS: "World English Bible",
  CSB: "Christian Standard Bible",
  KJV: "King James Version",
  NIV: "New International Version",
  ESV: "English Standard Version",
  NLT: "New Living Translation",
  BSB: "Berean Standard Bible",
  ASV: "American Standard Version",
  LSV: "Literal Standard Version",
  FBV: "Free Bible Version",
  GNV: "Geneva Bible",
  enggnv: "Geneva Bible",
  WMB: "World Messianic Bible",
  WMBBE: "World Messianic Bible, British Edition",
  TCENT: "Text-Critical English New Testament",
  CPDV: "Catholic Public Domain Version",
  TOJB2011: "Orthodox Jewish Bible",
};

type NamedTranslation = Pick<ScriptureTranslation, "abbreviation" | "label">;

/** "World English Bible" — the full name people recognize, label as fallback. */
export function translationDisplayName(translation: NamedTranslation): string {
  return (
    TRANSLATION_FULL_NAMES[translation.abbreviation] ??
    TRANSLATION_FULL_NAMES[translation.label] ??
    translation.label
  );
}

// The calm default view: the famous names people look for, plus the Bible
// that always reads here. CSB joins Recommended only when genuinely licensed
// (readHere) — an unlicensed CSB card would put a link where first-time
// readers expect reading.
const RECOMMENDED_ALWAYS = new Set(["WEB", "WEBUS", "KJV", "NIV"]);
const RECOMMENDED_ORDER = ["CSB", "WEBUS", "WEB", "KJV", "NIV"];

export function isRecommendedTranslation(translation: ScriptureTranslation): boolean {
  if (translation.abbreviation === "CSB") return translation.access === "readHere";
  return RECOMMENDED_ALWAYS.has(translation.abbreviation);
}

export function recommendedRank(translation: NamedTranslation): number {
  const index = RECOMMENDED_ORDER.indexOf(translation.abbreviation);
  return index === -1 ? RECOMMENDED_ORDER.length : index;
}

/** Case-insensitive match on full name or short code: "niv", "king", "web". */
export function matchesTranslationSearch(
  translation: NamedTranslation,
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    translationDisplayName(translation).toLowerCase().includes(needle) ||
    translation.label.toLowerCase().includes(needle) ||
    translation.abbreviation.toLowerCase().includes(needle)
  );
}
