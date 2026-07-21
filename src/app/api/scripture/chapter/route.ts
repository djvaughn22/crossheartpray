// Whole-chapter Scripture endpoint for the in-app reader.
//
// GET /api/scripture/chapter?book=JHN&chapter=3
//
// Serves the local World English Bible (public domain), so the client never
// downloads the full Bible bundle — one chapter is a few KB. Responses are
// immutable-cacheable: the text is static, so CDN + browser caches absorb
// repeat reads and slow connections only pay for a chapter once.

import { NextResponse } from "next/server";
import { LOCAL_BIBLE_VERSES } from "../../../../lib/localBibleVerses";
import { adjacentChapter, getScriptureBook } from "../../../../lib/scripture";

type ChapterVerse = { verse: number; text: string };

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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const bookParam = url.searchParams.get("book") ?? "";
  const chapterParam = url.searchParams.get("chapter") ?? "";

  const book = getScriptureBook(bookParam);
  const chapter = Number(chapterParam);

  if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) {
    return NextResponse.json(
      { error: "Unknown book or chapter." },
      { status: 400 },
    );
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
      book: book.usfm,
      bookName: book.name,
      chapter,
      chapterCount: book.chapters,
      verses: [...verses].sort((a, b) => a.verse - b.verse),
      previous: adjacentChapter({ book: book.usfm, chapter }, -1),
      next: adjacentChapter({ book: book.usfm, chapter }, 1),
      attribution: "World English Bible (WEB), public domain.",
    },
    {
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=31536000",
      },
    },
  );
}
