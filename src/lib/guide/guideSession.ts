// Deterministic guide session builder — the complete /guide product.
//
// Every building block is a verified local resource:
//   - Verse text comes from LOCAL_BIBLE_VERSES (World English Bible, the same
//     data every other CrossHeartPray surface uses). A reference that fails
//     lookup is dropped, never fabricated.
//   - Chapter context links go through the shared scripture reference system.
//   - Reading-plan links resolve through the real 52-week plan.
//   - Daily Hope and Bible Bingo links point at the existing routes.
//   - Reflection prompts are owner-reviewed neutral questions that never
//     assert an interpretation.
// No AI is involved anywhere in this file.

import { LOCAL_BIBLE_VERSES, type LocalBibleVerse } from "../localBibleVerses";
import {
  bibleReadingPlanHrefForReference,
  bibleReadingPlanLabelForReference,
} from "../bibleReadingPlan";
import { bibleComUrlForPassage } from "../scripture";
import { getDailyHopeDays } from "../dailyHopeRoutine";

export type GuideTime = 5 | 10 | 20 | 30;
export const GUIDE_TIMES: GuideTime[] = [5, 10, 20, 30];

export type GuideNeed =
  | "prayer"
  | "encouragement"
  | "worry"
  | "gratitude"
  | "hope"
  | "scripture"
  | "begin"
  | "surprise";

export const GUIDE_NEEDS: { need: GuideNeed; label: string }[] = [
  { need: "prayer", label: "I want to pray" },
  { need: "encouragement", label: "I need encouragement" },
  { need: "worry", label: "I feel worried" },
  { need: "gratitude", label: "I am thankful" },
  { need: "hope", label: "I need hope" },
  { need: "scripture", label: "I want to read Scripture" },
  { need: "begin", label: "Help me start today" },
  { need: "surprise", label: "Surprise me" },
];

type CuratedEntry = {
  title: string;
  refs: string[];
};

// Owner-reviewed Scripture references per starting need. Each individual
// verse must exist in the local verified Bible data or it is dropped.
const CURATED_SCRIPTURE: Record<Exclude<GuideNeed, "surprise">, CuratedEntry[]> = {
  prayer: [
    { title: "Philippians 4:6-7", refs: ["Philippians 4:6", "Philippians 4:7"] },
    {
      title: "Matthew 6:9-13",
      refs: [
        "Matthew 6:9",
        "Matthew 6:10",
        "Matthew 6:11",
        "Matthew 6:12",
        "Matthew 6:13",
      ],
    },
    { title: "Psalm 145:18", refs: ["Psalm 145:18"] },
  ],
  encouragement: [
    { title: "Joshua 1:9", refs: ["Joshua 1:9"] },
    { title: "Isaiah 41:10", refs: ["Isaiah 41:10"] },
    { title: "Deuteronomy 31:6", refs: ["Deuteronomy 31:6"] },
  ],
  worry: [
    {
      title: "Matthew 6:25-27",
      refs: ["Matthew 6:25", "Matthew 6:26", "Matthew 6:27"],
    },
    { title: "1 Peter 5:7", refs: ["1 Peter 5:7"] },
    { title: "Philippians 4:6-7", refs: ["Philippians 4:6", "Philippians 4:7"] },
  ],
  gratitude: [
    {
      title: "1 Thessalonians 5:16-18",
      refs: [
        "1 Thessalonians 5:16",
        "1 Thessalonians 5:17",
        "1 Thessalonians 5:18",
      ],
    },
    {
      title: "Psalm 100:1-5",
      refs: ["Psalm 100:1", "Psalm 100:2", "Psalm 100:3", "Psalm 100:4", "Psalm 100:5"],
    },
    { title: "Colossians 3:15", refs: ["Colossians 3:15"] },
  ],
  hope: [
    { title: "Romans 15:13", refs: ["Romans 15:13"] },
    {
      title: "Romans 5:3-5",
      refs: ["Romans 5:3", "Romans 5:4", "Romans 5:5"],
    },
    { title: "Psalm 39:7", refs: ["Psalm 39:7"] },
  ],
  scripture: [
    {
      title: "John 1:1-5",
      refs: ["John 1:1", "John 1:2", "John 1:3", "John 1:4", "John 1:5"],
    },
    {
      title: "Psalm 1:1-3",
      refs: ["Psalm 1:1", "Psalm 1:2", "Psalm 1:3"],
    },
    {
      title: "2 Timothy 3:16-17",
      refs: ["2 Timothy 3:16", "2 Timothy 3:17"],
    },
  ],
  begin: [
    { title: "John 3:16-17", refs: ["John 3:16", "John 3:17"] },
    {
      title: "Psalm 23:1-4",
      refs: ["Psalm 23:1", "Psalm 23:2", "Psalm 23:3", "Psalm 23:4"],
    },
    { title: "Genesis 1:1-3", refs: ["Genesis 1:1", "Genesis 1:2", "Genesis 1:3"] },
  ],
};

// Owner-reviewed neutral reflection prompts. None of these prescribes a
// theological conclusion or tells the reader what God is saying to them.
const REFLECTION_PROMPTS: Record<Exclude<GuideNeed, "surprise">, string> = {
  prayer: "What would you like to bring to God in prayer?",
  encouragement: "What words stand out as you read?",
  worry: "What would you like to set down as you read this passage?",
  gratitude: "What are you thankful for today?",
  hope: "What words stand out as you read?",
  scripture: "Read the surrounding chapter before reflecting.",
  begin: "What words stand out as you read?",
};

export type GuidePassageBlock = {
  title: string;
  passages: LocalBibleVerse[];
  chapterLabel: string;
  bibleComChapterHref: string;
  readingPlan: { label: string; href: string } | null;
};

export type GuideSession = {
  time: GuideTime;
  need: Exclude<GuideNeed, "surprise">;
  scripture: GuidePassageBlock;
  reflection: string;
  dailyHope: { day: string; label: string; href: string } | null;
  bibleBingo: { label: string; href: string } | null;
};

const versesByLabel = new Map(LOCAL_BIBLE_VERSES.map((verse) => [verse.label, verse]));

function lookupVerse(reference: string): LocalBibleVerse | null {
  const direct = versesByLabel.get(reference);
  if (direct) return direct;
  // The local data labels the book "Psalms"; curated refs may say "Psalm".
  return versesByLabel.get(reference.replace(/^Psalm /, "Psalms ")) ?? null;
}

// Same FNV-1a style hash the Bible Bingo seed system uses.
function hashSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function resolveEntry(entry: CuratedEntry): GuidePassageBlock | null {
  const passages = entry.refs
    .map((reference) => lookupVerse(reference))
    .filter((verse): verse is LocalBibleVerse => Boolean(verse));

  // Never present a heading with fabricated or missing text under it.
  if (passages.length === 0) return null;

  const first = passages[0];
  const chapterLabel = `${first.book} ${first.chapter}`;
  const planHref = bibleReadingPlanHrefForReference(first.code, first.chapter);
  const planLabel = bibleReadingPlanLabelForReference(first.code, first.chapter);

  return {
    title: entry.title,
    passages,
    chapterLabel,
    bibleComChapterHref: bibleComUrlForPassage({
      code: first.code,
      chapter: first.chapter,
    }),
    readingPlan:
      planHref && planLabel ? { label: planLabel, href: planHref } : null,
  };
}

const RESOLVABLE_NEEDS = Object.keys(CURATED_SCRIPTURE) as Array<
  Exclude<GuideNeed, "surprise">
>;

export function resolveGuideNeed(
  need: GuideNeed,
  seed: string,
): Exclude<GuideNeed, "surprise"> {
  if (need !== "surprise") return need;
  return RESOLVABLE_NEEDS[hashSeed(`surprise|${seed}`) % RESOLVABLE_NEEDS.length];
}

// Build the complete deterministic session. `seed` defaults to today's date so
// the same choices give the same session all day; tests pass a fixed seed.
export function buildGuideSession(args: {
  time: GuideTime;
  need: GuideNeed;
  seed?: string;
  now?: Date;
}): GuideSession {
  const now = args.now ?? new Date();
  const seed = args.seed ?? now.toISOString().slice(0, 10);
  const need = resolveGuideNeed(args.need, seed);

  const entries = CURATED_SCRIPTURE[need]
    .map((entry) => resolveEntry(entry))
    .filter((block): block is GuidePassageBlock => Boolean(block));

  // Every curated list is verified by tests, but stay safe at runtime too.
  const scripture =
    entries[hashSeed(`${seed}|${need}`) % Math.max(entries.length, 1)] ??
    resolveEntry({ title: "John 3:16", refs: ["John 3:16"] });

  if (!scripture) {
    // The local Bible data itself is broken — this cannot build a session.
    throw new Error("Guide could not resolve any verified Scripture passage");
  }

  const dailyHopeDays = getDailyHopeDays();
  const todaysHope = dailyHopeDays[now.getDay() % dailyHopeDays.length] ?? null;

  return {
    time: args.time,
    need,
    scripture,
    reflection: REFLECTION_PROMPTS[need],
    dailyHope:
      args.time >= 20 && todaysHope
        ? {
            day: todaysHope.day,
            label: todaysHope.items[0]?.label ?? "Daily Hope",
            href: "/daily-hope",
          }
        : null,
    bibleBingo:
      args.time >= 30
        ? { label: "Deal 7 Bible cards", href: "/explorebible" }
        : null,
  };
}

// Shareable link builder — only whitelisted enum values can appear in the
// URL, so no private text, prayer, or AI output can ever be shared.
export function buildGuideShareHref(args: { time: GuideTime; need: GuideNeed }): string {
  const time = GUIDE_TIMES.includes(args.time) ? args.time : 10;
  const need = GUIDE_NEEDS.some((item) => item.need === args.need)
    ? args.need
    : "begin";
  return `/guide?time=${time}&need=${need}`;
}

export function parseGuideParams(params: {
  time?: string | string[];
  need?: string | string[];
}): { time: GuideTime; need: GuideNeed } | null {
  const rawTime = Array.isArray(params.time) ? params.time[0] : params.time;
  const rawNeed = Array.isArray(params.need) ? params.need[0] : params.need;
  if (!rawTime || !rawNeed) return null;

  const time = Number(rawTime);
  if (!GUIDE_TIMES.includes(time as GuideTime)) return null;
  if (!GUIDE_NEEDS.some((item) => item.need === rawNeed)) return null;

  return { time: time as GuideTime, need: rawNeed as GuideNeed };
}
