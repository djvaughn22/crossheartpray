// Truthful translation capabilities for the in-app reader.
//
// GET /api/scripture/translations
//
// Returns only the translations CrossHeartPray can genuinely render right
// now — everything here is marked "readHere" because everything here has
// text:
//   - every public-domain translation with a complete local dataset
//     (BSB, WEB, KJV — see src/lib/scripture/localDatasets.ts),
//   - every YouVersion Platform translation this application is actually
//     licensed for.
//
// A translation with no readable text is simply absent. The picker is a
// promise: if it is listed, selecting it shows that translation's own words.
// When the YouVersion key is missing or the platform is unreachable, the
// response omits those entries and the local datasets still carry the reader.

import { NextResponse } from "next/server";
import { type ScriptureTranslation } from "../../../../lib/scripture";
import { LOCAL_READABLE_TRANSLATIONS } from "../../../../lib/scripture/localDatasets";
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
  // Every translation with a complete local dataset is genuinely readable.
  // Derived from the dataset registry, so the picker can never advertise a
  // translation whose text does not exist.
  const local: ScriptureTranslation[] = LOCAL_READABLE_TRANSLATIONS.map(
    (translation): ScriptureTranslation => ({
      id: translation.bibleComId,
      abbreviation: translation.bibleComAbbreviation,
      label: translation.shortName,
      access: "readHere",
      source: "local",
    }),
  ).sort(
    (a, b) =>
      readHereRank(a.abbreviation) - readHereRank(b.abbreviation) ||
      a.label.localeCompare(b.label),
  );

  let youVersion: ScriptureTranslation[] = [];
  if (youVersionServerKey()) {
    try {
      const localIds = new Set(local.map((translation) => translation.id));
      youVersion = (await fetchEnabledYouVersionBibles())
        // A local dataset already covers these, faster and offline.
        .filter((bible) => !localIds.has(bible.id))
        .map(youVersionTranslation)
        .sort(
          (a, b) =>
            readHereRank(a.abbreviation) - readHereRank(b.abbreviation) ||
            a.label.localeCompare(b.label),
        );
    } catch {
      youVersion = []; // the local datasets still cover the reader
    }
  }

  // Deliberately no "opens on Bible.com" entries. CrossHeartPray keeps
  // Scripture inside the app (no external one-click Bible links, locked
  // 2026-08-02), so a translation we cannot render here has nowhere truthful
  // to go — listing it only produced a picker that said one translation while
  // the reader showed another. A translation appears here when, and only
  // when, its text can actually be rendered.

  return NextResponse.json(
    { translations: [...local, ...youVersion] },
    {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=3600",
      },
    },
  );
}
