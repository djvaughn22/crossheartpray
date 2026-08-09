// Whole-chapter Scripture endpoint for the in-app reader.
//
// GET /api/scripture/chapter?book=JHN&chapter=3          → the site-wide
//                                                          default translation
// GET /api/scripture/chapter?book=JHN&chapter=3&version=1  → real KJV text
// GET /api/scripture/chapter?book=JHN&chapter=3&version=1713
//                                                          → YouVersion text
//
// Every public-domain translation in the registry ships as a complete local
// dataset and is served straight from it (src/lib/scripture/localDatasets.ts):
// a few KB per chapter, immutable-cacheable, no network. A `version` outside
// that registry is proxied from the YouVersion Platform, but ONLY one the
// application is genuinely licensed for (the enabled-versions list is the
// gate); the App Key never leaves the server.
//
// The response's `translation` field always names the text actually returned.
// This endpoint never substitutes one translation for another: an unavailable
// translation is an error status, not someone else's Scripture wearing its
// label.

import { NextResponse } from "next/server";
import { adjacentChapter, getScriptureBook, type ScriptureBook } from "../../../../lib/scripture";
import {
  localChapterIndex,
  translationIdForBibleComId,
} from "../../../../lib/scripture/localDatasets";
import {
  DEFAULT_BIBLE_TRANSLATION,
  SUPPORTED_BIBLE_TRANSLATIONS,
  type BibleTranslationId,
} from "../../../../lib/scripture/translationConfig";
import {
  fetchEnabledYouVersionBibles,
  fetchYouVersionChapter,
  youVersionServerKey,
} from "../../../../lib/youversionPlatform";

function chapterEnvelope(book: ScriptureBook, chapter: number) {
  return {
    book: book.usfm,
    bookName: book.name,
    chapter,
    chapterCount: book.chapters,
    previous: adjacentChapter({ book: book.usfm, chapter }, -1),
    next: adjacentChapter({ book: book.usfm, chapter }, 1),
  };
}

async function serveYouVersionChapter(
  book: ScriptureBook,
  chapter: number,
  versionId: number,
) {
  if (!youVersionServerKey()) {
    return NextResponse.json(
      { error: "YouVersion is not configured." },
      { status: 503 },
    );
  }

  // The enabled-versions list is the licensing gate: a version the platform
  // did not return for this application is never proxied.
  const enabled = (await fetchEnabledYouVersionBibles()).find(
    (version) => version.id === versionId,
  );
  if (!enabled) {
    return NextResponse.json(
      { error: "That translation is not licensed for in-app reading." },
      { status: 403 },
    );
  }
  if (enabled.books.length > 0 && !enabled.books.includes(book.usfm)) {
    return NextResponse.json(
      { error: `${enabled.abbreviation} does not include ${book.name}.` },
      { status: 404 },
    );
  }

  const verses = await fetchYouVersionChapter(versionId, book.usfm, chapter);

  return NextResponse.json(
    {
      ...chapterEnvelope(book, chapter),
      verses,
      attribution: enabled.copyright
        ? `${enabled.title} (${enabled.abbreviation}). ${enabled.copyright}`
        : `${enabled.title} (${enabled.abbreviation}), via YouVersion.`,
      translation: {
        id: enabled.id,
        abbreviation: enabled.abbreviation,
        label: enabled.abbreviation,
      },
    },
    {
      headers: {
        // Within the platform's own published policy — the API itself
        // responds with "cache-control: public, max-age=86400".
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    },
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const bookParam = url.searchParams.get("book") ?? "";
  const chapterParam = url.searchParams.get("chapter") ?? "";
  const versionParam = url.searchParams.get("version");

  const book = getScriptureBook(bookParam);
  const chapter = Number(chapterParam);

  if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) {
    return NextResponse.json(
      { error: "Unknown book or chapter." },
      { status: 400 },
    );
  }

  // Which local translation was asked for? No version means the site-wide
  // default. A version that maps to a local dataset is served from it — that
  // is how KJV renders real KJV instead of the default text under KJV's name.
  let localId: BibleTranslationId | null = DEFAULT_BIBLE_TRANSLATION;

  if (versionParam !== null) {
    const versionId = Number(versionParam);
    if (!Number.isInteger(versionId) || versionId < 1) {
      return NextResponse.json({ error: "Unknown translation." }, { status: 400 });
    }

    localId = translationIdForBibleComId(versionId);

    if (!localId) {
      try {
        return await serveYouVersionChapter(book, chapter, versionId);
      } catch {
        // Timeouts and upstream failures land here. The caller is told the
        // request failed; it must never quietly render a different
        // translation under this one's name.
        return NextResponse.json(
          { error: "That translation could not be loaded right now." },
          { status: 502 },
        );
      }
    }
  }

  const definition = SUPPORTED_BIBLE_TRANSLATIONS[localId];
  const verses = localChapterIndex(localId).get(book.usfm)?.get(chapter);

  if (!verses || verses.length === 0) {
    return NextResponse.json(
      { error: "Chapter text unavailable." },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      ...chapterEnvelope(book, chapter),
      verses: [...verses].sort((a, b) => a.verse - b.verse),
      attribution: definition.attribution,
      // Always the translation actually rendered above, never the requested
      // one — the response cannot claim a translation it did not serve.
      translation: {
        id: definition.bibleComId,
        abbreviation: definition.bibleComAbbreviation,
        label: definition.shortName,
      },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=31536000",
      },
    },
  );
}
