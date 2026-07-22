// Whole-chapter Scripture endpoint for the in-app reader.
//
// GET /api/scripture/chapter?book=JHN&chapter=3            → local WEB text
// GET /api/scripture/chapter?book=JHN&chapter=3&version=3034
//                                                          → YouVersion text
//
// Local WEB (public domain) is the always-available foundation: one chapter
// is a few KB and immutable-cacheable. The optional `version` parameter
// proxies a YouVersion Platform translation instead — but ONLY a version the
// application is genuinely licensed for (the enabled-versions list is the
// gate); the App Key never leaves the server. YouVersion failures return an
// error status and the client reader falls back to local WEB, so there is
// never a dead end.

import { NextResponse } from "next/server";
import { LOCAL_BIBLE_VERSES } from "../../../../lib/localBibleVerses";
import { adjacentChapter, getScriptureBook, type ScriptureBook } from "../../../../lib/scripture";
import {
  fetchEnabledYouVersionBibles,
  fetchYouVersionChapter,
  youVersionServerKey,
} from "../../../../lib/youversionPlatform";

type ChapterVerse = { verse: number; text: string };

// Bible.com's id for the World English Bible — requesting it explicitly is
// the same as requesting no version: the local text serves it faster.
const WEB_BIBLE_ID = 206;

// code → chapter → verses, built once per server instance.
let chapterIndex: Map<string, Map<number, ChapterVerse[]>> | null = null;

function getChapterIndex() {
  if (chapterIndex) return chapterIndex;

  chapterIndex = new Map();
  for (const verse of LOCAL_BIBLE_VERSES) {
    const chapter = Number(verse.chapter);
    const verseNumber = Number(verse.verse);
    if (!Number.isInteger(chapter) || !Number.isInteger(verseNumber)) continue;

    let byChapter = chapterIndex.get(verse.code);
    if (!byChapter) {
      byChapter = new Map();
      chapterIndex.set(verse.code, byChapter);
    }
    let verses = byChapter.get(chapter);
    if (!verses) {
      verses = [];
      byChapter.set(chapter, verses);
    }
    verses.push({ verse: verseNumber, text: verse.text });
  }
  return chapterIndex;
}

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

  if (versionParam !== null) {
    const versionId = Number(versionParam);
    if (!Number.isInteger(versionId) || versionId < 1) {
      return NextResponse.json({ error: "Unknown translation." }, { status: 400 });
    }
    if (versionId !== WEB_BIBLE_ID) {
      try {
        return await serveYouVersionChapter(book, chapter, versionId);
      } catch {
        // Timeouts and upstream failures land here; the reader falls back
        // to local WEB and keeps the external Bible.com option.
        return NextResponse.json(
          { error: "That translation could not be loaded right now." },
          { status: 502 },
        );
      }
    }
  }

  const verses = getChapterIndex().get(book.usfm)?.get(chapter);
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
      attribution: "World English Bible (WEB), public domain.",
    },
    {
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=31536000",
      },
    },
  );
}
