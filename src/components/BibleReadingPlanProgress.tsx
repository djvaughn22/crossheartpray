"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  bibleReadingPlanAssignmentForReading,
  bibleReadingPlanReadingReference,
  type BibleReadingPlanWeek,
} from "../lib/bibleReadingPlan";
import {
  getAdjacentPlayablePrinciple,
  getGeneGetzPrinciplesForChapter,
  type LifeEssentialsPrinciple,
} from "../lib/geneGetzLifeEssentials";
import YouTubeModal from "./YouTubeModal";
import KindleReaderModal from "./scripture/KindleReaderModal";
import { track } from "../lib/analytics";
import {
  checklistStats,
  loadChecklistProgress,
  saveChecklistProgress,
  toggleChecklistItem,
  type ChecklistProgress,
} from "../lib/checklistProgress";
import {
  BIBLE_COM_DEFAULT_VERSION,
  BIBLE_COM_LINK_VERSIONS,
  bibleComUrl,
  bibleComUrlForPassage,
  getScriptureBook,
  loadTranslationPreference,
  parseScriptureReference,
  toUsfmString,
  type ScriptureReference,
} from "../lib/scripture";

type BibleReadingPlanProgressProps = {
  weeks: BibleReadingPlanWeek[];
};

type AnyRecord = Record<string, unknown>;

const STORAGE_KEY = "crossheartpray:bible-reading-plan:v1";
const PROGRESS_EVENT = "crossheartpray:bible-reading-plan-progress";

const LANES = [
  {
    key: "sunday",
    day: "Sunday",
    short: "Sun",
    lane: "Epistles",
    summary: "Romans through Jude.",
  },
  {
    key: "monday",
    day: "Monday",
    short: "Mon",
    lane: "Law",
    summary: "Genesis through Deuteronomy.",
  },
  {
    key: "tuesday",
    day: "Tuesday",
    short: "Tue",
    lane: "History",
    summary: "Joshua through Esther.",
  },
  {
    key: "wednesday",
    day: "Wednesday",
    short: "Wed",
    lane: "Psalms",
    summary: "Psalms.",
  },
  {
    key: "thursday",
    day: "Thursday",
    short: "Thu",
    lane: "Poetry",
    summary: "Job through Song of Solomon.",
  },
  {
    key: "friday",
    day: "Friday",
    short: "Fri",
    lane: "Prophecy",
    summary: "Isaiah through Malachi.",
  },
  {
    key: "saturday",
    day: "Saturday",
    short: "Sat",
    lane: "Gospels",
    summary: "Matthew, Mark, Luke, John.",
  },
];

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as AnyRecord)
    : {};
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function weekNumber(week: unknown, fallback: number) {
  const record = asRecord(week);
  return (
    numberValue(record.week) ??
    numberValue(record.weekNumber) ??
    numberValue(record.number) ??
    fallback
  );
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

function readingsArray(week: unknown): unknown[] {
  const record = asRecord(week);
  for (const candidate of [record.days, record.readings, record.items, record.entries]) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function readingForLane(week: unknown, laneIndex: number) {
  const record = asRecord(week);
  const lane = LANES[laneIndex];

  const direct =
    record[lane.key] ??
    record[lane.day] ??
    record[lane.day.toLowerCase()] ??
    record[lane.day.toUpperCase()] ??
    record[lane.lane] ??
    record[lane.lane.toLowerCase()];

  if (direct) return direct;

  const array = readingsArray(week);
  return (
    array.find((item) => {
      const itemRecord = asRecord(item);
      const haystack = [
        itemRecord.day,
        itemRecord.dayLabel,
        itemRecord.weekday,
        itemRecord.lane,
        itemRecord.category,
        itemRecord.section,
      ]
        .map(cleanText)
        .join(" ");

      return (
        normalizeKey(haystack).includes(lane.key) ||
        normalizeKey(haystack).includes(normalizeKey(lane.lane))
      );
    }) ??
    array[laneIndex] ??
    null
  );
}

function labelForReading(reading: unknown) {
  if (typeof reading === "string") return reading.trim();

  const record = asRecord(reading);
  const label =
    cleanText(record.label) ||
    cleanText(record.reference) ||
    cleanText(record.reading) ||
    cleanText(record.passage) ||
    cleanText(record.chapters) ||
    cleanText(record.title);

  if (label) return label;

  const book = cleanText(record.book) || cleanText(record.bookName);
  const chapters =
    cleanText(record.chapterRange) ||
    cleanText(record.chapters) ||
    cleanText(record.chapter) ||
    cleanText(record.range);

  return [book, chapters].filter(Boolean).join(" ").trim() || "Reading";
}

function laneForReading(reading: unknown, laneIndex: number) {
  const record = asRecord(reading);
  return (
    cleanText(record.lane) ||
    cleanText(record.category) ||
    cleanText(record.section) ||
    LANES[laneIndex].lane
  );
}

function idForReading(reading: unknown, weekNo: number, laneIndex: number) {
  const record = asRecord(reading);
  return (
    cleanText(record.id) ||
    cleanText(record.key) ||
    cleanText(record.storageKey) ||
    `week-${weekNo}-${LANES[laneIndex].key}`
  );
}

function bibleUrl(reading: unknown): string {
  const label = labelForReading(reading)
    .replace(/\u00a0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\b([123])\s*([A-Za-z])/g, "$1 $2")
    .replace(/\b(I{1,3})\s*([A-Za-z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  const aliases: Array<[string, string]> = [
    ["Genesis", "GEN"], ["Gen", "GEN"], ["Ge", "GEN"], ["Gn", "GEN"],
    ["Exodus", "EXO"], ["Exod", "EXO"], ["Exo", "EXO"], ["Ex", "EXO"],
    ["Leviticus", "LEV"], ["Lev", "LEV"], ["Le", "LEV"], ["Lv", "LEV"],
    ["Numbers", "NUM"], ["Num", "NUM"], ["Nu", "NUM"], ["Nm", "NUM"],
    ["Deuteronomy", "DEU"], ["Deut", "DEU"], ["Deu", "DEU"], ["Dt", "DEU"],
    ["Joshua", "JOS"], ["Josh", "JOS"], ["Jos", "JOS"],
    ["Judges", "JDG"], ["Judg", "JDG"], ["Jdg", "JDG"], ["Jg", "JDG"],
    ["Ruth", "RUT"], ["Rth", "RUT"], ["Ru", "RUT"],

    ["1 Samuel", "1SA"], ["1 Sam", "1SA"], ["1 Sa", "1SA"], ["1 Sm", "1SA"],
    ["2 Samuel", "2SA"], ["2 Sam", "2SA"], ["2 Sa", "2SA"], ["2 Sm", "2SA"],
    ["1 Kings", "1KI"], ["1 Kgs", "1KI"], ["1 Ki", "1KI"],
    ["2 Kings", "2KI"], ["2 Kgs", "2KI"], ["2 Ki", "2KI"],
    ["1 Chronicles", "1CH"], ["1 Chron", "1CH"], ["1 Chr", "1CH"], ["1 Ch", "1CH"],
    ["2 Chronicles", "2CH"], ["2 Chron", "2CH"], ["2 Chr", "2CH"], ["2 Ch", "2CH"],

    ["Ezra", "EZR"], ["Ezr", "EZR"],
    ["Nehemiah", "NEH"], ["Neh", "NEH"],
    ["Esther", "EST"], ["Esth", "EST"], ["Est", "EST"],

    ["Job", "JOB"], ["Jb", "JOB"],
    ["Psalms", "PSA"], ["Psalm", "PSA"], ["Ps", "PSA"], ["Psa", "PSA"], ["Pss", "PSA"],
    ["Proverbs", "PRO"], ["Prov", "PRO"], ["Pro", "PRO"], ["Prv", "PRO"], ["Pr", "PRO"],
    ["Ecclesiastes", "ECC"], ["Eccles", "ECC"], ["Eccl", "ECC"], ["Ecc", "ECC"],
    ["Song of Solomon", "SNG"], ["Song of Songs", "SNG"], ["Song", "SNG"], ["SOS", "SNG"],

    ["Isaiah", "ISA"], ["Isa", "ISA"], ["Is", "ISA"],
    ["Jeremiah", "JER"], ["Jer", "JER"], ["Je", "JER"], ["Jr", "JER"],
    ["Lamentations", "LAM"], ["Lam", "LAM"],
    ["Ezekiel", "EZK"], ["Ezek", "EZK"], ["Ezk", "EZK"],
    ["Daniel", "DAN"], ["Dan", "DAN"], ["Da", "DAN"],
    ["Hosea", "HOS"], ["Hos", "HOS"],
    ["Joel", "JOL"], ["Amos", "AMO"],
    ["Obadiah", "OBA"], ["Obad", "OBA"], ["Oba", "OBA"],
    ["Jonah", "JON"], ["Jon", "JON"],
    ["Micah", "MIC"], ["Mic", "MIC"],
    ["Nahum", "NAM"], ["Nah", "NAM"],
    ["Habakkuk", "HAB"], ["Hab", "HAB"],
    ["Zephaniah", "ZEP"], ["Zeph", "ZEP"],
    ["Haggai", "HAG"], ["Hag", "HAG"],
    ["Zechariah", "ZEC"], ["Zech", "ZEC"],
    ["Malachi", "MAL"], ["Mal", "MAL"],

    ["Matthew", "MAT"], ["Matt", "MAT"], ["Mat", "MAT"], ["Mt", "MAT"],
    ["Mark", "MRK"], ["Mrk", "MRK"], ["Mk", "MRK"],
    ["Luke", "LUK"], ["Luk", "LUK"], ["Lk", "LUK"],
    ["John", "JHN"], ["Jhn", "JHN"], ["Jn", "JHN"],
    ["Acts", "ACT"], ["Act", "ACT"], ["Ac", "ACT"],

    ["Romans", "ROM"], ["Rom", "ROM"], ["Ro", "ROM"], ["Rm", "ROM"],
    ["1 Corinthians", "1CO"], ["1 Cor", "1CO"], ["1 Co", "1CO"],
    ["2 Corinthians", "2CO"], ["2 Cor", "2CO"], ["2 Co", "2CO"],
    ["Galatians", "GAL"], ["Gal", "GAL"],
    ["Ephesians", "EPH"], ["Eph", "EPH"],
    ["Philippians", "PHP"], ["Phil", "PHP"], ["Php", "PHP"],
    ["Colossians", "COL"], ["Col", "COL"],

    ["1 Thessalonians", "1TH"], ["1 Thess", "1TH"], ["1 Thes", "1TH"], ["1 Th", "1TH"],
    ["2 Thessalonians", "2TH"], ["2 Thess", "2TH"], ["2 Thes", "2TH"], ["2 Th", "2TH"],
    ["1 Timothy", "1TI"], ["1 Tim", "1TI"], ["1 Ti", "1TI"],
    ["2 Timothy", "2TI"], ["2 Tim", "2TI"], ["2 Ti", "2TI"],

    ["Titus", "TIT"], ["Tit", "TIT"],
    ["Philemon", "PHM"], ["Philem", "PHM"], ["Phlm", "PHM"], ["Phm", "PHM"],
    ["Hebrews", "HEB"], ["Heb", "HEB"],
    ["James", "JAS"], ["Jas", "JAS"],
    ["1 Peter", "1PE"], ["1 Pet", "1PE"], ["1 Pe", "1PE"],
    ["2 Peter", "2PE"], ["2 Pet", "2PE"], ["2 Pe", "2PE"],
    ["1 John", "1JN"], ["1 Jn", "1JN"],
    ["2 John", "2JN"], ["2 Jn", "2JN"],
    ["3 John", "3JN"], ["3 Jn", "3JN"],
    ["Jude", "JUD"], ["Jud", "JUD"],
    ["Revelation", "REV"], ["Rev", "REV"], ["Re", "REV"], ["Rv", "REV"]
  ];

  for (const [book, code] of aliases.sort((a, b) => b[0].length - a[0].length)) {
    const escapedBook = book.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = label.match(
      new RegExp("(^|[^A-Za-z0-9])" + escapedBook + "\\.?\\s+(\\d{1,3})(?:\\s*[-:]\\s*\\d{1,3})?", "i")
    );

    if (match) {
      return bibleComUrlForPassage({ code, chapter: match[2] });
    }
  }

  return "https://www.bible.com/search/bible?q=" + encodeURIComponent(label || "Bible reading plan");
}

// Recover {code, chapter} from the parsed bible.com URL (zero-risk reuse of
// bibleUrl's book/chapter parsing). Multi-chapter readings ("Genesis 1-11")
// resolve to their first chapter — the in-app reader's Next button continues
// the reading from there.
function referenceFromWebHref(href: string): ScriptureReference | null {
  const m = href.match(/\/bible\/206\/([A-Z0-9]+)\.(\d+)\.WEBUS/);
  if (!m) return null;
  const chapter = Number(m[2]);
  return Number.isInteger(chapter) && chapter >= 1 ? { book: m[1], chapter } : null;
}

// Canonical reference for a reading — the plan lib's own label parser first
// (it understands whole-book readings like "Malachi" and "2Pet", so every
// cell gets Read here), then the URL round-trip as a fallback.
function referenceForReading(reading: unknown): ScriptureReference | null {
  const parsed = bibleReadingPlanReadingReference(labelForReading(reading));
  if (parsed) return { book: parsed.code, chapter: parsed.chapter };
  return referenceFromWebHref(bibleUrl(reading));
}

// Every cell link goes to the reading's real first chapter on Bible.com —
// whole-book readings included (never a search-results page).
function hrefForReading(reading: unknown): string {
  const reference = referenceForReading(reading);
  return reference
    ? bibleComUrlForPassage({ code: reference.book, chapter: reference.chapter ?? 1 })
    : bibleUrl(reading);
}

// The Life Essentials principles that overlap a reading's first chapter —
// powers the 1-click Gene Getz video icon per cell.
function geneGetzForReading(reading: unknown): LifeEssentialsPrinciple[] {
  const reference = referenceForReading(reading);
  if (!reference) return [];
  return getGeneGetzPrinciplesForChapter(reference.book, reference.chapter ?? 1);
}

function flattenPlan(weeks: BibleReadingPlanWeek[]) {
  return weeks.flatMap((week, weekIndex) => {
    const weekNo = weekNumber(week, weekIndex + 1);

    return LANES.map((lane, laneIndex) => {
      const reading = readingForLane(week, laneIndex);
      const label = labelForReading(reading);
      const id = idForReading(reading, weekNo, laneIndex);

      return {
        id,
        weekNo,
        laneIndex,
        day: lane.day,
        short: lane.short,
        lane: laneForReading(reading, laneIndex),
        label,
        href: hrefForReading(reading),
        readerReference: referenceForReading(reading),
      };
    });
  });
}

// "week-48-friday" → { week: 48, daySlug: "friday" }; null when malformed.
function parseReadingId(readingId: string) {
  const match = readingId.match(/^week-(\d+)-([a-z]+)$/);
  if (!match) return null;
  return { week: Number(match[1]), daySlug: match[2] };
}

export default function BibleReadingPlanProgress({ weeks }: BibleReadingPlanProgressProps) {
  const readings = useMemo(() => flattenPlan(weeks), [weeks]);
  const [progress, setProgress] = useState<ChecklistProgress>({});
  const [highlightedReadingId, setHighlightedReadingId] = useState("");
  const [activeVideo, setActiveVideo] = useState<LifeEssentialsPrinciple | null>(null);
  // Modal reader state
  const [readerOpen, setReaderOpen] = useState(false);
  const [activeReadingId, setActiveReadingId] = useState("");
  const [readerReference, setReaderReference] = useState<ScriptureReference | null>(null);
  const [readerBounds, setReaderBounds] = useState<{
    book: string;
    startChapter: number;
    endChapter: number;
  } | null>(null);
  const [readerContext, setReaderContext] = useState<{
    week: number;
    day: string;
    lane: string;
    startChapter: number;
    endChapter: number;
  } | null>(null);
  // Persistent return focus tracking after reader closes
  const [returnFocusToId, setReturnFocusToId] = useState<string>("");
  // External 📖 links honor the person's chosen translation when Bible.com
  // supports it; WEB otherwise. Read after mount — localStorage is
  // client-only.
  const [linkVersion, setLinkVersion] = useState<{
    id: number;
    abbreviation: string;
    label: string;
  }>(BIBLE_COM_DEFAULT_VERSION);

  useEffect(() => {
    const savedId = loadTranslationPreference();
    const saved = BIBLE_COM_LINK_VERSIONS.find((version) => version.id === savedId);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- preference lives in localStorage, readable only after mount
    if (saved) setLinkVersion(saved);
  }, []);

  // The expanded reader row fills the visible width of the scrolling table
  // (never the full 1360px row), so the reading sits centered with no dead
  // space beside it.
  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const [readerWidth, setReaderWidth] = useState<number | null>(null);

  useEffect(() => {
    function measure() {
      const width = tableWrapRef.current?.clientWidth ?? 0;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- geometry is only known after mount
      setReaderWidth(width > 0 ? width : null);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Open reader modal for a cell.
  const openCellReader = useCallback(
    (readingId: string, focus: ScriptureReference | null) => {
      const reading = readings.find((entry) => entry.id === readingId);
      if (!reading || !reading.readerReference) return;

      const range = bibleReadingPlanAssignmentForReading(reading.label);
      if (!range) return;
      const book = getScriptureBook(range.code);
      if (!book) return;

      const assignment = {
        book: range.code,
        startChapter: Math.min(range.startChapter, book.chapters),
        endChapter: Math.min(range.endChapter, book.chapters),
      };

      const parsed = parseReadingId(readingId);
      const week = parsed?.week ?? reading.weekNo;

      setActiveReadingId(readingId);
      setReaderReference(
        focus && focus.book === reading.readerReference.book
          ? focus
          : reading.readerReference,
      );
      setReaderBounds(assignment);
      setReaderContext({
        week,
        day: reading.day,
        lane: reading.lane,
        startChapter: assignment.startChapter,
        endChapter: assignment.endChapter,
      });
      setReaderOpen(true);
      if (parsed) {
        const focusParam = focus ? `&focus=${encodeURIComponent(toUsfmString(focus))}` : "";
        window.history.replaceState(
          null,
          "",
          `/bible-reading-plan?week=${parsed.week}&day=${parsed.daySlug}${focusParam}#${readingId}`,
        );
      }
    },
    [readings],
  );

  const closeCellReader = useCallback(() => {
    setReaderOpen(false);
    setReaderContext(null);
    window.history.replaceState(null, "", "/bible-reading-plan");

    // Keep focus on the mark-complete button after closing the reader.
    // Set returnFocusToId so the useEffect can restore focus persistently.
    const parsed = parseReadingId(activeReadingId);
    if (parsed) {
      const cellId = `week-${parsed.week}-${parsed.daySlug}`;
      setReturnFocusToId(cellId);
    }

    setActiveReadingId("");
  }, [activeReadingId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe hydration: saved progress lives in localStorage, readable only after mount
    setProgress(loadChecklistProgress(STORAGE_KEY));
  }, []);

  useEffect(() => {
    let clearHighlightTimer: number | undefined;

    function targetIdFromUrl() {
      const hashTarget = window.location.hash.replace(/^#/, "").trim();
      if (hashTarget) return hashTarget;

      const params = new URLSearchParams(window.location.search);
      const week = params.get("week")?.trim();
      const day = params.get("day")?.trim();

      return week && day ? `week-${week}-${day}` : "";
    }

    function highlightTargetCell() {
      const targetId = targetIdFromUrl();
      if (!targetId) return;

      const target = document.getElementById(targetId);
      if (!target) return;

      if (clearHighlightTimer) {
        window.clearTimeout(clearHighlightTimer);
      }

      // A reading deep link opens the modal reader, focused on the verse
      // that brought the person here (?focus=MAL.4.6, USFM form).
      const focusRaw = new URLSearchParams(window.location.search).get("focus");
      const focusReference = focusRaw
        ? parseScriptureReference(decodeURIComponent(focusRaw))
        : null;
      openCellReader(targetId, focusReference);

      setHighlightedReadingId(targetId);

      window.setTimeout(() => {
        target.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });
        // Deep links land keyboard focus on the reading itself without
        // scroll-jumping — normal browsing (no hash/params) is untouched.
        target
          .querySelector<HTMLElement>("a, button")
          ?.focus({ preventScroll: true });
      }, 80);

      clearHighlightTimer = window.setTimeout(() => {
        setHighlightedReadingId((current) => (current === targetId ? "" : current));
      }, 5200);
    }

    highlightTargetCell();
    window.addEventListener("hashchange", highlightTargetCell);

    return () => {
      if (clearHighlightTimer) {
        window.clearTimeout(clearHighlightTimer);
      }

      window.removeEventListener("hashchange", highlightTargetCell);
    };
  }, [openCellReader]);

  // Restore focus persistently to the mark-complete button after closing the reader.
  // This effect runs after every render to ensure focus is maintained even if the
  // component re-renders or state changes occur.
  useEffect(() => {
    if (!returnFocusToId) return;

    const cell = document.getElementById(returnFocusToId);
    if (!cell) return;

    const toggleButton = cell.querySelector<HTMLButtonElement>('button.chp-read-check');
    if (!toggleButton) return;

    // Scroll the button into view if it's below the viewport
    const rect = toggleButton.getBoundingClientRect();
    // If button is below viewport, scroll to it
    if (rect.bottom > window.innerHeight) {
      toggleButton.scrollIntoView({ behavior: 'auto', block: 'center' });
    }

    // Restore focus
    toggleButton.focus({ preventScroll: true });

    // Add visual indicator for returned focus
    toggleButton.classList.add('chp-returned-focus');

    // Clear the returned focus indicator when the button is blurred
    const handleBlur = () => {
      toggleButton.classList.remove('chp-returned-focus');
      setReturnFocusToId("");
      toggleButton.removeEventListener('blur', handleBlur);
    };

    toggleButton.addEventListener('blur', handleBlur);

    return () => {
      toggleButton.removeEventListener('blur', handleBlur);
    };
  }, [returnFocusToId]);

  const readingIds = useMemo(() => readings.map((reading) => reading.id), [readings]);
  const { done: doneCount, remaining: daysLeft, percent } = checklistStats(readingIds, progress);
  const weeksLeft = weeks.filter((week, weekIndex) => {
    const weekNo = weekNumber(week, weekIndex + 1);

    return LANES.some((lane, laneIndex) => {
      const reading = readingForLane(week, laneIndex);
      const id = idForReading(reading, weekNo, laneIndex);
      return !progress[id];
    });
  }).length;
  const nextReading = readings.find((reading) => !progress[reading.id]) ?? readings[0];

  function toggleReading(id: string) {
    if (!progress[id]) track("reading_check", { reading_id: id });
    setProgress((current) => {
      const next = toggleChecklistItem(current, id);
      saveChecklistProgress(STORAGE_KEY, next, PROGRESS_EVENT);
      return next;
    });
  }

  return (
    <section className="chp-reading-sheet overflow-visible rounded-2xl border border-white/10 bg-slate-950/35">
      <div className="chp-plan-progress-summary border-b border-white/10 bg-slate-950/45 p-3 print:hidden">
        <div className="grid gap-3 md:grid-cols-[auto,1fr,auto] md:items-center">

          <div className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200/20 bg-emerald-300/10 px-4 py-3 md:justify-start">
            <span className="text-lg font-black leading-none text-white">{weeksLeft}</span>
            <span className="text-[0.58rem] font-black uppercase tracking-[0.14em] text-emerald-100">
              weeks left
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between gap-3 text-[0.62rem] font-black uppercase tracking-[0.14em] text-slate-300">
              <span>{doneCount}/{readings.length}</span>
              <span className="text-emerald-100">{percent}% done</span>
            </div>
            <div className="h-2 overflow-visible rounded-full border border-white/10 bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-300/80 transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <div className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-200/20 bg-sky-300/10 px-4 py-3 md:justify-start">
            <span className="text-lg font-black leading-none text-white">{daysLeft}</span>
            <span className="text-[0.58rem] font-black uppercase tracking-[0.14em] text-sky-100">
              days left
            </span>
          </div>
        </div>
      </div>

      {nextReading ? (
        <div className="chp-next-reading-row border-b border-white/10 bg-white/[0.04] px-3 py-4 sm:px-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-emerald-100">
                Next Reading
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className="text-sm font-black text-white sm:text-base">
                  Week {nextReading.weekNo} • {nextReading.day}
                </p>

                <span className="inline-flex items-center rounded-full border border-white/10 bg-slate-950/35 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.12em] text-emerald-100">
                  {nextReading.lane}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
              {nextReading.readerReference ? (
                <button
                  type="button"
                  onClick={() => {
                    openCellReader(nextReading.id, null);
                    window.setTimeout(() => {
                      document.getElementById(nextReading.id)?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                    }, 80);
                  }}
                  className="inline-flex min-h-10 w-full items-center justify-center rounded-2xl border border-emerald-200/30 bg-white/[0.06] px-4 py-2 text-sm font-black leading-tight text-white transition hover:border-emerald-200/50 hover:bg-white/[0.1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 sm:w-auto sm:text-base"
                  title={`Read ${nextReading.label} here`}
                >
                  Read {nextReading.label} here
                </button>
              ) : null}

              <a
                href={
                  nextReading.readerReference
                    ? bibleComUrl(
                        {
                          book: nextReading.readerReference.book,
                          chapter: nextReading.readerReference.chapter ?? 1,
                        },
                        linkVersion,
                      )
                    : nextReading.href
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 w-full items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-black leading-tight text-white transition hover:border-white/30 hover:bg-white/[0.1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 sm:w-auto sm:text-base"
                aria-label={`Open ${nextReading.label} on Bible.com in a new tab`}
                title={`${nextReading.label} on Bible.com`}
              >
                Bible.com <span aria-hidden="true">↗</span>
              </a>

              <label className="inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-emerald-200/25 bg-white/[0.06] px-4 py-2 text-[0.68rem] font-black uppercase tracking-[0.12em] text-white transition hover:border-emerald-200/45 hover:bg-white/[0.1] sm:w-auto">
                <input
                  type="checkbox"
                  checked={Boolean(progress[nextReading.id])}
                  onChange={() => toggleReading(nextReading.id)}
                  aria-label="Mark next reading"
                  className="peer sr-only"
                />
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-emerald-200/35 bg-slate-950/45 text-[0.72rem] leading-none text-transparent transition peer-checked:border-emerald-200/70 peer-checked:bg-emerald-300 peer-checked:text-slate-950">
                  ✓
                </span>
                <span>{progress[nextReading.id] ? "Done" : "Mark Done"}</span>
              </label>
            </div>
          </div>
        </div>
      ) : null}

      <div className="chp-reading-table overflow-x-auto pb-2" role="region" aria-label="Bible reading plan table" tabIndex={0}>
        <table className="w-[1360px] min-w-[1360px] table-fixed border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 bg-slate-900/75">
              <th className="w-10 border-r border-white/10 px-1.5 py-2 text-center text-[0.58rem] font-black uppercase tracking-[0.12em] text-slate-300">
                Wk
              </th>
              {LANES.map((lane) => (
                <th
                  key={lane.key}
                  className="border-r border-white/10 px-2.5 py-3 text-left last:border-r-0"
                >
                  <div className="flex min-h-[2.25rem] flex-col justify-center gap-0.5">
                    <p className="text-[0.56rem] font-black uppercase tracking-[0.14em] text-emerald-100">
                      {lane.short}
                    </p>
                    <p className="text-[0.68rem] font-black uppercase tracking-[0.08em] text-white">
                      {lane.lane}
                    </p>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {weeks.map((week, weekIndex) => {
              const weekNo = weekNumber(week, weekIndex + 1);

              return (
                <tr
                  key={weekNo}
                  className="border-b border-white/[0.065] last:border-b-0"
                >
                  <th className="border-r border-white/10 bg-slate-950/45 px-2 py-1 text-center text-xs font-black leading-none text-white">
                    {weekNo}
                  </th>

                  {LANES.map((lane, laneIndex) => {
                    const reading = readingForLane(week, laneIndex);
                    const label = labelForReading(reading);
                    const id = idForReading(reading, weekNo, laneIndex);
                    const readHereRef = referenceForReading(reading);
                    // External 📖 destination: the exact canonical assigned
                    // passage, in the chosen translation when supported.
                    const externalHref = readHereRef
                      ? bibleComUrl(
                          { book: readHereRef.book, chapter: readHereRef.chapter ?? 1 },
                          linkVersion,
                        )
                      : hrefForReading(reading);
                    const isRead = Boolean(progress[id]);
                    const getz = geneGetzForReading(reading).find((p) => p.youtubeId);

                    return (
                      <td
                        id={id}
                        key={lane.key}
                        className={`chp-reading-plan-cell scroll-mt-36 border-r border-white/[0.07] px-2 py-1 text-left transition duration-500 last:border-r-0 ${
                          highlightedReadingId === id
                            ? "chp-reading-target-cell bg-emerald-300/[0.06]"
                            : isRead
                              ? "bg-emerald-300/[0.075]"
                              : "bg-white/[0.015]"
                        }`}
                      >
                        <div className="flex min-h-[1.85rem] items-center justify-start gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleReading(id)}
                            aria-label={`${isRead ? "Mark unread" : "Mark read"} ${label}`}
                            aria-pressed={isRead}
                            className="chp-read-check"
                          >
                            ✓
                          </button>

                          {/* Underlined label = Read here on CrossHeartPray:
                              opens this cell's inline reader. */}
                          <button
                            type="button"
                            onClick={() =>
                              activeReadingId === id
                                ? closeCellReader()
                                : openCellReader(id, null)
                            }
                            title={`Read ${label} here`}
                            aria-label={`Read ${label} here on CrossHeartPray`}
                            aria-expanded={activeReadingId === id}
                            className="block min-w-0 flex-1 cursor-pointer whitespace-nowrap text-left text-[0.72rem] font-black leading-snug text-emerald-50 underline decoration-emerald-300/45 decoration-2 underline-offset-3 transition hover:text-white hover:decoration-emerald-100"
                          >
                            {label}
                          </button>

                          {/* 📖 = the external YouVersion/Bible.com action. */}
                          <a
                            href={externalHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Open ${label} in YouVersion/Bible.com`}
                            aria-label={`Open ${label} in YouVersion/Bible.com in a new tab`}
                            className="chp-getz-icon ml-auto shrink-0 cursor-pointer text-base leading-none opacity-80 transition hover:scale-110 hover:opacity-100"
                          >
                            <span aria-hidden="true">📖</span>
                            <span aria-hidden="true" className="align-super text-[0.5rem]">↗</span>
                          </a>

                          {getz ? (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={() => setActiveVideo(getz)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setActiveVideo(getz);
                                }
                              }}
                              title={`Watch Dr. Gene Getz — ${getz.principleTitle}`}
                              aria-label={`Watch Gene Getz Life Essentials video for ${label}`}
                              className="chp-getz-icon ml-auto shrink-0 cursor-pointer text-base leading-none opacity-80 transition hover:scale-110 hover:opacity-100"
                            >
                              🎬
                            </span>
                          ) : null}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {activeVideo?.youtubeId ? (
        <YouTubeModal
          videoId={activeVideo.youtubeId}
          title={`Principle ${activeVideo.principleNumber} · ${activeVideo.principleTitle}`}
          onClose={() => setActiveVideo(null)}
          onPrev={() => setActiveVideo(getAdjacentPlayablePrinciple(activeVideo, -1))}
          onNext={() => setActiveVideo(getAdjacentPlayablePrinciple(activeVideo, 1))}
        />
      ) : null}

      <KindleReaderModal
        isOpen={readerOpen}
        onClose={closeCellReader}
        initialReference={readerReference ?? undefined}
        chapterBounds={readerBounds ?? undefined}
        readingContext={readerContext ?? undefined}
      />
    </section>
  );
}
