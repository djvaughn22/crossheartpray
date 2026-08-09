// Normalize a public-domain King James Version export into the repo's
// LocalBibleVerse schema (src/lib/bibleText/kjvBibleVerses.ts).
//
// Source: the scrollmapper/bible_databases KJV JSON export, a widely-mirrored
// public-domain King James text. The KJV is public domain in the United
// States. Text is copied verbatim; this script only reshapes it. Never
// hand-edit the generated file — regenerate instead.
//
// Usage: node scripts/normalize-kjv.mjs path/to/KJV.json
//
// The book/code/group/label vocabulary mirrors the existing WEB and BSB
// datasets so all three are interchangeable behind the chapter API.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = process.argv[2];
if (!sourcePath) {
  console.error("Usage: node scripts/normalize-kjv.mjs path/to/KJV.json");
  process.exit(1);
}

// Same book names, USFM codes, and lane groups the WEB dataset uses.
const webusModule = readFileSync(
  path.join(here, "../src/lib/bibleText/webusBibleVerses.ts"),
  "utf8",
);
const webusVerses = JSON.parse(
  webusModule.slice(webusModule.indexOf("= [") + 2, webusModule.lastIndexOf("];") + 1),
);
const bookInfo = new Map();
for (const verse of webusVerses) {
  if (!bookInfo.has(verse.book)) {
    bookInfo.set(verse.book, { code: verse.code, group: verse.group });
  }
}

// Source spellings that differ from this repo's canonical display names.
// This export numbers books with Roman numerals ("I Samuel").
const bookNameAliases = new Map([
  ["Psalm", "Psalms"],
  ["Revelation of John", "Revelation"],
  ["The Revelation", "Revelation"],
  ["I Samuel", "1 Samuel"],
  ["II Samuel", "2 Samuel"],
  ["I Kings", "1 Kings"],
  ["II Kings", "2 Kings"],
  ["I Chronicles", "1 Chronicles"],
  ["II Chronicles", "2 Chronicles"],
  ["I Corinthians", "1 Corinthians"],
  ["II Corinthians", "2 Corinthians"],
  ["I Thessalonians", "1 Thessalonians"],
  ["II Thessalonians", "2 Thessalonians"],
  ["I Timothy", "1 Timothy"],
  ["II Timothy", "2 Timothy"],
  ["I Peter", "1 Peter"],
  ["II Peter", "2 Peter"],
  ["I John", "1 John"],
  ["II John", "2 John"],
  ["III John", "3 John"],
]);

const raw = JSON.parse(readFileSync(sourcePath, "utf8"));

// The export nests rows under a top-level array or a { books: [...] } /
// { verses: [...] } envelope depending on mirror; accept the common shapes.
const rows = Array.isArray(raw)
  ? raw
  : Array.isArray(raw.verses)
    ? raw.verses
    : Array.isArray(raw.resultset?.row)
      ? raw.resultset.row
      : null;

if (!rows) {
  console.error("Unrecognized KJV export shape. Top-level keys:", Object.keys(raw));
  process.exit(1);
}

const verses = [];
for (const row of rows) {
  const bookNameRaw = row.book_name ?? row.book ?? row.b;
  const chapter = row.chapter ?? row.c;
  const verseNumber = row.verse ?? row.v;
  const text = (row.text ?? row.t ?? "").trim();

  if (!bookNameRaw || !chapter || !verseNumber || !text) continue;

  const book = bookNameAliases.get(bookNameRaw) ?? bookNameRaw;
  const info = bookInfo.get(book);
  if (!info) {
    console.error(`Unknown book name in source: "${bookNameRaw}"`);
    process.exit(1);
  }

  verses.push({
    book,
    code: info.code,
    chapter: String(chapter),
    verse: String(verseNumber),
    label: `${book} ${chapter}:${verseNumber}`,
    text,
    group: info.group,
  });
}

// Parity checks against the WEB dataset: same 66 books, same chapter set.
// Verse-level differences are expected and reported, not fatal — translations
// legitimately differ on a handful of versification points.
const webChapters = new Set(webusVerses.map((v) => `${v.code}.${v.chapter}`));
const kjvChapters = new Set(verses.map((v) => `${v.code}.${v.chapter}`));
const missingChapters = [...webChapters].filter((key) => !kjvChapters.has(key));
const extraChapters = [...kjvChapters].filter((key) => !webChapters.has(key));
if (missingChapters.length || extraChapters.length) {
  console.error("Chapter mismatch.", {
    missingChapters: missingChapters.slice(0, 20),
    extraChapters: extraChapters.slice(0, 20),
  });
  process.exit(1);
}

const webRefs = new Set(webusVerses.map((v) => `${v.code}.${v.chapter}.${v.verse}`));
const kjvRefs = new Set(verses.map((v) => `${v.code}.${v.chapter}.${v.verse}`));
console.log(`KJV verses: ${verses.length} (WEB has ${webusVerses.length})`);
console.log("In WEB but not KJV:", [...webRefs].filter((k) => !kjvRefs.has(k)).length);
console.log("In KJV but not WEB:", [...kjvRefs].filter((k) => !webRefs.has(k)).length);

// Spot-check a verse whose KJV wording is famously distinct from modern texts.
const john316 = verses.find((v) => v.code === "JHN" && v.chapter === "3" && v.verse === "16");
console.log("JHN 3:16 →", john316?.text);
if (!john316 || !/only begotten/i.test(john316.text)) {
  console.error("Sanity check failed: JHN 3:16 does not read like the KJV.");
  process.exit(1);
}

const body = verses
  .map((verse) => "  " + JSON.stringify(verse, null, 4).replace(/\n\}$/, "\n  }").replace(/\n {4}/g, "\n    "))
  .join(",\n");
const output = `// King James Version — generated by scripts/normalize-kjv.mjs from the
// public-domain scrollmapper/bible_databases KJV export.
// Do not hand-edit; regenerate instead. Scripture text is verbatim.

import type { LocalBibleVerse } from "./types";

export const KJV_BIBLE_VERSES: LocalBibleVerse[] = [
${body}
];
`;
writeFileSync(path.join(here, "../src/lib/bibleText/kjvBibleVerses.ts"), output);
console.log("Wrote src/lib/bibleText/kjvBibleVerses.ts");
