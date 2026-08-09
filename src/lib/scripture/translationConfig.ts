// The one place that decides which Bible translation CrossHeartPray uses.
//
// Every Scripture surface — the in-app reader, reading plan, Bible Bingo 7,
// Daily Hope, share cards, emails, PDFs, Bible.com deep links, API routes —
// derives its translation from this module. Switching the whole site is one
// deployment change: set BIBLE_TRANSLATION=WEBUS (or BSB) and redeploy.
// next.config.ts inlines the value into both server and client bundles at
// build time, so the two can never disagree.
//
// Every supported translation is public domain and ships as a complete local
// dataset under src/lib/bibleText/. Never scatter per-surface translation
// defaults; import from here instead.
//
// BIBLE_TRANSLATION only chooses the SITE-WIDE default — the text used by
// Bible Bingo pools, Daily Hope, share cards, and exports, and the one dataset
// bundled for the client. The in-app reader is separate: it serves any of
// these translations through /api/scripture/chapter, which reads them all
// server-side (src/lib/scripture/localDatasets.ts). A reader translation is
// therefore never limited to the build-time default.

export type BibleTranslationDefinition = {
  /** Registry key, e.g. "BSB". */
  id: string;
  /** Full display name, e.g. "Berean Standard Bible". */
  name: string;
  /** Short label people see next to verse text. */
  shortName: string;
  /** Bible.com's numeric version id for deep links. */
  bibleComId: number;
  /** Bible.com's URL abbreviation for deep links. */
  bibleComAbbreviation: string;
  /** Attribution line for the reader footer, API responses, and exports. */
  attribution: string;
};

export const SUPPORTED_BIBLE_TRANSLATIONS = {
  BSB: {
    id: "BSB",
    name: "Berean Standard Bible",
    shortName: "BSB",
    bibleComId: 3034,
    bibleComAbbreviation: "BSB",
    attribution: "Berean Standard Bible (BSB), public domain.",
  },
  WEBUS: {
    id: "WEBUS",
    name: "World English Bible",
    shortName: "WEB",
    bibleComId: 206,
    bibleComAbbreviation: "WEBUS",
    attribution: "World English Bible (WEB), public domain.",
  },
  KJV: {
    id: "KJV",
    name: "King James Version",
    shortName: "KJV",
    bibleComId: 1,
    bibleComAbbreviation: "KJV",
    attribution: "King James Version (KJV), public domain.",
  },
} as const satisfies Record<string, BibleTranslationDefinition>;

export type BibleTranslationId = keyof typeof SUPPORTED_BIBLE_TRANSLATIONS;

/** The site-wide default when BIBLE_TRANSLATION is missing or invalid. */
export const FALLBACK_BIBLE_TRANSLATION: BibleTranslationId = "BSB";

/** Validate a configured value against the registry; null when unusable. */
export function parseConfiguredTranslation(
  value: string | null | undefined,
): BibleTranslationId | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  return normalized in SUPPORTED_BIBLE_TRANSLATIONS
    ? (normalized as BibleTranslationId)
    : null;
}

export const DEFAULT_BIBLE_TRANSLATION: BibleTranslationId =
  parseConfiguredTranslation(process.env.BIBLE_TRANSLATION) ??
  FALLBACK_BIBLE_TRANSLATION;

/** The full definition of the active site-wide translation. */
export const ACTIVE_BIBLE_TRANSLATION =
  SUPPORTED_BIBLE_TRANSLATIONS[DEFAULT_BIBLE_TRANSLATION];
