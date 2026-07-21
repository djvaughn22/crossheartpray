// Canonical 66-book table for the shared Scripture system. This is the single
// source of truth for USFM codes, display names, accepted abbreviations, and
// chapter counts. Book names and chapter counts are facts, not licensed text.
//
// Display names match src/lib/localBibleVerses.ts ("Psalms", "Song of
// Solomon") so references formatted here resolve against the local WEB data
// and the hub's /api/local-verse-lookup without translation.

export type ScriptureBook = {
  /** USFM code, e.g. "JHN". Same code Bible.com and YouVersion Platform use. */
  usfm: string;
  /** Display name, e.g. "John". */
  name: string;
  /** Accepted abbreviations (without the leading 1/2/3 ordinal). */
  aliases: string[];
  /** Number of chapters. */
  chapters: number;
  testament: "OT" | "NT";
};

// Order is canon order; index = canon position.
export const SCRIPTURE_BOOKS: ScriptureBook[] = [
  { usfm: "GEN", name: "Genesis", aliases: ["gen", "ge", "gn"], chapters: 50, testament: "OT" },
  { usfm: "EXO", name: "Exodus", aliases: ["exo", "exod", "ex"], chapters: 40, testament: "OT" },
  { usfm: "LEV", name: "Leviticus", aliases: ["lev", "lv"], chapters: 27, testament: "OT" },
  { usfm: "NUM", name: "Numbers", aliases: ["num", "nu", "nm", "numb"], chapters: 36, testament: "OT" },
  { usfm: "DEU", name: "Deuteronomy", aliases: ["deu", "deut", "dt"], chapters: 34, testament: "OT" },
  { usfm: "JOS", name: "Joshua", aliases: ["jos", "josh"], chapters: 24, testament: "OT" },
  { usfm: "JDG", name: "Judges", aliases: ["jdg", "judg", "jgs"], chapters: 21, testament: "OT" },
  { usfm: "RUT", name: "Ruth", aliases: ["rut", "ru", "rth"], chapters: 4, testament: "OT" },
  { usfm: "1SA", name: "1 Samuel", aliases: ["sam", "samuel", "sa", "sm"], chapters: 31, testament: "OT" },
  { usfm: "2SA", name: "2 Samuel", aliases: ["sam", "samuel", "sa", "sm"], chapters: 24, testament: "OT" },
  { usfm: "1KI", name: "1 Kings", aliases: ["ki", "kgs", "kings", "kin"], chapters: 22, testament: "OT" },
  { usfm: "2KI", name: "2 Kings", aliases: ["ki", "kgs", "kings", "kin"], chapters: 25, testament: "OT" },
  { usfm: "1CH", name: "1 Chronicles", aliases: ["ch", "chr", "chron", "chronicles"], chapters: 29, testament: "OT" },
  { usfm: "2CH", name: "2 Chronicles", aliases: ["ch", "chr", "chron", "chronicles"], chapters: 36, testament: "OT" },
  { usfm: "EZR", name: "Ezra", aliases: ["ezr"], chapters: 10, testament: "OT" },
  { usfm: "NEH", name: "Nehemiah", aliases: ["neh", "ne"], chapters: 13, testament: "OT" },
  { usfm: "EST", name: "Esther", aliases: ["est", "esth"], chapters: 10, testament: "OT" },
  { usfm: "JOB", name: "Job", aliases: ["jb"], chapters: 42, testament: "OT" },
  { usfm: "PSA", name: "Psalms", aliases: ["psalm", "psa", "ps", "pss", "psm"], chapters: 150, testament: "OT" },
  { usfm: "PRO", name: "Proverbs", aliases: ["pro", "prov", "pr", "prv"], chapters: 31, testament: "OT" },
  { usfm: "ECC", name: "Ecclesiastes", aliases: ["ecc", "eccl", "eccles", "ec"], chapters: 12, testament: "OT" },
  { usfm: "SNG", name: "Song of Solomon", aliases: ["song of songs", "song", "sng", "sos", "ss", "canticles"], chapters: 8, testament: "OT" },
  { usfm: "ISA", name: "Isaiah", aliases: ["isa", "is"], chapters: 66, testament: "OT" },
  { usfm: "JER", name: "Jeremiah", aliases: ["jer", "je"], chapters: 52, testament: "OT" },
  { usfm: "LAM", name: "Lamentations", aliases: ["lam", "la"], chapters: 5, testament: "OT" },
  { usfm: "EZK", name: "Ezekiel", aliases: ["ezk", "ezek", "eze"], chapters: 48, testament: "OT" },
  { usfm: "DAN", name: "Daniel", aliases: ["dan", "da", "dn"], chapters: 12, testament: "OT" },
  { usfm: "HOS", name: "Hosea", aliases: ["hos", "ho"], chapters: 14, testament: "OT" },
  { usfm: "JOL", name: "Joel", aliases: ["jol", "joe", "jl"], chapters: 3, testament: "OT" },
  { usfm: "AMO", name: "Amos", aliases: ["amo", "am"], chapters: 9, testament: "OT" },
  { usfm: "OBA", name: "Obadiah", aliases: ["oba", "obad", "ob"], chapters: 1, testament: "OT" },
  { usfm: "JON", name: "Jonah", aliases: ["jon", "jnh"], chapters: 4, testament: "OT" },
  { usfm: "MIC", name: "Micah", aliases: ["mic", "mi"], chapters: 7, testament: "OT" },
  { usfm: "NAM", name: "Nahum", aliases: ["nam", "nah", "na"], chapters: 3, testament: "OT" },
  { usfm: "HAB", name: "Habakkuk", aliases: ["hab", "hb"], chapters: 3, testament: "OT" },
  { usfm: "ZEP", name: "Zephaniah", aliases: ["zep", "zeph", "zp"], chapters: 3, testament: "OT" },
  { usfm: "HAG", name: "Haggai", aliases: ["hag", "hg"], chapters: 2, testament: "OT" },
  { usfm: "ZEC", name: "Zechariah", aliases: ["zec", "zech", "zc"], chapters: 14, testament: "OT" },
  { usfm: "MAL", name: "Malachi", aliases: ["mal", "ml"], chapters: 4, testament: "OT" },
  { usfm: "MAT", name: "Matthew", aliases: ["mat", "matt", "mt"], chapters: 28, testament: "NT" },
  { usfm: "MRK", name: "Mark", aliases: ["mrk", "mk", "mar"], chapters: 16, testament: "NT" },
  { usfm: "LUK", name: "Luke", aliases: ["luk", "lk", "lu"], chapters: 24, testament: "NT" },
  { usfm: "JHN", name: "John", aliases: ["jhn", "jn", "joh"], chapters: 21, testament: "NT" },
  { usfm: "ACT", name: "Acts", aliases: ["act", "ac"], chapters: 28, testament: "NT" },
  { usfm: "ROM", name: "Romans", aliases: ["rom", "ro", "rm"], chapters: 16, testament: "NT" },
  { usfm: "1CO", name: "1 Corinthians", aliases: ["co", "cor", "corinthians"], chapters: 16, testament: "NT" },
  { usfm: "2CO", name: "2 Corinthians", aliases: ["co", "cor", "corinthians"], chapters: 13, testament: "NT" },
  { usfm: "GAL", name: "Galatians", aliases: ["gal", "ga"], chapters: 6, testament: "NT" },
  { usfm: "EPH", name: "Ephesians", aliases: ["eph", "ep"], chapters: 6, testament: "NT" },
  { usfm: "PHP", name: "Philippians", aliases: ["php", "phil", "philip"], chapters: 4, testament: "NT" },
  { usfm: "COL", name: "Colossians", aliases: ["col"], chapters: 4, testament: "NT" },
  { usfm: "1TH", name: "1 Thessalonians", aliases: ["th", "thes", "thess", "thessalonians"], chapters: 5, testament: "NT" },
  { usfm: "2TH", name: "2 Thessalonians", aliases: ["th", "thes", "thess", "thessalonians"], chapters: 3, testament: "NT" },
  { usfm: "1TI", name: "1 Timothy", aliases: ["ti", "tim", "timothy"], chapters: 6, testament: "NT" },
  { usfm: "2TI", name: "2 Timothy", aliases: ["ti", "tim", "timothy"], chapters: 4, testament: "NT" },
  { usfm: "TIT", name: "Titus", aliases: ["tit", "tts"], chapters: 3, testament: "NT" },
  { usfm: "PHM", name: "Philemon", aliases: ["phm", "philem", "phlm"], chapters: 1, testament: "NT" },
  { usfm: "HEB", name: "Hebrews", aliases: ["heb"], chapters: 13, testament: "NT" },
  { usfm: "JAS", name: "James", aliases: ["jas", "jam", "jm"], chapters: 5, testament: "NT" },
  { usfm: "1PE", name: "1 Peter", aliases: ["pe", "pet", "pt", "peter"], chapters: 5, testament: "NT" },
  { usfm: "2PE", name: "2 Peter", aliases: ["pe", "pet", "pt", "peter"], chapters: 3, testament: "NT" },
  { usfm: "1JN", name: "1 John", aliases: ["jn", "jhn", "john", "jo"], chapters: 5, testament: "NT" },
  { usfm: "2JN", name: "2 John", aliases: ["jn", "jhn", "john", "jo"], chapters: 1, testament: "NT" },
  { usfm: "3JN", name: "3 John", aliases: ["jn", "jhn", "john", "jo"], chapters: 1, testament: "NT" },
  { usfm: "JUD", name: "Jude", aliases: ["jud", "jde", "jd"], chapters: 1, testament: "NT" },
  { usfm: "REV", name: "Revelation", aliases: ["rev", "revelations", "re", "rv", "apocalypse"], chapters: 22, testament: "NT" },
];

const BOOK_BY_USFM = new Map(SCRIPTURE_BOOKS.map((book) => [book.usfm, book]));

export function getScriptureBook(usfm: string): ScriptureBook | null {
  return BOOK_BY_USFM.get(usfm.toUpperCase()) ?? null;
}

export function scriptureBookIndex(usfm: string): number {
  const upper = usfm.toUpperCase();
  return SCRIPTURE_BOOKS.findIndex((book) => book.usfm === upper);
}

// "ii tim" → { ordinal: 2, rest: "tim" }; "john" → { ordinal: null, rest: "john" }
function splitOrdinal(input: string): { ordinal: number | null; rest: string } {
  const match = input.match(/^(1st|2nd|3rd|first|second|third|iii|ii|i|[123])\b\s*/i);
  if (!match) return { ordinal: null, rest: input };

  const token = match[1].toLowerCase();
  const ordinal =
    token === "1" || token === "1st" || token === "first" || token === "i"
      ? 1
      : token === "2" || token === "2nd" || token === "second" || token === "ii"
        ? 2
        : 3;

  return { ordinal, rest: input.slice(match[0].length) };
}

function normalizeBookInput(input: string): string {
  return input.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
}

function bookMatchesRest(book: ScriptureBook, ordinal: number | null, rest: string, exact: boolean): boolean {
  // Book's own leading ordinal ("1 Peter" → 1) must agree with the query's.
  const bookOrdinal = /^[123]/.test(book.usfm) ? Number(book.usfm[0]) : null;
  if (ordinal !== bookOrdinal && !(ordinal === null && bookOrdinal === 1 && rest.length > 1)) {
    // Allow "peter" (no ordinal) to suggest 1 Peter, but never "1 john" → John.
    if (!(ordinal === null && bookOrdinal !== null)) return false;
  }

  const plainName = book.name.replace(/^[123] /, "").toLowerCase();
  const candidates = [plainName, ...book.aliases];

  return candidates.some((candidate) =>
    exact ? candidate === rest : candidate.startsWith(rest),
  );
}

/**
 * Exact-match resolver: full display name, alias, or USFM code → USFM code,
 * "" when nothing matches. Unlike matchScriptureBooks this never
 * prefix-matches, so data-driven lookups (stored book fields, legacy tables)
 * keep their strict old behavior.
 */
export function resolveBookCode(input: string): string {
  const normalized = normalizeBookInput(input);
  if (!normalized) return "";

  const direct = BOOK_BY_USFM.get(normalized.toUpperCase().replace(/ /g, ""));
  if (direct) return direct.usfm;

  const { ordinal, rest } = splitOrdinal(normalized);
  if (!rest) return "";

  const exact = SCRIPTURE_BOOKS.find((book) => bookMatchesRest(book, ordinal, rest, true));
  return exact?.usfm ?? "";
}

// Display-name → code pairs (plus the display variants people actually type),
// for callers that scan text for a leading book name. Longest-first so
// "1 Chronicles" wins before "1 Chronicles"-prefix ambiguity ever matters.
export const SCRIPTURE_BOOK_NAME_TO_CODE: ReadonlyArray<readonly [string, string]> = [
  ...SCRIPTURE_BOOKS.map((book) => [book.name, book.usfm] as const),
  ["Psalm", "PSA"] as const,
  ["Song of Songs", "SNG"] as const,
].sort((left, right) => right[0].length - left[0].length);

/**
 * Resolve free text ("II Tim", "1 jn", "Matt") to matching books, best first.
 * Exact alias matches beat prefix matches; canon order breaks ties.
 */
export function matchScriptureBooks(input: string): ScriptureBook[] {
  const normalized = normalizeBookInput(input);
  if (!normalized) return [];

  // A bare USFM code is a direct hit ("JHN", "1sa").
  const direct = BOOK_BY_USFM.get(normalized.toUpperCase().replace(/ /g, ""));
  if (direct) return [direct];

  const { ordinal, rest } = splitOrdinal(normalized);
  if (!rest) {
    // Just "1" / "2" / "3": every book with that ordinal.
    return ordinal ? SCRIPTURE_BOOKS.filter((book) => book.usfm.startsWith(String(ordinal))) : [];
  }

  const exact = SCRIPTURE_BOOKS.filter((book) => bookMatchesRest(book, ordinal, rest, true));
  const prefix = SCRIPTURE_BOOKS.filter(
    (book) => !exact.includes(book) && bookMatchesRest(book, ordinal, rest, false),
  );

  return [...exact, ...prefix];
}
