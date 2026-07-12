// Daily Bible Bingo — the single source of truth for "today's board".
//
// Everything that shows or publishes a daily board (the /today page, the
// dated archive pages, the Instagram image, the caption, the publisher)
// MUST build its data through buildDailyBibleBingoPost() so the website,
// the image, and the Instagram caption can never disagree.
//
// TIMEZONE DECISION: the whole site already runs its "daily" logic on
// America/Chicago (see CentralTimeBadge and the Bible Bingo daily seed).
// Daily Bible Bingo keeps that standard: a "day" begins at midnight
// Central Time, and the date key (YYYY-MM-DD in America/Chicago) is the
// deterministic seed for the board.

import {
  bibleBingoBoardIdFromPassages,
  seededReferenceForSection,
  type BibleBingoPassage,
} from "./bibleRandom";

export const DAILY_BIBLE_BINGO_TIMEZONE = "America/Chicago";

// First public daily Instagram post. Dated pages before this 404.
export const DAILY_BIBLE_BINGO_START_DATE = "2026-07-12";

// Bump ONLY to intentionally change the rendered image/caption for the same
// data (layout/copy changes). It never changes which verses are selected.
export const DAILY_BIBLE_BINGO_VERSION = 1;

export const DAILY_BIBLE_BINGO_SITE_URL = "https://crossheartpray.com";

// Editable hashtag set — small and intentional, no stuffing.
// Override per-deploy with SOCIAL_HASHTAGS="#One,#Two" if ever needed.
export const DAILY_BIBLE_BINGO_HASHTAGS = [
  "#CrossHeartPray",
  "#BibleBingo",
  "#BibleReading",
  "#Scripture",
  "#DailyBible",
];

export type BibleBingoSection = {
  title: string;
  emoji: string;
  line: string;
  odds: string;
  gridClass?: string;
};

// Canonical lane definitions (Sunday-first). The section titles are the
// seed input for verse selection — never edit the title strings.
export const BIBLE_BINGO_SECTIONS: BibleBingoSection[] = [
  {
    title: "Sunday — Epistles",
    emoji: "✉️",
    line: "Letters to the Church: faith, grace, love, endurance, and life in Christ.",
    odds: "Sunday • Epistles",
  },
  {
    title: "Monday — Law",
    emoji: "📜",
    line: "The beginning, covenant, commandments, rescue, worship, and God’s holy way.",
    odds: "Monday • Law",
  },
  {
    title: "Tuesday — History",
    emoji: "🏛️",
    line: "God’s people in real stories of courage, failure, mercy, kings, and return.",
    odds: "Tuesday • History",
  },
  {
    title: "Wednesday — Psalms",
    emoji: "🎶",
    line: "Prayer, praise, lament, worship, hope, and honest words with God.",
    odds: "Wednesday • Psalms",
  },
  {
    title: "Thursday — Poetry",
    emoji: "💡",
    line: "Wisdom, suffering, words, choices, work, wonder, and the heart.",
    odds: "Thursday • Poetry",
  },
  {
    title: "Friday — Prophecy",
    emoji: "🔥",
    line: "Warnings, promises, restoration, justice, hope, and God making all things new.",
    odds: "Friday • Prophecy",
  },
  {
    title: "Saturday — Gospels",
    emoji: "✝️",
    line: "Walk with Jesus through His words, works, cross, and resurrection.",
    odds: "Saturday • Gospels",
  },
];

/* ---------------------------------------------------------------- dates */

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidDateKey(value: string): boolean {
  const match = DATE_KEY_PATTERN.exec(value);
  if (!match) return false;

  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);

  if (month < 1 || month > 12) return false;

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day >= 1 && day <= daysInMonth;
}

// The calendar date "right now" in America/Chicago, as YYYY-MM-DD.
// This is the same computation the Bible Bingo page has always used
// for its daily seed.
export function chicagoDateKey(at: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DAILY_BIBLE_BINGO_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);

  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

// The hour (0-23) "right now" in America/Chicago.
export function chicagoHour(at: Date = new Date()): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: DAILY_BIBLE_BINGO_TIMEZONE,
    hour: "2-digit",
    hour12: false,
  }).format(at);

  return Number(hour) % 24;
}

// Weekday index (0 = Sunday) of a civil date. A calendar date's weekday
// does not depend on timezone, so UTC math is safe here.
export function weekdayIndexForDateKey(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// Today's weekday index (0 = Sunday) in America/Chicago.
export function chicagoTodayWeekdayIndex(at: Date = new Date()): number {
  return weekdayIndexForDateKey(chicagoDateKey(at));
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));

  const pad = (value: number) => String(value).padStart(2, "0");
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(
    shifted.getUTCDate(),
  )}`;
}

// "Sunday, July 12, 2026"
export function formatFullDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/* ---------------------------------------------------------------- board */

export function splitSectionTitle(title: string) {
  const parts = title.split("—").map((part) => part.trim()).filter(Boolean);

  if (parts.length >= 2) {
    return { dayLabel: parts[0], title: parts.slice(1).join(" — ") };
  }

  return { dayLabel: "", title };
}

// Strips the "· 3 of 2,461" lane-position suffix off a passage label,
// leaving just the reference ("Romans 15:7").
export function referenceOnlyLabel(label: string) {
  return label.replace(/\s+[·•-]\s+\d[\d,]*\s+of\s+\d[\d,]*\s*$/i, "").trim();
}

export function bibleVerseUrl(passage: Pick<BibleBingoPassage, "code" | "chapter" | "verse">) {
  return `https://www.bible.com/bible/206/${passage.code}.${passage.chapter}.${passage.verse}.WEBUS`;
}

export function bibleChapterUrl(passage: Pick<BibleBingoPassage, "code" | "chapter">) {
  return `https://www.bible.com/bible/206/${passage.code}.${passage.chapter}.WEBUS`;
}

export type DailyBibleBingoLane = {
  index: number;
  section: BibleBingoSection;
  dayLabel: string;
  laneTitle: string;
  passage: BibleBingoPassage;
  reference: string;
  verseUrl: string;
  chapterUrl: string;
  isFeatured: boolean;
};

export type DailyBibleBingoPost = {
  date: string;
  fullDate: string;
  timezone: string;
  version: number;
  boardId: string;
  boardPath: string;
  pagePath: string;
  imagePath: string;
  imageFileName: string;
  title: string;
  featuredLaneIndex: number;
  lanes: DailyBibleBingoLane[];
  references: string[];
  caption: string;
  hashtags: string[];
};

function activeHashtags(): string[] {
  const fromEnv =
    typeof process !== "undefined" ? process.env.SOCIAL_HASHTAGS : undefined;

  if (fromEnv && fromEnv.trim()) {
    return fromEnv
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return DAILY_BIBLE_BINGO_HASHTAGS;
}

// The first caption line doubles as the duplicate-publication marker the
// publisher searches for on the Instagram account. Keep it unique per date.
export function captionMarkerForDate(dateKey: string) {
  return `Daily Bible Bingo — ${formatFullDate(dateKey)}`;
}

function buildCaption(
  dateKey: string,
  featured: DailyBibleBingoLane,
  references: string[],
  hashtags: string[],
) {
  // Grounded, plain copy only: the lane description lines are DJ's existing
  // site copy, and the references are the actual selected passages. No AI
  // interpretation, no fabricated quotations.
  return [
    captionMarkerForDate(dateKey),
    "",
    `Seven Scripture cards, one for each lane of the week. Today's featured lane: ${featured.dayLabel} — ${featured.laneTitle}. ${featured.section.line}`,
    "",
    "Today's passages:",
    ...references.map((reference) => `• ${reference}`),
    "",
    "Open every passage and today's full card:",
    "CrossHeartPray.com/today",
    "",
    "✝️ ❤️ 🙏",
    "",
    hashtags.join(" "),
  ].join("\n");
}

// Deterministic: the same dateKey always returns the same post (verses,
// board id, caption, image data). Rendering changes require a version bump.
export function buildDailyBibleBingoPost(dateKey: string): DailyBibleBingoPost {
  if (!isValidDateKey(dateKey)) {
    throw new Error(`Invalid Daily Bible Bingo date key: ${dateKey}`);
  }

  const featuredLaneIndex = weekdayIndexForDateKey(dateKey);

  const lanes: DailyBibleBingoLane[] = BIBLE_BINGO_SECTIONS.map(
    (section, index) => {
      const passage = seededReferenceForSection(section.title, dateKey);
      const { dayLabel, title } = splitSectionTitle(section.title);

      return {
        index,
        section,
        dayLabel,
        laneTitle: title,
        passage,
        reference: referenceOnlyLabel(passage.label),
        verseUrl: bibleVerseUrl(passage),
        chapterUrl: bibleChapterUrl(passage),
        isFeatured: index === featuredLaneIndex,
      };
    },
  );

  const boardId = bibleBingoBoardIdFromPassages(lanes.map((lane) => lane.passage));
  const references = lanes.map((lane) => lane.reference);
  const featured = lanes[featuredLaneIndex];
  const hashtags = activeHashtags();

  return {
    date: dateKey,
    fullDate: formatFullDate(dateKey),
    timezone: DAILY_BIBLE_BINGO_TIMEZONE,
    version: DAILY_BIBLE_BINGO_VERSION,
    boardId,
    boardPath: `/bible-bingo/${boardId}`,
    pagePath: `/today/${dateKey}`,
    imagePath: `/api/social/bible-bingo/${dateKey}.png`,
    imageFileName: `daily-bible-bingo-${dateKey}-1080x1350.png`,
    title: `Daily Bible Bingo — ${formatFullDate(dateKey)}`,
    featuredLaneIndex,
    lanes,
    references,
    caption: buildCaption(dateKey, featured, references, hashtags),
    hashtags,
  };
}

// Absolute URL on the public site (for Meta image fetches, og tags, shares).
export function absoluteSiteUrl(path: string) {
  const base =
    (typeof process !== "undefined" && process.env.SITE_BASE_URL) ||
    DAILY_BIBLE_BINGO_SITE_URL;

  return `${base.replace(/\/$/, "")}${path}`;
}
