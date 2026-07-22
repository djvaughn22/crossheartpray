// Truthful translation capabilities for the in-app reader.
//
// GET /api/scripture/translations
//
// Returns the translations CrossHeartPray can genuinely offer right now:
//   - local WEB (always readable here, no network needed),
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

function youVersionTranslation(bible: YouVersionBible): ScriptureTranslation {
  return {
    id: bible.id,
    abbreviation: bible.abbreviation,
    // Geneva Bible's platform abbreviation is "enggnv" — show people "GNV".
    label: bible.abbreviation === "enggnv" ? "GNV" : bible.abbreviation,
    access: "readHere",
    source: "youVersion",
    books: bible.books,
  };
}

export async function GET() {
  const webLocal: ScriptureTranslation = {
    ...BIBLE_COM_DEFAULT_VERSION,
    access: "readHere",
    source: "local",
  };

  let youVersion: ScriptureTranslation[] = [];
  if (youVersionServerKey()) {
    try {
      youVersion = (await fetchEnabledYouVersionBibles())
        // Local WEB already covers the World English Bible, faster.
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
    "WEBUS",
    ...youVersion.map((translation) => translation.abbreviation),
  ]);

  const external: ScriptureTranslation[] = BIBLE_COM_LINK_VERSIONS.filter(
    (version) => !readHereAbbreviations.has(version.abbreviation),
  ).map((version) => ({ ...version, access: "bibleComLink", source: "bibleCom" }));

  return NextResponse.json(
    { translations: [webLocal, ...youVersion, ...external] },
    {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=3600",
      },
    },
  );
}
