// Canonical resolved Bible reference — the single source of truth for every
// selected verse or passage.
//
// After a search result, card deal, or principle link is selected, the UI
// derives EVERYTHING from one ResolvedScriptureReference: heading, verse
// label, in-app reader routes, the Bible.com deep link, Deep Dive reference,
// share data, and the exact Reading Plan week/lane destination. No surface
// may keep its own copy of the book, chapter, or label — that is how a card
// once showed "Malachi 4:6" while its buttons still said "Zechariah".
//
// Built only from the shared parser (reference.ts), the canonical book table
// (books.ts), and the real 52-week Reading Plan dataset. Never from
// component state, remote payload labels, or a second parser.

import {
  bibleReadingPlanDayForReference,
  bibleReadingPlanDayHref,
  type BibleReadingPlanDay,
} from "../bibleReadingPlan";
import { getScriptureBook } from "./books";
import {
  BIBLE_COM_DEFAULT_VERSION,
  bibleComUrl,
  formatScriptureReference,
  parseScriptureReference,
  toUsfmString,
  type ScriptureReference,
} from "./reference";

export type ResolvedReadingPlanTarget = {
  week: number;
  /** Lane key used by the Reading Plan URL scheme ("friday"). */
  daySlug: string;
  dayLabel: string;
  /** Lane name from the plan dataset ("Prophecy"). */
  lane: string;
  /** The plan's own reading text ("Malachi", "Zechariah 8-14"). */
  reading: string;
  /** Deterministic, shareable deep link: query params + anchor. */
  href: string;
  /** "Week 48 · Friday — Malachi" */
  label: string;
};

export type ResolvedScriptureReference = {
  /** USFM book code, e.g. "MAL". */
  bookCode: string;
  /** Canonical display name, e.g. "Malachi". */
  bookName: string;
  testament: "OT" | "NT";
  chapter: number;
  verse?: number;
  endVerse?: number;
  /** Complete reference label, e.g. "Malachi 4:6". */
  label: string;
  /** Chapter-level label, e.g. "Malachi 4". */
  chapterLabel: string;
  /** "MAL.4.6" — YouVersion/Bible.com format. */
  usfm: string;
  /** The selected verse or passage — the in-app reader route. */
  reference: ScriptureReference;
  /** The complete chapter containing the selection — "Read chapter here". */
  chapterReference: ScriptureReference;
  /** Exact selected verse/passage on Bible.com (WEB default). */
  bibleComUrl: string;
  /** The containing chapter on Bible.com (WEB default). */
  bibleComChapterUrl: string;
  /** Real Reading Plan destination, or null when the dataset has no entry. */
  readingPlan: ResolvedReadingPlanTarget | null;
};

function planTarget(day: BibleReadingPlanDay): ResolvedReadingPlanTarget {
  return {
    week: day.week,
    daySlug: day.daySlug,
    dayLabel: day.dayLabel,
    lane: day.category,
    reading: day.reading,
    href: bibleReadingPlanDayHref(day),
    label: `Week ${day.week} · ${day.dayLabel} — ${day.reading}`,
  };
}

/**
 * Resolve free text or a structured reference into the canonical object.
 * Book-only input resolves to chapter 1. Returns null when the book is
 * unknown or the chapter is out of range — callers must then show no verse
 * actions at all rather than keeping a previous reference's actions.
 */
export function resolveScriptureSelection(
  input: string | ScriptureReference,
): ResolvedScriptureReference | null {
  const parsed = typeof input === "string" ? parseScriptureReference(input) : input;
  if (!parsed) return null;

  const book = getScriptureBook(parsed.book);
  if (!book) return null;

  const chapter = parsed.chapter ?? 1;
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) return null;

  const verse =
    parsed.verse !== undefined && Number.isInteger(parsed.verse) && parsed.verse >= 1
      ? parsed.verse
      : undefined;
  const endVerse =
    verse !== undefined &&
    parsed.endVerse !== undefined &&
    Number.isInteger(parsed.endVerse) &&
    parsed.endVerse > verse
      ? parsed.endVerse
      : undefined;

  const reference: ScriptureReference = {
    book: book.usfm,
    chapter,
    ...(verse !== undefined ? { verse } : {}),
    ...(endVerse !== undefined ? { endVerse } : {}),
  };
  const chapterReference: ScriptureReference = { book: book.usfm, chapter };

  const planDay = bibleReadingPlanDayForReference(book.usfm, chapter);

  return {
    bookCode: book.usfm,
    bookName: book.name,
    testament: book.testament,
    chapter,
    verse,
    endVerse,
    label: formatScriptureReference(reference),
    chapterLabel: formatScriptureReference(chapterReference),
    usfm: toUsfmString(reference),
    reference,
    chapterReference,
    bibleComUrl: bibleComUrl(reference),
    bibleComChapterUrl: bibleComUrl(chapterReference),
    readingPlan: planDay ? planTarget(planDay) : null,
  };
}

/**
 * Bible.com link honoring a chosen translation when it carries a usable
 * Bible.com id/abbreviation; falls back safely to WEB otherwise.
 */
export function bibleComUrlForTranslation(
  reference: ScriptureReference,
  translation?: { id: number; abbreviation: string } | null,
): string {
  const usable =
    translation &&
    Number.isInteger(translation.id) &&
    translation.id > 0 &&
    typeof translation.abbreviation === "string" &&
    /^[A-Z0-9]{2,10}$/i.test(translation.abbreviation)
      ? translation
      : BIBLE_COM_DEFAULT_VERSION;
  return bibleComUrl(reference, usable);
}
