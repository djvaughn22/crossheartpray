// Structured Scripture references for the shared Scripture system.
//
// Every feature passes these objects around instead of re-parsing raw strings.
// `toUsfmString` emits the same BOOK.CHAPTER.VERSE format the YouVersion
// Platform SDKs and Bible.com use, so a future embedded YouVersion reader can
// consume these references unchanged.

import { getScriptureBook, matchScriptureBooks, SCRIPTURE_BOOKS, scriptureBookIndex } from "./books";

export type ScriptureReference = {
  /** USFM book code, e.g. "JHN". */
  book: string;
  /** 1-based chapter. Absent = whole book. */
  chapter?: number;
  /** 1-based verse. Absent = whole chapter. */
  verse?: number;
  /** Inclusive end verse for ranges like John 3:16-18. */
  endVerse?: number;
};

// Bible.com's id/abbreviation for the World English Bible — the same
// translation CrossHeartPray has always deep-linked to. `abbreviation` is
// Bible.com's URL code; `label` is what people see.
export const BIBLE_COM_DEFAULT_VERSION = { id: 206, abbreviation: "WEBUS", label: "WEB" };

// Deep-link translations offered by TranslationPicker. These only change
// which Bible.com page opens; text rendered inside CrossHeartPray comes from
// local WEB or a genuinely licensed YouVersion translation, never from these
// links.
export const BIBLE_COM_LINK_VERSIONS = [
  BIBLE_COM_DEFAULT_VERSION,
  { id: 1713, abbreviation: "CSB", label: "CSB" },
  { id: 1, abbreviation: "KJV", label: "KJV" },
  { id: 111, abbreviation: "NIV", label: "NIV" },
  { id: 59, abbreviation: "ESV", label: "ESV" },
  { id: 116, abbreviation: "NLT", label: "NLT" },
] as const;

export type BibleComLinkVersion = (typeof BIBLE_COM_LINK_VERSIONS)[number];

/**
 * Parse free text into a structured reference. Returns null when no book
 * matches or the chapter is out of range. Accepts "John", "John 3",
 * "John 3:16", "Jn 3.16", "II Timothy 1", "1 Peter", "Psalm 23", ranges
 * ("John 3:16-18"), and USFM ("JHN.3.16").
 */
export function parseScriptureReference(input: string): ScriptureReference | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // USFM form first: JHN, JHN.3, JHN.3.16, JHN.3.16-18
  const usfmMatch = trimmed.match(/^([1-3]?[A-Za-z]{2,3})(?:\.(\d{1,3})(?:\.(\d{1,3})(?:-(\d{1,3}))?)?)?$/);
  if (usfmMatch && getScriptureBook(usfmMatch[1])) {
    return buildReference(usfmMatch[1].toUpperCase(), usfmMatch[2], usfmMatch[3], usfmMatch[4]);
  }

  // Natural form: book part is everything before the trailing number group.
  const match = trimmed.match(/^(.*?)\s*(\d{1,3})?(?:\s*[:.]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?)?$/);
  if (!match) return null;

  const [, bookPart, chapterPart, versePart, endVersePart] = match;
  if (!bookPart) return null;

  const books = matchScriptureBooks(bookPart);
  if (books.length === 0) return null;

  return buildReference(books[0].usfm, chapterPart, versePart, endVersePart);
}

function buildReference(
  usfm: string,
  chapterPart?: string,
  versePart?: string,
  endVersePart?: string,
): ScriptureReference | null {
  const book = getScriptureBook(usfm);
  if (!book) return null;

  if (chapterPart === undefined) return { book: book.usfm };

  const chapter = Number(chapterPart);
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) return null;

  if (versePart === undefined) return { book: book.usfm, chapter };

  const verse = Number(versePart);
  if (!Number.isInteger(verse) || verse < 1) return null;

  const reference: ScriptureReference = { book: book.usfm, chapter, verse };

  if (endVersePart !== undefined) {
    const endVerse = Number(endVersePart);
    if (Number.isInteger(endVerse) && endVerse > verse) reference.endVerse = endVerse;
  }

  return reference;
}

/** "John 3:16-18", "Psalms 23", "1 Peter". */
export function formatScriptureReference(reference: ScriptureReference): string {
  const book = getScriptureBook(reference.book);
  const name = book?.name ?? reference.book;
  if (reference.chapter === undefined) return name;
  if (reference.verse === undefined) return `${name} ${reference.chapter}`;
  const range = reference.endVerse ? `-${reference.endVerse}` : "";
  return `${name} ${reference.chapter}:${reference.verse}${range}`;
}

/** "JHN.3.16-18", "PSA.23", "1PE" — YouVersion Platform / Bible.com format. */
export function toUsfmString(reference: ScriptureReference): string {
  let usfm = reference.book;
  if (reference.chapter !== undefined) usfm += `.${reference.chapter}`;
  if (reference.chapter !== undefined && reference.verse !== undefined) {
    usfm += `.${reference.verse}`;
    if (reference.endVerse) usfm += `-${reference.endVerse}`;
  }
  return usfm;
}

/**
 * Bible.com deep link. Book-only references open chapter 1; the version
 * defaults to WEB, matching every existing CrossHeartPray link.
 */
export function bibleComUrl(
  reference: ScriptureReference,
  version: { id: number; abbreviation: string } = BIBLE_COM_DEFAULT_VERSION,
): string {
  const withChapter: ScriptureReference = reference.chapter
    ? reference
    : { ...reference, chapter: 1 };
  return `https://www.bible.com/bible/${version.id}/${toUsfmString(withChapter)}.${version.abbreviation}`;
}

/**
 * Adapter for CrossHeartPray's existing passage shape ({ code, chapter,
 * verse } with string fields). Every legacy verseUrl/chapterUrl helper
 * delegates here so the deep-link format lives in exactly one place.
 */
export function bibleComUrlForPassage(passage: {
  code: string;
  chapter: string | number;
  verse?: string | number;
  endVerse?: string | number;
}): string {
  const reference: ScriptureReference = {
    book: passage.code,
    chapter: Number(passage.chapter),
  };
  if (passage.verse !== undefined) {
    reference.verse = Number(passage.verse);
    if (passage.endVerse !== undefined && Number(passage.endVerse) > reference.verse) {
      reference.endVerse = Number(passage.endVerse);
    }
  }
  return bibleComUrl(reference);
}

/**
 * Structured reference from CrossHeartPray's existing passage shape
 * ({ code, chapter, verse } with string fields) — the "Read here" twin of
 * bibleComUrlForPassage. parseInt so range verses like "16-18" open at the
 * first verse. Null when the fields don't parse; callers then simply omit
 * the in-app option and keep their external links.
 */
export function referenceForPassage(passage: {
  code: string;
  chapter: string | number;
  verse?: string | number;
}): ScriptureReference | null {
  const chapter = parseInt(String(passage.chapter), 10);
  if (!getScriptureBook(passage.code) || !Number.isInteger(chapter) || chapter < 1) {
    return null;
  }
  const reference: ScriptureReference = { book: passage.code, chapter };
  if (passage.verse !== undefined) {
    const verse = parseInt(String(passage.verse), 10);
    if (Number.isInteger(verse) && verse >= 1) reference.verse = verse;
  }
  return reference;
}

/** Previous/next chapter across book boundaries; null past either end of the canon. */
export function adjacentChapter(
  reference: Pick<ScriptureReference, "book" | "chapter">,
  direction: 1 | -1,
): ScriptureReference | null {
  const book = getScriptureBook(reference.book);
  if (!book) return null;

  const chapter = (reference.chapter ?? 1) + direction;
  if (chapter >= 1 && chapter <= book.chapters) return { book: book.usfm, chapter };

  const nextBook = SCRIPTURE_BOOKS[scriptureBookIndex(book.usfm) + direction];
  if (!nextBook) return null;

  return { book: nextBook.usfm, chapter: direction === 1 ? 1 : nextBook.chapters };
}
