// Gene Getz / Bible Principles / Life Essentials resource layer.
//
// CrossHeartPray is Bible-first. These are EXTERNAL study helps, not a
// replacement for Scripture: "Open the Bible first. When a verse connects to a
// Life Essentials principle, continue with Dr. Gene Getz."
//
// This is a small hand-seeded, source-backed dataset designed to grow. Only
// attach an `officialVideoUrl` when the direct official video URL has been
// verified live (200) from the official Principle Finder / publisher. When a
// video URL is not verified, leave it undefined and the UI links to the
// official Principle Finder instead ("Open official Principle Finder").
//
// Official sources:
//   Bible Principles ............ https://bibleprinciples.org
//   Principle Finder by Book .... https://bibleprinciples.org/pf-search-book/
//   Life Essentials App ......... https://bibleprinciples.org/life-essentials-app/
//   Life Essentials Study Bible . https://bibleprinciples.org/the-life-essentials-study-bible/
//   Official YouTube ............ https://www.youtube.com/user/LifeEssentialsVideos
//   Verified video URL pattern .. https://ssl.bhpublishinggroup.com/QR/GetzBible/<id>/

export const BIBLE_PRINCIPLES_HOME = "https://bibleprinciples.org";
export const PRINCIPLE_FINDER_BY_BOOK = "https://bibleprinciples.org/pf-search-book/";
export const LIFE_ESSENTIALS_APP = "https://bibleprinciples.org/life-essentials-app/";
export const LIFE_ESSENTIALS_STUDY_BIBLE =
  "https://bibleprinciples.org/the-life-essentials-study-bible/";
export const LIFE_ESSENTIALS_YOUTUBE =
  "https://www.youtube.com/user/LifeEssentialsVideos";

export type LifeEssentialsPrinciple = {
  book: string; // canonical book name, e.g. "Genesis"
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
  principleNumber: number;
  principleTitle: string;
  shortPrincipleSummary: string;
  officialVideoUrl?: string; // set ONLY when verified live from the official source
  officialSourceUrl: string; // always present (Principle Finder fallback)
  sourceLabel: string;
  referenceNote?: string;
  verified: boolean; // true only when officialVideoUrl is verified
};

// Seeded principles. Ranges taken from the official Bible Principles public
// pages. Genesis #1's direct video URL was verified live (200); the remaining
// records intentionally omit a video URL and point to the official Principle
// Finder until each numeric video id is verified from the source.
export const LIFE_ESSENTIALS_PRINCIPLES: LifeEssentialsPrinciple[] = [
  {
    book: "Genesis",
    startChapter: 1,
    startVerse: 1,
    endChapter: 1,
    endVerse: 25,
    principleNumber: 1,
    principleTitle: "Chosen in Christ",
    shortPrincipleSummary:
      "God who created all things chose us in Christ before the foundation of the world.",
    officialVideoUrl: "https://ssl.bhpublishinggroup.com/QR/GetzBible/0001/",
    officialSourceUrl: PRINCIPLE_FINDER_BY_BOOK,
    sourceLabel: "Dr. Gene Getz · Life Essentials",
    verified: true,
  },
  {
    book: "John",
    startChapter: 1,
    startVerse: 6,
    endChapter: 1,
    endVerse: 18,
    principleNumber: 2,
    principleTitle: "The Deity of Christ",
    shortPrincipleSummary:
      "The Word who was with God and was God became flesh and dwelt among us.",
    officialSourceUrl: PRINCIPLE_FINDER_BY_BOOK,
    sourceLabel: "Dr. Gene Getz · Life Essentials",
    verified: false,
  },
  {
    book: "John",
    startChapter: 1,
    startVerse: 29,
    endChapter: 1,
    endVerse: 51,
    principleNumber: 3,
    principleTitle: "Seeking the Truth",
    shortPrincipleSummary:
      "The first disciples come and see, and follow Jesus as the Lamb of God.",
    officialSourceUrl: PRINCIPLE_FINDER_BY_BOOK,
    sourceLabel: "Dr. Gene Getz · Life Essentials",
    verified: false,
  },
  {
    book: "John",
    startChapter: 3,
    startVerse: 1,
    endChapter: 3,
    endVerse: 21,
    principleNumber: 6,
    principleTitle: "A New Life in Christ",
    shortPrincipleSummary:
      "Jesus tells Nicodemus we must be born again to see the kingdom of God.",
    officialSourceUrl: PRINCIPLE_FINDER_BY_BOOK,
    sourceLabel: "Dr. Gene Getz · Life Essentials",
    verified: false,
  },
  {
    book: "Romans",
    startChapter: 8,
    startVerse: 28,
    endChapter: 8,
    endVerse: 39,
    principleNumber: 16,
    principleTitle: "Security in Christ",
    shortPrincipleSummary:
      "Nothing in all creation can separate us from the love of God in Christ Jesus.",
    officialSourceUrl: PRINCIPLE_FINDER_BY_BOOK,
    sourceLabel: "Dr. Gene Getz · Life Essentials",
    verified: false,
  },
  {
    book: "Romans",
    startChapter: 11,
    startVerse: 33,
    endChapter: 12,
    endVerse: 2,
    principleNumber: 21,
    principleTitle: "Christ-Centered Worship",
    shortPrincipleSummary:
      "In view of God's mercy, offer yourselves as a living sacrifice — true worship.",
    officialSourceUrl: PRINCIPLE_FINDER_BY_BOOK,
    sourceLabel: "Dr. Gene Getz · Life Essentials",
    verified: false,
  },
  {
    book: "Romans",
    startChapter: 13,
    startVerse: 8,
    endChapter: 13,
    endVerse: 10,
    principleNumber: 26,
    principleTitle: "Loving One Another",
    shortPrincipleSummary:
      "Love does no harm to a neighbor; therefore love is the fulfillment of the law.",
    officialSourceUrl: PRINCIPLE_FINDER_BY_BOOK,
    sourceLabel: "Dr. Gene Getz · Life Essentials",
    verified: false,
  },
  {
    book: "Revelation",
    startChapter: 2,
    startVerse: 1,
    endChapter: 2,
    endVerse: 7,
    principleNumber: 3,
    principleTitle: "The Greatest Commands",
    shortPrincipleSummary:
      "To the church in Ephesus: return to the love you had at first.",
    officialSourceUrl: PRINCIPLE_FINDER_BY_BOOK,
    sourceLabel: "Dr. Gene Getz · Life Essentials",
    verified: false,
  },
  {
    book: "Revelation",
    startChapter: 3,
    startVerse: 1,
    endChapter: 3,
    endVerse: 6,
    principleNumber: 7,
    principleTitle: "The True Gospel",
    shortPrincipleSummary:
      "To the church in Sardis: wake up and strengthen what remains.",
    officialSourceUrl: PRINCIPLE_FINDER_BY_BOOK,
    sourceLabel: "Dr. Gene Getz · Life Essentials",
    verified: false,
  },
];

// Book-name normalization. Accepts full names, common abbreviations, and the
// bible.com/USFM codes used by our verse data (GEN, JHN, ROM, REV, ...).
const BOOK_ALIASES: Record<string, string> = {
  // Genesis
  genesis: "Genesis",
  gen: "Genesis",
  ge: "Genesis",
  gn: "Genesis",
  // John (the Gospel — not 1/2/3 John)
  john: "John",
  jn: "John",
  joh: "John",
  jhn: "John",
  // Romans
  romans: "Romans",
  rom: "Romans",
  ro: "Romans",
  rm: "Romans",
  // Revelation
  revelation: "Revelation",
  revelations: "Revelation",
  rev: "Revelation",
  re: "Revelation",
  rv: "Revelation",
};

export function normalizeBook(input: string): string {
  if (!input) return "";
  const key = input.trim().toLowerCase().replace(/\.$/, "").replace(/\s+/g, " ");
  if (BOOK_ALIASES[key]) return BOOK_ALIASES[key];
  // Fall back to a Title Cased version of whatever was passed so exact
  // canonical names still match (e.g. "Genesis").
  return key.replace(/\b\w/g, (c) => c.toUpperCase());
}

function toInt(value: string | number): number {
  if (typeof value === "number") return value;
  const match = String(value).match(/\d+/);
  return match ? parseInt(match[0], 10) : NaN;
}

function rangeContains(
  principle: LifeEssentialsPrinciple,
  chapter: number,
  verse: number,
): boolean {
  if (Number.isNaN(chapter) || Number.isNaN(verse)) return false;
  const afterStart =
    chapter > principle.startChapter ||
    (chapter === principle.startChapter && verse >= principle.startVerse);
  const beforeEnd =
    chapter < principle.endChapter ||
    (chapter === principle.endChapter && verse <= principle.endVerse);
  return afterStart && beforeEnd;
}

// Returns every seeded Life Essentials principle whose passage range contains
// the given verse. `book` may be a full name, abbreviation, or USFM code.
export function getGeneGetzPrinciplesForVerse(
  book: string,
  chapter: string | number,
  verse: string | number,
): LifeEssentialsPrinciple[] {
  const normalized = normalizeBook(book);
  if (!normalized) return [];
  const c = toInt(chapter);
  const v = toInt(verse);
  return LIFE_ESSENTIALS_PRINCIPLES.filter(
    (p) => normalizeBook(p.book) === normalized && rangeContains(p, c, v),
  );
}

// Human-readable passage range, e.g. "1:1-25" or "11:33-12:2".
export function formatPrincipleRange(p: LifeEssentialsPrinciple): string {
  if (p.startChapter === p.endChapter) {
    return p.startVerse === p.endVerse
      ? `${p.startChapter}:${p.startVerse}`
      : `${p.startChapter}:${p.startVerse}-${p.endVerse}`;
  }
  return `${p.startChapter}:${p.startVerse}-${p.endChapter}:${p.endVerse}`;
}

// Books that currently have seeded principles (for the resource page chips).
export function seededPrincipleBooks(): string[] {
  return Array.from(new Set(LIFE_ESSENTIALS_PRINCIPLES.map((p) => p.book)));
}
