// Truthful translation capabilities for the in-app reader.
//
// GET /api/scripture/translations
//
// Returns the translations CrossHeartPray can genuinely offer right now:
//   - the local active translation (always readable here, no network needed;
//     BSB by default — see src/lib/scripture/translationConfig.ts),
//   - every YouVersion Platform translation this application is actually
//     licensed for (marked "readHere"),
//   - well-known translations that open on Bible.com (marked "bibleComLink").
//
// The list is generated from the live /v1/bibles response, never hard-coded —
// if the owner is later licensed for CSB/KJV/NIV in the YouVersion dashboard,
// they appear here (and become the preferred defaults) with no code change.
// When the key is missing or the platform is unreachable, the response simply
// omits YouVersion entries: the reader still has local WEB and external
// links, and the page never breaks.

import { NextResponse } from "next/server";
import {
  BIBLE_COM_DEFAULT_VERSION,
  BIBLE_COM_LINK_VERSIONS,
  type ScriptureTranslation,
} from "../../../../lib/scripture";
import { ACTIVE_BIBLE_TRANSLATION } from "../../../../lib/scripture/translationConfig";
import {
  fetchEnabledYouVersionBibles,
  youVersionServerKey,
  type YouVersionBible,
} from "../../../../lib/youversionPlatform";

// Preferred ordering for readable translations: the licensed favorites first
// (CSB/KJV/NIV appear the moment the application is licensed for them), then
// the strongest public-domain texts.
const READ_HERE_PRIORITY = [
  "CSB",
  "KJV",
  "NIV",
  "BSB",
  "ASV",
  "LSV",
  "FBV",
  "enggnv",
  "WMB",
  "WMBBE",
  "TCENT",
  "CPDV",
  "TOJB2011",
];

function readHereRank(abbreviation: string): number {
  const index = READ_HERE_PRIORITY.indexOf(abbreviation);
  return index === -1 ? READ_HERE_PRIORITY.length : index;
}

// Platform codes people shouldn't have to decode ("enggnv" → "GNV").
const YOUVERSION_LABEL_OVERRIDES: Record<string, string> = {
  enggnv: "GNV",
  engWEBUS: "WEB",
};

function youVersionTranslation(bible: YouVersionBible): ScriptureTranslation {
  return {
    id: bible.id,
    abbreviation: bible.abbreviation,
    label: YOUVERSION_LABEL_OVERRIDES[bible.abbreviation] ?? bible.abbreviation,
    access: "readHere",
    source: "youVersion",
    books: bible.books,
  };
}

export async function GET() {
  const activeLocal: ScriptureTranslation = {
    ...BIBLE_COM_DEFAULT_VERSION,
    access: "readHere",
    source: "local",
  };

  let youVersion: ScriptureTranslation[] = [];
  if (youVersionServerKey()) {
    try {
      youVersion = (await fetchEnabledYouVersionBibles())
        // The local dataset already covers the active translation, faster.
        .filter((bible) => bible.id !== BIBLE_COM_DEFAULT_VERSION.id)
        .map(youVersionTranslation)
        .sort(
          (a, b) =>
            readHereRank(a.abbreviation) - readHereRank(b.abbreviation) ||
            a.label.localeCompare(b.label),
        );
    } catch {
      youVersion = []; // reader still has local WEB + external links
    }
  }

  const readHereAbbreviations = new Set([
    ACTIVE_BIBLE_TRANSLATION.bibleComAbbreviation,
    ...youVersion.map((translation) => translation.abbreviation),
  ]);
  // Ids too: the platform's WEB entry is "engWEBUS" while the deep-link list
  // says "WEBUS" — same Bible.com id, one picker entry.
  const readHereIds = new Set([
    BIBLE_COM_DEFAULT_VERSION.id,
    ...youVersion.map((translation) => translation.id),
  ]);

  const external: ScriptureTranslation[] = BIBLE_COM_LINK_VERSIONS.filter(
    (version) =>
      !readHereAbbreviations.has(version.abbreviation) && !readHereIds.has(version.id),
  ).map((version) => ({ ...version, access: "bibleComLink", source: "bibleCom" }));

  return NextResponse.json(
    { translations: [activeLocal, ...youVersion, ...external] },
    {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=3600",
      },
    },
  );
}
