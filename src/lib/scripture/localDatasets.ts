// SERVER ONLY. Every local public-domain Bible dataset, addressable by
// translation.
//
// Do not import this from a client component. src/lib/localBibleVerses.ts is
// the client-safe module: it folds to exactly one dataset at build time so a
// browser never downloads ~9 MB of Scripture it will not read. This module
// deliberately does the opposite — it holds all of them, because the chapter
// API runs on the server and must be able to answer for any translation the
// reader offers. That is what lets the reader show real KJV instead of
// substituting the build-time default.
//
// Adding a translation here is what makes it genuinely readable; the picker
// derives its "can this actually be read" answer from this registry, so the
// two can never drift into advertising a translation that has no text.

import { BSB_BIBLE_VERSES } from "../bibleText/bsbBibleVerses";
import { KJV_BIBLE_VERSES } from "../bibleText/kjvBibleVerses";
import { WEBUS_BIBLE_VERSES } from "../bibleText/webusBibleVerses";
import type { LocalBibleVerse } from "../bibleText/types";
import {
  SUPPORTED_BIBLE_TRANSLATIONS,
  type BibleTranslationId,
} from "./translationConfig";

const DATASETS: Record<BibleTranslationId, LocalBibleVerse[]> = {
  BSB: BSB_BIBLE_VERSES,
  WEBUS: WEBUS_BIBLE_VERSES,
  KJV: KJV_BIBLE_VERSES,
};

/** Every translation that genuinely has local text, in picker order. */
export const LOCAL_READABLE_TRANSLATIONS = Object.values(
  SUPPORTED_BIBLE_TRANSLATIONS,
);

/** Bible.com version id → our translation id, for request/cache identity. */
export function translationIdForBibleComId(
  bibleComId: number,
): BibleTranslationId | null {
  for (const translation of LOCAL_READABLE_TRANSLATIONS) {
    if (translation.bibleComId === bibleComId) {
      return translation.id as BibleTranslationId;
    }
  }
  return null;
}

export function localVersesFor(id: BibleTranslationId): LocalBibleVerse[] {
  return DATASETS[id];
}

// code → chapter → verses, per translation, built once per server instance.
type ChapterVerse = { verse: number; text: string };
const indexes = new Map<string, Map<string, Map<number, ChapterVerse[]>>>();

export function localChapterIndex(id: BibleTranslationId) {
  const existing = indexes.get(id);
  if (existing) return existing;

  const index = new Map<string, Map<number, ChapterVerse[]>>();
  for (const verse of localVersesFor(id)) {
    const chapter = Number(verse.chapter);
    const verseNumber = Number(verse.verse);
    if (!Number.isInteger(chapter) || !Number.isInteger(verseNumber)) continue;

    let byChapter = index.get(verse.code);
    if (!byChapter) {
      byChapter = new Map();
      index.set(verse.code, byChapter);
    }
    let verses = byChapter.get(chapter);
    if (!verses) {
      verses = [];
      byChapter.set(chapter, verses);
    }
    verses.push({ verse: verseNumber, text: verse.text });
  }

  indexes.set(id, index);
  return index;
}
