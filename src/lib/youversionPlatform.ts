// YouVersion Platform REST client — SERVER ONLY.
//
// The App Key (YVP_APP_KEY) is a server-side credential in this codebase. The
// official REST API (developers.youversion.com/quick-reference) authenticates
// with an "X-YVP-App-Key" header; CrossHeartPray keeps that call on the
// server and proxies chapters through /api/scripture/chapter, so no key ever
// reaches a browser bundle. Only API route handlers may import this module —
// scriptureProvider.test.ts enforces that nothing under src/lib/scripture or
// src/components/scripture touches it or the env var.
//
// Licensing truthfulness: GET /v1/bibles returns exactly the versions this
// application is licensed for. Anything not in that list (currently CSB, KJV,
// NIV — the API answers 403 for them) is NEVER served in-app; those remain
// external Bible.com links. If the owner is later granted more licenses in
// the YouVersion dashboard, they appear in /v1/bibles and this site upgrades
// itself with no code change.
//
// Caching: the API itself replies with "cache-control: public, max-age=86400",
// so short-lived in-memory caches and equivalent CDN headers are within the
// platform's own published policy. Nothing is persisted to disk.

const YOUVERSION_API_BASE = "https://api.youversion.com/v1";
const REQUEST_TIMEOUT_MS = 8_000;
const VERSIONS_TTL_MS = 60 * 60 * 1_000; // 1 hour
const CHAPTER_TTL_MS = 24 * 60 * 60 * 1_000; // matches the API's own max-age
const CHAPTER_CACHE_MAX_ENTRIES = 300;

export type YouVersionBible = {
  id: number;
  abbreviation: string;
  title: string;
  languageTag: string;
  copyright: string | null;
  /** USFM codes of the books this version actually contains. */
  books: string[];
};

export function youVersionServerKey(): string | null {
  const key = process.env.YVP_APP_KEY?.trim();
  return key ? key : null;
}

async function apiGet(path: string): Promise<unknown> {
  const key = youVersionServerKey();
  if (!key) throw new Error("YouVersion App Key is not configured.");

  const response = await fetch(`${YOUVERSION_API_BASE}${path}`, {
    headers: { "X-YVP-App-Key": key },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`YouVersion API ${path} responded ${response.status}.`);
  }
  return response.json();
}

// ── Enabled versions ──────────────────────────────────────────────────────

let versionsCache: { fetchedAt: number; versions: YouVersionBible[] } | null = null;

type RawBible = {
  id?: unknown;
  abbreviation?: unknown;
  title?: unknown;
  localized_title?: unknown;
  language_tag?: unknown;
  copyright?: unknown;
  books?: unknown;
};

/**
 * The English Bible versions this application is genuinely licensed for.
 * Cached in memory for an hour; on refresh failure the last good list is
 * kept so a network blip never empties the reader's translation menu.
 */
export async function fetchEnabledYouVersionBibles(): Promise<YouVersionBible[]> {
  const now = Date.now();
  if (versionsCache && now - versionsCache.fetchedAt < VERSIONS_TTL_MS) {
    return versionsCache.versions;
  }

  try {
    const payload = (await apiGet("/bibles?language_ranges[]=en")) as {
      data?: RawBible[];
    };
    const versions: YouVersionBible[] = (payload.data ?? [])
      .filter((raw) => Number.isInteger(raw.id) && typeof raw.abbreviation === "string")
      .map((raw) => ({
        id: raw.id as number,
        abbreviation: raw.abbreviation as string,
        title:
          (typeof raw.localized_title === "string" && raw.localized_title) ||
          (typeof raw.title === "string" && raw.title) ||
          (raw.abbreviation as string),
        languageTag: typeof raw.language_tag === "string" ? raw.language_tag : "en",
        copyright: typeof raw.copyright === "string" ? raw.copyright : null,
        books: Array.isArray(raw.books)
          ? raw.books.filter((book): book is string => typeof book === "string")
          : [],
      }));
    versionsCache = { fetchedAt: now, versions };
    return versions;
  } catch (caught) {
    if (versionsCache) return versionsCache.versions; // stale beats broken
    throw caught;
  }
}

// ── Chapter text ──────────────────────────────────────────────────────────

export type YouVersionChapterVerse = { verse: number; text: string };

const chapterCache = new Map<
  string,
  { fetchedAt: number; verses: YouVersionChapterVerse[] }
>();

/**
 * Parse the API's `format=html` chapter markup into verse-numbered text.
 *
 * The markup mirrors USFM: sequential `<div class="p|q1|q2|d|...">` blocks,
 * verse starts marked by `<span class="yv-v" v="N"></span>` with a visible
 * `<span class="yv-vlbl">N</span>` label. Section headings (classes like
 * "s", "s1", "ms", "r") are editorial, carry no verse marker, and are
 * dropped; the visible labels are dropped too because the reader renders its
 * own verse numbers.
 */
export function parseYouVersionChapterHtml(html: string): YouVersionChapterVerse[] {
  const HEADING_CLASS = /^(s\d?|ms\d?|mr|sr|r|qa|iex|ie|imt\d?|is\d?|b)$/;

  const tokens =
    /<div class="([^"]*)"[^>]*>|<\/div>|<span[^>]*class="yv-v"[^>]*\bv="(\d+)[^"]*"[^>]*>\s*<\/span>|<span[^>]*class="yv-vlbl"[^>]*>[\s\S]*?<\/span>|<[^>]*>|[^<]+/g;

  const verses = new Map<number, string[]>();
  let currentVerse: number | null = null;
  let headingDepth = 0;
  let divDepth = 0;
  const headingStack: number[] = [];

  for (const match of html.matchAll(tokens)) {
    const [token, divClass, verseAttr] = match;

    if (divClass !== undefined) {
      divDepth += 1;
      if (HEADING_CLASS.test(divClass.trim())) {
        headingDepth += 1;
        headingStack.push(divDepth);
      }
      if (currentVerse !== null) verses.get(currentVerse)?.push(" ");
      continue;
    }
    if (token === "</div>") {
      if (headingStack[headingStack.length - 1] === divDepth) {
        headingStack.pop();
        headingDepth -= 1;
      }
      divDepth = Math.max(0, divDepth - 1);
      if (currentVerse !== null) verses.get(currentVerse)?.push(" ");
      continue;
    }
    if (verseAttr !== undefined) {
      currentVerse = Number(verseAttr);
      if (!verses.has(currentVerse)) verses.set(currentVerse, []);
      continue;
    }
    if (token.startsWith("<")) continue; // vlbl labels and any other tags

    if (currentVerse !== null && headingDepth === 0) {
      verses.get(currentVerse)?.push(token);
    }
  }

  return [...verses.entries()]
    .map(([verse, parts]) => ({
      verse,
      text: decodeHtmlEntities(parts.join("")).replace(/\s+/g, " ").trim(),
    }))
    .filter((entry) => Number.isInteger(entry.verse) && entry.verse >= 1 && entry.text)
    .sort((a, b) => a.verse - b.verse);
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/**
 * One licensed chapter as verse-numbered text. Throws on any failure —
 * callers fall back to the local WEB reader, never to a blank screen.
 */
export async function fetchYouVersionChapter(
  bibleId: number,
  bookUsfm: string,
  chapter: number,
): Promise<YouVersionChapterVerse[]> {
  const cacheKey = `${bibleId}:${bookUsfm}.${chapter}`;
  const cached = chapterCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CHAPTER_TTL_MS) {
    return cached.verses;
  }

  const payload = (await apiGet(
    `/bibles/${bibleId}/passages/${bookUsfm}.${chapter}?format=html`,
  )) as { content?: unknown };
  if (typeof payload.content !== "string" || !payload.content) {
    throw new Error("YouVersion passage response had no content.");
  }

  const verses = parseYouVersionChapterHtml(payload.content);
  if (verses.length === 0) {
    throw new Error("YouVersion passage contained no readable verses.");
  }

  if (chapterCache.size >= CHAPTER_CACHE_MAX_ENTRIES) {
    const oldest = chapterCache.keys().next().value;
    if (oldest !== undefined) chapterCache.delete(oldest);
  }
  chapterCache.set(cacheKey, { fetchedAt: Date.now(), verses });
  return verses;
}
