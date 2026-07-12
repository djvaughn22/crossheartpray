"use client";
import * as CHPLocalBibleData from "../../lib/localBibleVerses";
import SiteFooter from "../../components/SiteFooter";


import SiteHeader from "../../components/SiteHeader";
import BibleBingoKingCard from "../../components/BibleBingoKingCard";
import GeneGetzResourceCard from "../../components/GeneGetzResourceCard";
import { getGeneGetzPrinciplesForVerse } from "../../lib/geneGetzLifeEssentials";

import { useEffect, useMemo, useState, useRef } from "react";
import {
  bibleBingoBoardIdFromPassages,
  bibleBingoOddsForSection,
  randomReferenceForSection,
  seededReferenceForSection,
} from "../../lib/bibleRandom";
import {
  bibleReadingPlanDayForReference,
  bibleReadingPlanHrefForReference,
  bibleReadingPlanLabelForReference,
} from "../../lib/bibleReadingPlan";
import CardInfoLegend from "../../components/CardInfoLegend";
import CardReadMenu from "../../components/CardReadMenu";
import LazyBibleVerseLookup from "../../components/LazyBibleVerseLookup";
import OriginalWordStudyModal from "../../components/OriginalWordStudyModal";
import VerifiedVerseText from "../../components/VerifiedVerseText";
import BibleBingoShareMenu from "../../components/BibleBingoShareMenu";
import CentralTimeBadge from "../../components/CentralTimeBadge";
import {
  BIBLE_BINGO_SECTIONS,
  chicagoDateKey,
  chicagoTodayWeekdayIndex,
} from "../../lib/dailyBibleBingo";
import PageNucleusHero from "../../components/PageNucleusHero";
import {
  buildDeepDiveWordStudiesUrl,
  getDefaultWordStudy,
  hasVerifiedWordStudies,
  type VerifiedWordStudy,
  wordStudyLookupKey,
} from "../../lib/originalLanguageWordStudy";

const CHP_BOOK_CODE_BY_NAME: Record<string, string> = {
  Genesis: "GEN", Exodus: "EXO", Leviticus: "LEV", Numbers: "NUM", Deuteronomy: "DEU",
  Joshua: "JOS", Judges: "JDG", Ruth: "RUT", "1 Samuel": "1SA", "2 Samuel": "2SA",
  "1 Kings": "1KI", "2 Kings": "2KI", "1 Chronicles": "1CH", "2 Chronicles": "2CH",
  Ezra: "EZR", Nehemiah: "NEH", Esther: "EST", Job: "JOB", Psalms: "PSA", Psalm: "PSA",
  Proverbs: "PRO", Ecclesiastes: "ECC", "Song of Solomon": "SNG", "Song of Songs": "SNG",
  Isaiah: "ISA", Jeremiah: "JER", Lamentations: "LAM", Ezekiel: "EZK", Daniel: "DAN",
  Hosea: "HOS", Joel: "JOL", Amos: "AMO", Obadiah: "OBA", Jonah: "JON", Micah: "MIC",
  Nahum: "NAM", Habakkuk: "HAB", Zephaniah: "ZEP", Haggai: "HAG", Zechariah: "ZEC",
  Malachi: "MAL", Matthew: "MAT", Mark: "MRK", Luke: "LUK", John: "JHN", Acts: "ACT",
  Romans: "ROM", "1 Corinthians": "1CO", "2 Corinthians": "2CO", Galatians: "GAL",
  Ephesians: "EPH", Philippians: "PHP", Colossians: "COL", "1 Thessalonians": "1TH",
  "2 Thessalonians": "2TH", "1 Timothy": "1TI", "2 Timothy": "2TI", Titus: "TIT",
  Philemon: "PHM", Hebrews: "HEB", James: "JAS", "1 Peter": "1PE", "2 Peter": "2PE",
  "1 John": "1JN", "2 John": "2JN", "3 John": "3JN", Jude: "JUD", Revelation: "REV",
};

/* BIBLE BINGO LANE VERSE POSITION LABEL */
type ChpLocalBibleVerseRecord = Record<string, unknown>;

const CHP_LANE_BOOKS: Record<string, string[]> = {
  law: ["GEN", "EXO", "LEV", "NUM", "DEU"],
  history: ["JOS", "JDG", "RUT", "1SA", "2SA", "1KI", "2KI", "1CH", "2CH", "EZR", "NEH", "EST", "ACT"],
  psalms: ["PSA"],
  poetry: ["JOB", "PRO", "ECC", "SNG"],
  prophecy: ["ISA", "JER", "LAM", "EZK", "DAN", "HOS", "JOL", "AMO", "OBA", "JON", "MIC", "NAM", "HAB", "ZEP", "HAG", "ZEC", "MAL", "REV"],
  gospels: ["MAT", "MRK", "LUK", "JHN"],
  epistles: ["ROM", "1CO", "2CO", "GAL", "EPH", "PHP", "COL", "1TH", "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAS", "1PE", "2PE", "1JN", "2JN", "3JN", "JUD"],
};

function chpText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function chpNum(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function chpRows(value: unknown, rows: ChpLocalBibleVerseRecord[] = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (item && typeof item === "object") rows.push(item as ChpLocalBibleVerseRecord);
    });
    return rows;
  }

  if (value && typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((item) => chpRows(item, rows));
  }

  return rows;
}

const CHP_BIBLE_ROWS = chpRows(CHPLocalBibleData);

function chpLaneKey(card: Record<string, unknown>) {
  const section = (card.section ?? {}) as Record<string, unknown>;
  const title = [
    section.title,
    section.label,
    card.sectionTitle,
    card.section,
    card.lane,
    card.dayLabel,
  ].map(chpText).join(" ").toLowerCase();

  if (title.includes("law") || title.includes("genesis")) return "law";
  if (title.includes("history") || title.includes("old testament")) return "history";
  if (title.includes("psalm")) return "psalms";
  if (title.includes("poetry") || title.includes("proverb")) return "poetry";
  if (title.includes("prophecy") || title.includes("revelation")) return "prophecy";
  if (title.includes("gospel")) return "gospels";
  if (title.includes("epistle")) return "epistles";
  return "";
}

function chpBookCodeFromText(value: unknown) {
  const raw = chpText(value);
  if (!raw) return "";

  const upper = raw.toUpperCase();
  if (/^[1-3]?[A-Z]{2,3}$/.test(upper)) return upper;

  const dotted = raw.match(/^([1-3]?[A-Za-z]{2,3})\./);
  if (dotted) return dotted[1].toUpperCase();

  const names = Object.keys(CHP_BOOK_CODE_BY_NAME).sort((a, b) => b.length - a.length);
  const found = names.find((name) => raw === name || raw.startsWith(`${name} `));
  return found ? CHP_BOOK_CODE_BY_NAME[found] : "";
}

function chpBook(record: Record<string, unknown>) {
  return (
    chpBookCodeFromText(record.code) ||
    chpBookCodeFromText(record.bookCode) ||
    chpBookCodeFromText(record.book) ||
    chpBookCodeFromText(record.bookName) ||
    chpBookCodeFromText(record.name) ||
    chpBookCodeFromText(record.reference) ||
    chpBookCodeFromText(record.label) ||
    chpBookCodeFromText(record.id)
  );
}

function chpChapter(record: Record<string, unknown>) {
  const direct = chpNum(record.chapter) ?? chpNum(record.chapterNumber);
  if (direct) return direct;

  const text = [record.reference, record.label, record.id].map(chpText).find(Boolean) ?? "";
  const dotted = text.match(/^[1-3]?[A-Za-z]{2,3}\.(\d+)(?:\.|$)/);
  if (dotted) return Number(dotted[1]);

  const colon = text.match(/\s(\d+):\d+/);
  return colon ? Number(colon[1]) : null;
}

function chpVerse(record: Record<string, unknown>) {
  const direct = chpNum(record.verse) ?? chpNum(record.verseNumber);
  if (direct) return direct;

  const text = [record.reference, record.label, record.id].map(chpText).find(Boolean) ?? "";
  const dotted = text.match(/^[1-3]?[A-Za-z]{2,3}\.\d+\.(\d+)/);
  if (dotted) return Number(dotted[1]);

  const colon = text.match(/\s\d+:(\d+)/);
  return colon ? Number(colon[1]) : null;
}

function bibleBingoLaneVerseLabel(card: unknown) {
  const cardRecord = card as Record<string, unknown>;
  const passage = (cardRecord.passage ?? {}) as Record<string, unknown>;

  const lane = chpLaneKey(cardRecord);
  const books = lane ? CHP_LANE_BOOKS[lane] ?? [] : [];
  const pool = books.length ? CHP_BIBLE_ROWS.filter((row) => books.includes(chpBook(row))) : [];

  const total = pool.length;
  if (!total) return "Lane count unavailable";

  const cardBook = chpBook(passage) || chpBook(cardRecord);
  const cardChapter = chpChapter(passage) ?? chpChapter(cardRecord);
  const cardVerse = chpVerse(passage) ?? chpVerse(cardRecord);

  const position =
    cardBook && cardChapter && cardVerse
      ? pool.findIndex(
          (row) =>
            chpBook(row) === cardBook &&
            chpChapter(row) === cardChapter &&
            chpVerse(row) === cardVerse,
        ) + 1
      : 0;

  if (position > 0) return `Verse ${position.toLocaleString()} of ${total.toLocaleString()} in this lane`;
  return `${total.toLocaleString()} verses in this lane`;
}
/* END BIBLE BINGO LANE VERSE POSITION LABEL */
type Passage = {
  label: string;
  code: string;
  chapter: string;
  verse: string;
  text: string;
};

type Section = {
  title: string;
  emoji: string;
  line: string;
  odds: string;
  gridClass?: string;
};

type OriginalLanguage = "hebrew" | "greek";

type ActiveWordStudy = {
  passage: Passage;
  wordStudy: VerifiedWordStudy;
};

// Canonical lane definitions live in dailyBibleBingo.ts — shared with
// /today and the daily Instagram publisher so boards can never diverge.
const sections: Section[] = BIBLE_BINGO_SECTIONS;
const CARD_TONES = [
  "border-emerald-200/15 bg-emerald-300/10",
  "border-yellow-200/15 bg-yellow-200/10",
  "border-red-200/15 bg-red-300/10",
  "border-sky-200/15 bg-sky-300/10",
  "border-lime-200/15 bg-lime-300/10",
  "border-orange-200/15 bg-orange-300/10",
  "border-violet-200/15 bg-violet-300/10",
];

function cardTone(index: number) {
  return CARD_TONES[index % CARD_TONES.length];
}


type BibleBookLink = {
  label: string;
  href: string;
};

function bibleBookHref(code: string) {
  return `https://www.bible.com/bible/206/${code}.1.WEBUS`;
}

const BIBLE_BINGO_BOOK_LINKS: Record<string, BibleBookLink[]> = {
  epistles: [
    { label: "Romans", href: bibleBookHref("ROM") },
    { label: "1 Corinthians", href: bibleBookHref("1CO") },
    { label: "2 Corinthians", href: bibleBookHref("2CO") },
    { label: "Galatians", href: bibleBookHref("GAL") },
    { label: "Ephesians", href: bibleBookHref("EPH") },
    { label: "Philippians", href: bibleBookHref("PHP") },
    { label: "Colossians", href: bibleBookHref("COL") },
    { label: "1 Thessalonians", href: bibleBookHref("1TH") },
    { label: "2 Thessalonians", href: bibleBookHref("2TH") },
    { label: "1 Timothy", href: bibleBookHref("1TI") },
    { label: "2 Timothy", href: bibleBookHref("2TI") },
    { label: "Titus", href: bibleBookHref("TIT") },
    { label: "Philemon", href: bibleBookHref("PHM") },
    { label: "Hebrews", href: bibleBookHref("HEB") },
    { label: "James", href: bibleBookHref("JAS") },
    { label: "1 Peter", href: bibleBookHref("1PE") },
    { label: "2 Peter", href: bibleBookHref("2PE") },
    { label: "1 John", href: bibleBookHref("1JN") },
    { label: "2 John", href: bibleBookHref("2JN") },
    { label: "3 John", href: bibleBookHref("3JN") },
    { label: "Jude", href: bibleBookHref("JUD") },
  ],
  law: [
    { label: "The Law", href: bibleBookHref("GEN") },
    { label: "Exodus", href: bibleBookHref("EXO") },
    { label: "Leviticus", href: bibleBookHref("LEV") },
    { label: "Numbers", href: bibleBookHref("NUM") },
    { label: "Deuteronomy", href: bibleBookHref("DEU") },
  ],
  history: [
    { label: "Joshua", href: bibleBookHref("JOS") },
    { label: "Judges", href: bibleBookHref("JDG") },
    { label: "Ruth", href: bibleBookHref("RUT") },
    { label: "1 Samuel", href: bibleBookHref("1SA") },
    { label: "2 Samuel", href: bibleBookHref("2SA") },
    { label: "1 Kings", href: bibleBookHref("1KI") },
    { label: "2 Kings", href: bibleBookHref("2KI") },
    { label: "1 Chronicles", href: bibleBookHref("1CH") },
    { label: "2 Chronicles", href: bibleBookHref("2CH") },
    { label: "Ezra", href: bibleBookHref("EZR") },
    { label: "Nehemiah", href: bibleBookHref("NEH") },
    { label: "Esther", href: bibleBookHref("EST") },
  ],
  psalms: [
    { label: "Psalms", href: bibleBookHref("PSA") },
  ],
  poetry: [
    { label: "Job", href: bibleBookHref("JOB") },
    { label: "Poetry", href: bibleBookHref("PRO") },
    { label: "Ecclesiastes", href: bibleBookHref("ECC") },
    { label: "Song of Solomon", href: bibleBookHref("SNG") },
  ],
  prophecy: [
    { label: "Isaiah", href: bibleBookHref("ISA") },
    { label: "Jeremiah", href: bibleBookHref("JER") },
    { label: "Lamentations", href: bibleBookHref("LAM") },
    { label: "Ezekiel", href: bibleBookHref("EZK") },
    { label: "Daniel", href: bibleBookHref("DAN") },
    { label: "Hosea", href: bibleBookHref("HOS") },
    { label: "Joel", href: bibleBookHref("JOL") },
    { label: "Amos", href: bibleBookHref("AMO") },
    { label: "Obadiah", href: bibleBookHref("OBA") },
    { label: "Jonah", href: bibleBookHref("JON") },
    { label: "Micah", href: bibleBookHref("MIC") },
    { label: "Nahum", href: bibleBookHref("NAM") },
    { label: "Habakkuk", href: bibleBookHref("HAB") },
    { label: "Zephaniah", href: bibleBookHref("ZEP") },
    { label: "Haggai", href: bibleBookHref("HAG") },
    { label: "Zechariah", href: bibleBookHref("ZEC") },
    { label: "Malachi", href: bibleBookHref("MAL") },
  ],
  gospels: [
    { label: "Matthew", href: bibleBookHref("MAT") },
    { label: "Mark", href: bibleBookHref("MRK") },
    { label: "Luke", href: bibleBookHref("LUK") },
    { label: "John", href: bibleBookHref("JHN") },
  ],
};

/* BIBLE BINGO READING PLAN BOOK LINKS */
const BIBLE_BINGO_READING_PLAN_BOOK_LINKS: Record<string, BibleBookLink[]> = {
  law: [
    { label: "Genesis", href: "https://www.bible.com/bible/206/GEN.1.WEBUS" },
    { label: "Exodus", href: "https://www.bible.com/bible/206/EXO.1.WEBUS" },
    { label: "Leviticus", href: "https://www.bible.com/bible/206/LEV.1.WEBUS" },
    { label: "Numbers", href: "https://www.bible.com/bible/206/NUM.1.WEBUS" },
    { label: "Deuteronomy", href: "https://www.bible.com/bible/206/DEU.1.WEBUS" },
  ],
  history: [
    { label: "Joshua", href: "https://www.bible.com/bible/206/JOS.1.WEBUS" },
    { label: "Judges", href: "https://www.bible.com/bible/206/JDG.1.WEBUS" },
    { label: "Ruth", href: "https://www.bible.com/bible/206/RUT.1.WEBUS" },
    { label: "1 Samuel", href: "https://www.bible.com/bible/206/1SA.1.WEBUS" },
    { label: "2 Samuel", href: "https://www.bible.com/bible/206/2SA.1.WEBUS" },
    { label: "1 Kings", href: "https://www.bible.com/bible/206/1KI.1.WEBUS" },
    { label: "2 Kings", href: "https://www.bible.com/bible/206/2KI.1.WEBUS" },
    { label: "1 Chronicles", href: "https://www.bible.com/bible/206/1CH.1.WEBUS" },
    { label: "2 Chronicles", href: "https://www.bible.com/bible/206/2CH.1.WEBUS" },
    { label: "Ezra", href: "https://www.bible.com/bible/206/EZR.1.WEBUS" },
    { label: "Nehemiah", href: "https://www.bible.com/bible/206/NEH.1.WEBUS" },
    { label: "Esther", href: "https://www.bible.com/bible/206/EST.1.WEBUS" },
    { label: "Acts", href: "https://www.bible.com/bible/206/ACT.1.WEBUS" },
  ],
  psalms: [
    { label: "Psalms", href: "https://www.bible.com/bible/206/PSA.1.WEBUS" },
  ],
  poetry: [
    { label: "Job", href: "https://www.bible.com/bible/206/JOB.1.WEBUS" },
    { label: "Proverbs", href: "https://www.bible.com/bible/206/PRO.1.WEBUS" },
    { label: "Ecclesiastes", href: "https://www.bible.com/bible/206/ECC.1.WEBUS" },
    { label: "Song of Solomon", href: "https://www.bible.com/bible/206/SNG.1.WEBUS" },
  ],
  prophecy: [
    { label: "Isaiah", href: "https://www.bible.com/bible/206/ISA.1.WEBUS" },
    { label: "Jeremiah", href: "https://www.bible.com/bible/206/JER.1.WEBUS" },
    { label: "Lamentations", href: "https://www.bible.com/bible/206/LAM.1.WEBUS" },
    { label: "Ezekiel", href: "https://www.bible.com/bible/206/EZK.1.WEBUS" },
    { label: "Daniel", href: "https://www.bible.com/bible/206/DAN.1.WEBUS" },
    { label: "Hosea", href: "https://www.bible.com/bible/206/HOS.1.WEBUS" },
    { label: "Joel", href: "https://www.bible.com/bible/206/JOL.1.WEBUS" },
    { label: "Amos", href: "https://www.bible.com/bible/206/AMO.1.WEBUS" },
    { label: "Obadiah", href: "https://www.bible.com/bible/206/OBA.1.WEBUS" },
    { label: "Jonah", href: "https://www.bible.com/bible/206/JON.1.WEBUS" },
    { label: "Micah", href: "https://www.bible.com/bible/206/MIC.1.WEBUS" },
    { label: "Nahum", href: "https://www.bible.com/bible/206/NAM.1.WEBUS" },
    { label: "Habakkuk", href: "https://www.bible.com/bible/206/HAB.1.WEBUS" },
    { label: "Zephaniah", href: "https://www.bible.com/bible/206/ZEP.1.WEBUS" },
    { label: "Haggai", href: "https://www.bible.com/bible/206/HAG.1.WEBUS" },
    { label: "Zechariah", href: "https://www.bible.com/bible/206/ZEC.1.WEBUS" },
    { label: "Malachi", href: "https://www.bible.com/bible/206/MAL.1.WEBUS" },
    { label: "Revelation", href: "https://www.bible.com/bible/206/REV.1.WEBUS" },
  ],
  gospels: [
    { label: "Matthew", href: "https://www.bible.com/bible/206/MAT.1.WEBUS" },
    { label: "Mark", href: "https://www.bible.com/bible/206/MRK.1.WEBUS" },
    { label: "Luke", href: "https://www.bible.com/bible/206/LUK.1.WEBUS" },
    { label: "John", href: "https://www.bible.com/bible/206/JHN.1.WEBUS" },
  ],
  epistles: [
    { label: "Romans", href: "https://www.bible.com/bible/206/ROM.1.WEBUS" },
    { label: "1 Corinthians", href: "https://www.bible.com/bible/206/1CO.1.WEBUS" },
    { label: "2 Corinthians", href: "https://www.bible.com/bible/206/2CO.1.WEBUS" },
    { label: "Galatians", href: "https://www.bible.com/bible/206/GAL.1.WEBUS" },
    { label: "Ephesians", href: "https://www.bible.com/bible/206/EPH.1.WEBUS" },
    { label: "Philippians", href: "https://www.bible.com/bible/206/PHP.1.WEBUS" },
    { label: "Colossians", href: "https://www.bible.com/bible/206/COL.1.WEBUS" },
    { label: "1 Thessalonians", href: "https://www.bible.com/bible/206/1TH.1.WEBUS" },
    { label: "2 Thessalonians", href: "https://www.bible.com/bible/206/2TH.1.WEBUS" },
    { label: "1 Timothy", href: "https://www.bible.com/bible/206/1TI.1.WEBUS" },
    { label: "2 Timothy", href: "https://www.bible.com/bible/206/2TI.1.WEBUS" },
    { label: "Titus", href: "https://www.bible.com/bible/206/TIT.1.WEBUS" },
    { label: "Philemon", href: "https://www.bible.com/bible/206/PHM.1.WEBUS" },
    { label: "Hebrews", href: "https://www.bible.com/bible/206/HEB.1.WEBUS" },
    { label: "James", href: "https://www.bible.com/bible/206/JAS.1.WEBUS" },
    { label: "1 Peter", href: "https://www.bible.com/bible/206/1PE.1.WEBUS" },
    { label: "2 Peter", href: "https://www.bible.com/bible/206/2PE.1.WEBUS" },
    { label: "1 John", href: "https://www.bible.com/bible/206/1JN.1.WEBUS" },
    { label: "2 John", href: "https://www.bible.com/bible/206/2JN.1.WEBUS" },
    { label: "3 John", href: "https://www.bible.com/bible/206/3JN.1.WEBUS" },
    { label: "Jude", href: "https://www.bible.com/bible/206/JUD.1.WEBUS" },
  ],
};

function bibleBingoBookLinksForSection(sectionTitle: string): BibleBookLink[] {
  const normalized = sectionTitle.toLowerCase();

  if (normalized.includes("law") || normalized.includes("genesis")) {
    return BIBLE_BINGO_READING_PLAN_BOOK_LINKS.law;
  }

  if (normalized.includes("history") || normalized.includes("old testament")) {
    return BIBLE_BINGO_READING_PLAN_BOOK_LINKS.history;
  }

  if (normalized.includes("psalm")) {
    return BIBLE_BINGO_READING_PLAN_BOOK_LINKS.psalms;
  }

  if (normalized.includes("poetry") || normalized.includes("proverb")) {
    return BIBLE_BINGO_READING_PLAN_BOOK_LINKS.poetry;
  }

  if (normalized.includes("prophecy") || normalized.includes("revelation")) {
    return BIBLE_BINGO_READING_PLAN_BOOK_LINKS.prophecy;
  }

  if (normalized.includes("gospel")) {
    return BIBLE_BINGO_READING_PLAN_BOOK_LINKS.gospels;
  }

  if (normalized.includes("epistle")) {
    return BIBLE_BINGO_READING_PLAN_BOOK_LINKS.epistles;
  }

  return [];
}
/* END BIBLE BINGO READING PLAN BOOK LINKS */

function randomPassage(section: Section, avoidLabel?: string) {
  return randomReferenceForSection(section.title, avoidLabel);
}

function buildPath(currentPath?: { section: Section; passage: Passage }[]) {
  return sections.map((section) => {
    const currentItem = currentPath?.find((item) => item.section.title === section.title);

    return {
      section,
      passage: randomPassage(section, currentItem?.passage.label),
    };
  });
}

// Shared with dailyBibleBingo.ts so the on-site daily board and the daily
// Instagram post always seed from the same America/Chicago calendar date.
const centralDateSeed = chicagoDateKey;

function splitBibleBingoSectionTitle(title: string) {
  const parts = title.split("—").map((part) => part.trim()).filter(Boolean);

  if (parts.length >= 2) {
    return {
      dayLabel: parts[0],
      title: parts.slice(1).join(" — "),
    };
  }

  return {
    dayLabel: "",
    title,
  };
}

const BINGO_READING_PLAN_STORAGE_KEY = "crossheartpray:bible-reading-plan:v1";

function loadBingoReadingPlanDone(): Record<string, boolean> {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(BINGO_READING_PLAN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { done?: Record<string, boolean> };
    return parsed.done ?? {};
  } catch {
    return {};
  }
}

function bingoReadingPlanDoneKeyForPassage(code: string, chapter: string | number) {
  const day = bibleReadingPlanDayForReference(code, chapter);

  if (!day) {
    return "";
  }

  return `week-${day.week}-${day.daySlug}`;
}

function isBingoReadingPlanDone(done: Record<string, boolean>, code: string, chapter: string | number) {
  const key = bingoReadingPlanDoneKeyForPassage(code, chapter);

  return Boolean(key && done[key]);
}

const centralDayIndex = chicagoTodayWeekdayIndex;

function displayIndexesStartingWith(startIndex: number) {
  const safeStart = startIndex >= 0 ? startIndex : 0;

  return sections.map((_, offset) => (safeStart + offset) % sections.length);
}


function chpBingoVerseOnlyLabel(label: string) {
  return label.replace(/\s+[·•-]\s+\d[\d,]*\s+of\s+\d[\d,]*\s*$/i, "").trim();
}


function buildDailyPath() {
  const seed = centralDateSeed();

  return sections.map((section) => ({
    section,
    passage: seededReferenceForSection(section.title, seed),
  }));
}

function verseUrl(passage: Passage) {
  return `https://www.bible.com/bible/206/${passage.code}.${passage.chapter}.${passage.verse}.WEBUS`;
}

function chapterUrl(passage: Passage) {
  return `https://www.bible.com/bible/206/${passage.code}.${passage.chapter}.WEBUS`;
}

function hasVerifiedWordLinks(wordStudies: VerifiedWordStudy[]) {
  return hasVerifiedWordStudies(wordStudies);
}

function defaultOriginalLanguage(section: Section): OriginalLanguage {
  if (section.title.includes("Epistles") || section.title.includes("Gospels")) {
    return "greek";
  }

  return "hebrew";
}

function originalLanguageName(language: OriginalLanguage) {
  return language === "hebrew" ? "Hebrew" : "Greek";
}

function availableOriginalLanguages(sectionTitle: string): OriginalLanguage[] {
  if (sectionTitle.includes("Epistles") || sectionTitle.includes("Gospels")) {
    return ["greek"];
  }

  return ["hebrew"];
}

function languageButtonClass(language: OriginalLanguage, activeLanguage: OriginalLanguage) {
  if (language === activeLanguage && language === "hebrew") {
    return "border-emerald-200/40 bg-emerald-300/15 text-emerald-100";
  }

  if (language === activeLanguage && language === "greek") {
    return "border-sky-200/40 bg-sky-300/15 text-sky-100";
  }

  return "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10";
}

export default function BibleExplorerPage() {
  const [path, setPath] = useState(() => buildDailyPath());
  const [spinVersions, setSpinVersions] = useState(() => sections.map(() => 0));
  const [spinningCards, setSpinningCards] = useState(() => sections.map(() => false));
  const [spinDelays, setSpinDelays] = useState(() => sections.map(() => 0));
  const [focusedCardIndex, setFocusedCardIndex] = useState(() => centralDayIndex());
  const [focusedMoreSection, setFocusedMoreSection] = useState<"life" | "books" | null>(null);
  const [bingoReadingPlanDone, setBingoReadingPlanDone] = useState<Record<string, boolean>>({});
  const [focusedFlipVersion, setFocusedFlipVersion] = useState(0);
  const focusedCardRef = useRef<HTMLElement | null>(null);
  const hasFocusedCardMountedRef = useRef(false);
  const [activeWordStudy, setActiveWordStudy] = useState<ActiveWordStudy | null>(null);
  const [loadingStudyKey, setLoadingStudyKey] = useState<string | null>(null);
  const [wordStudiesByPassage, setWordStudiesByPassage] = useState<
    Record<string, VerifiedWordStudy[]>
  >({});

  const verseOfTheDayUrl = useMemo(() => {
    const today = new Date();
    const todayDate = `${today.getFullYear()}-${String(
      today.getMonth() + 1,
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    return `https://www.bible.com/verse-of-the-day`;
  }, []);

  const boardId = useMemo(
    () => bibleBingoBoardIdFromPassages(path.map(({ passage }) => passage)),
    [path],
  );
  const boardPath = `/bible-bingo/${boardId}`;
  const boardUrl = `https://crossheartpray.com${boardPath}`;
  const boardShareText = [
    "I dealt 7 Bible Bingo cards.",
    "",
    "Which card should we explore?",
    "",
    boardUrl,
  ].join("\n");
  const boardShareSubject = "My Bible Bingo board";

  const boardHtmlEmail = `
    <div style="font-family: Arial, Helvetica, sans-serif; background: #f1f5f9; color: #0f172a; padding: 28px 12px;">
      <div style="max-width: 720px; margin: 0 auto;">
        <p style="font-size: 34px; text-align: center; margin: 0 0 14px;">✝️ ❤️ 🙏</p>
        <h1 style="font-family: Georgia, 'Times New Roman', serif; text-align: center; margin: 0; font-size: 34px; line-height: 1.15; color: #0f172a;">Bible Bingo Board</h1>
        <p style="text-align: center; color: #475569; font-size: 16px; line-height: 1.6; max-width: 560px; margin-left: auto; margin-right: auto;">
          Same 7 cards. Explore and share.
        </p>
        <p style="text-align: center; margin: 24px 0;">
</p>
        ${path.map(({ section, passage }, index) => `
          <div style="border: 1px solid #dbe3ee; border-radius: 18px; padding: 22px; margin: 16px 0; background: #ffffff;">
            <p style="font-size: 30px; text-align: center; margin: 0 0 8px;">${section.emoji}</p>
            <h2 style="font-family: Arial, Helvetica, sans-serif; text-align: center; margin: 8px 0 6px; font-size: 13px; line-height: 1.4; letter-spacing: 0.12em; text-transform: uppercase; color: #047857;">${section.title}</h2>
            <p style="font-family: Georgia, 'Times New Roman', serif; text-align: center; color: #0f172a; font-weight: bold; font-size: 24px; line-height: 1.25; margin: 10px 0 14px;">${passage.label}</p>
            <p style="font-family: Georgia, 'Times New Roman', serif; color: #334155; line-height: 1.7; font-size: 17px;">${passage.text}</p>
            <p style="text-align: center;">
&nbsp; | &nbsp;
              <a href="${chapterUrl(passage)}" style="color: #065f46; font-weight: bold; text-decoration: none;">Chapter</a>
              &nbsp; | &nbsp;
              <a href="${boardUrl}?card=${index + 1}" style="color: #065f46; font-weight: bold; text-decoration: none;">Card</a>
            </p>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  function cardHtmlEmail(section: Section, passage: Passage, index: number) {
    return `
      <div style="font-family: Arial, Helvetica, sans-serif; background: #f1f5f9; color: #0f172a; padding: 28px 12px;">
        <div style="max-width: 560px; margin: 0 auto;">
          <p style="font-size: 32px; text-align: center; margin: 0 0 12px;">${section.emoji}</p>
          <h1 style="font-family: Georgia, 'Times New Roman', serif; text-align: center; margin: 0; font-size: 30px; line-height: 1.15; color: #0f172a;">${section.title} Bible Bingo Card</h1>
          <p style="font-family: Georgia, 'Times New Roman', serif; text-align: center; color: #0f172a; font-weight: bold; font-size: 24px; line-height: 1.25; margin: 18px 0 12px;">${passage.label}</p>
          <div style="border: 1px solid #dbe3ee; border-radius: 18px; padding: 22px; margin: 16px 0; background: #ffffff;">
            <p style="font-family: Georgia, 'Times New Roman', serif; color: #334155; line-height: 1.7; font-size: 17px;">${passage.text}</p>
            <p style="text-align: center; margin: 22px 0 0;">
              <a href="${boardUrl}?card=${index + 1}" style="color: #065f46; font-weight: bold; text-decoration: none;">Open Live Card</a>
              &nbsp; | &nbsp;
              <a href="${verseUrl(passage)}" style="color: #065f46; font-weight: bold; text-decoration: none;">Verse</a>
              &nbsp; | &nbsp;
              <a href="${chapterUrl(passage)}" style="color: #065f46; font-weight: bold; text-decoration: none;">Chapter</a>
            </p>
          </div>
          <p style="text-align: center; color: #64748b; font-size: 13px; line-height: 1.6;">
            Cross Heart Pray · 7 Card Bible Bingo
          </p>
        </div>
      </div>
    `;
  }

  function wordStudiesForPassage(passage: Passage) {
    return wordStudiesByPassage[wordStudyLookupKey(passage)] ?? [];
  }

  useEffect(() => {
    let cancelled = false;

    async function loadWordStudies() {
      const uniquePassages = new Map(
        path.map(({ passage }) => [wordStudyLookupKey(passage), passage]),
      );

      const entries = await Promise.all(
        [...uniquePassages.entries()].map(async ([key, passage]) => {
          try {
            const response = await fetch(buildDeepDiveWordStudiesUrl(passage));

            if (!response.ok) {
              return [key, []] as const;
            }

            const data = await response.json();

            return [
              key,
              Array.isArray(data.wordStudies) ? data.wordStudies : [],
            ] as const;
          } catch {
            return [key, []] as const;
          }
        }),
      );

      if (!cancelled) {
        setWordStudiesByPassage((current) => ({
          ...current,
          ...Object.fromEntries(entries),
        }));
      }
    }

    loadWordStudies();

    return () => {
      cancelled = true;
    };
  }, [path]);

  function revealBibleBingoCards(nextPath: typeof path, cardIndexes: number[]) {
    const delays = sections.map(() => 0);

    cardIndexes.forEach((cardIndex, dealIndex) => {
      delays[cardIndex] = dealIndex * 105;
    });

    setSpinDelays(delays);

    setSpinVersions((current) =>
      current.map((version, index) => (cardIndexes.includes(index) ? version + 1 : version)),
    );

    setSpinningCards((current) =>
      current.map((isSpinning, index) => (cardIndexes.includes(index) ? true : isSpinning)),
    );

    cardIndexes.forEach((cardIndex, dealIndex) => {
      const dealDelay = dealIndex * 105;

      window.setTimeout(() => {
        setPath((currentPath) =>
          currentPath.map((item, itemIndex) =>
            itemIndex === cardIndex ? nextPath[itemIndex] ?? item : item,
          ),
        );
      }, dealDelay + 430);

      window.setTimeout(() => {
        setSpinningCards((current) =>
          current.map((isSpinning, index) => (index === cardIndex ? false : isSpinning)),
        );
      }, dealDelay + 980);
    });
  }

  function spinAll() {
    revealBibleBingoCards(
      buildPath(),
      sections.map((_, index) => index),
    );
  }


  function revealDailyBoardOnOpen() {
    revealBibleBingoCards(
      path,
      sections.map((_, index) => index),
    );
  }

  function spinOne(index: number) {
    const freshPath = buildPath();
    const nextPath = path.map((item, itemIndex) =>
      itemIndex === index
        ? {
            ...item,
            passage: freshPath[itemIndex]?.passage ?? item.passage,
          }
        : item,
    );

    revealBibleBingoCards(nextPath, [index]);
  }


  function focusDayCard(index: number) {
    setFocusedFlipVersion((version) => version + 1);
    setFocusedCardIndex(index);
    setFocusedMoreSection(null);
  }

  async function openWordStudy(
    _section: Section,
    passage: Passage,
    selectedWordStudy?: VerifiedWordStudy,
  ) {
    // A specific word was clicked — data is already loaded.
    if (selectedWordStudy) {
      setActiveWordStudy({ passage, wordStudy: selectedWordStudy });
      return;
    }

    const key = wordStudyLookupKey(passage);
    let studies: VerifiedWordStudy[] | undefined = wordStudiesByPassage[key];

    // Deep Dive tapped before the background load resolved — fetch on demand so
    // the button always responds instead of silently doing nothing.
    if (studies === undefined) {
      setLoadingStudyKey(key);
      try {
        const response = await fetch(buildDeepDiveWordStudiesUrl(passage));
        const data = response.ok ? await response.json() : null;
        studies = Array.isArray(data?.wordStudies) ? data.wordStudies : [];
      } catch {
        studies = [];
      }
      const loaded = studies ?? [];
      setWordStudiesByPassage((current) => ({ ...current, [key]: loaded }));
      setLoadingStudyKey((prev) => (prev === key ? null : prev));
    }

    const wordStudy = getDefaultWordStudy(studies ?? []);
    if (!wordStudy) {
      return;
    }

    setActiveWordStudy({ passage, wordStudy });
  }

  useEffect(() => {
    function refreshBingoReadingPlanDone() {
      setBingoReadingPlanDone(loadBingoReadingPlanDone());
    }

    refreshBingoReadingPlanDone();
    window.addEventListener("focus", refreshBingoReadingPlanDone);
    window.addEventListener("storage", refreshBingoReadingPlanDone);
    document.addEventListener("visibilitychange", refreshBingoReadingPlanDone);

    return () => {
      window.removeEventListener("focus", refreshBingoReadingPlanDone);
      window.removeEventListener("storage", refreshBingoReadingPlanDone);
      document.removeEventListener("visibilitychange", refreshBingoReadingPlanDone);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      revealDailyBoardOnOpen();
    }, 250);

    return () => window.clearTimeout(timer);
  }, []);

  const focusedIndex = path[focusedCardIndex] ? focusedCardIndex : 0;
  const focusedCard = path[focusedIndex] ?? path[0];
  const focusedTitle = focusedCard ? splitBibleBingoSectionTitle(focusedCard.section.title) : null;
  const focusedReadInPlan = focusedCard
    ? isBingoReadingPlanDone(bingoReadingPlanDone, focusedCard.passage.code, focusedCard.passage.chapter)
    : false;
  const focusedPrinciples = focusedCard
    ? getGeneGetzPrinciplesForVerse(
        focusedCard.passage.code,
        focusedCard.passage.chapter,
        focusedCard.passage.verse,
      )
    : [];
  const focusedBookLinks = focusedCard
    ? bibleBingoBookLinksForSection(focusedCard.section.title)
    : [];

  useEffect(() => {
    if (!focusedCardRef.current) return;

    if (!hasFocusedCardMountedRef.current) {
      hasFocusedCardMountedRef.current = true;
      return;
    }

    const handle = window.setTimeout(() => {
      focusedCardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);

    return () => window.clearTimeout(handle);
  }, [focusedCardIndex]);
  const todayStartIndex = centralDayIndex();
  const displayIndexes = displayIndexesStartingWith(todayStartIndex);

  return (
    <main className="chp-daily-hope-print-root chp-lively-dark-page min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <SiteHeader className="mb-10 sm:mb-12" />

        <PageNucleusHero
          title="Bible Bingo 7"
          subhead="Deal 7 cards. See where they land. Read and fill the 52-week board."
        >
<div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={spinAll}
              className="text-center justify-center items-center inline-flex rounded-full border border-white/15 bg-white/10 px-7 py-3 font-semibold text-slate-100 transition hover:bg-white/15"
            >Deal 7</button>

            <BibleBingoShareMenu
              boardHref={boardPath}
              boardUrl={boardUrl}
              shareText={boardShareText}
              emailSubject={boardShareSubject}
              htmlEmail={boardHtmlEmail}
              buttonLabel="Share"
              enableSignature
            />

            <a
              href="/bible-reading-plan"
              className="text-center justify-center items-center inline-flex rounded-full border border-emerald-200/25 bg-emerald-300/10 px-7 py-3 font-semibold text-emerald-100 transition hover:bg-emerald-300/15"
            >
              Bible Reading Plan
            </a>
          </div>
        </PageNucleusHero>


        <section className="mt-4">
          <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/10 bg-white/[0.035] px-4 py-6 shadow-2xl shadow-black/25 sm:px-6 sm:py-8">
            <p className="text-center text-xs font-black uppercase tracking-[0.22em] text-slate-400">
              Choose a day card
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-7">
              {displayIndexes.map((cardIndex) => {
                const item = path[cardIndex];

                if (!item) {
                  return null;
                }

                const { section, passage } = item;
                const index = cardIndex;
                const isFocused = index === focusedIndex;
                const cardTitle = splitBibleBingoSectionTitle(section.title);
                const readInPlan = isBingoReadingPlanDone(bingoReadingPlanDone, passage.code, passage.chapter);
                const hasLifeEssentials =
                  getGeneGetzPrinciplesForVerse(passage.code, passage.chapter, passage.verse).length > 0;

                return (
                  <button
                    type="button"
                    key={`${section.title}-${passage.label}-${index}`}
                    onClick={() => focusDayCard(index)}
                    aria-pressed={isFocused}
                    aria-busy={spinningCards[index]}
                    className={`relative bible-bingo-deck-card flex min-h-[124px] min-w-[10.5rem] snap-start flex-col overflow-visible rounded-[1.15rem] border p-3 text-center shadow-xl transition duration-200 sm:min-h-[235px] sm:min-w-0 sm:rounded-[1.5rem] sm:p-4 sm:hover:-translate-y-1 ${cardTone(index)} ${spinVersions[index] > 0 ? "bible-card-spin" : ""} ${spinningCards[index] ? "bible-card-is-spinning" : ""} ${
                      isFocused
                        ? "border-white/50 bg-white/15 ring-2 ring-white/25"
                        : "border-white/10 opacity-90 hover:opacity-100"
                    }`}
                    style={{
                      animationDelay: spinningCards[index] ? `${spinDelays[index]}ms` : "0ms",
                    }}
                  >
                    {hasLifeEssentials ? (
                      <span
                        aria-hidden
                        title="Has a Dr. Gene Getz Life Essentials video"
                        className="pointer-events-none absolute right-1.5 top-1.5 text-sm leading-none opacity-90 drop-shadow"
                      >
                        🎬
                      </span>
                    ) : null}

                    <div className="flex justify-center gap-2 text-lg" aria-hidden="true">
                      <span>✝️</span>
                      <span>❤️</span>
                      <span>🙏</span>
                    </div>

                    <p className="mt-3 text-[0.72rem] font-black uppercase tracking-[0.24em] text-emerald-100">
                      {cardTitle.dayLabel}
                    </p>

                    <div className="mt-3 text-3xl">{section.emoji}</div>

                    <h2 className="mt-2 text-base font-black leading-5 text-white">
                      {cardTitle.title}
                    </h2>

                    <div className="mt-3 rounded-2xl border border-white/10 bg-black/25 px-3 py-3 text-left">
                      <p className="text-xs font-black leading-5 text-white">
                        {chpBingoVerseOnlyLabel(passage.label)}
                      </p>
                      {readInPlan ? (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                          <span className="inline-flex items-center whitespace-nowrap rounded-full border border-emerald-200/25 bg-emerald-300/12 px-1.5 py-0.5 text-[0.5rem] font-black uppercase tracking-[0.03em] text-emerald-50">
                            Read
                          </span>
                        </div>
                      ) : null}
                      <p className="hidden sm:block bible-card-verse-preview mt-2 text-[0.72rem] font-semibold leading-5 text-slate-100/90">
                        {passage.text}
                      </p>
                    </div>

                  </button>
                );
              })}
            </div>
          </div>

          {focusedCard ? (
            <article
              id={`card-${focusedIndex + 1}`}
              ref={focusedCardRef}
              key={`${focusedCard.section.title}-${spinVersions[focusedIndex]}-${focusedFlipVersion}`}
              className={`relative bible-bingo-focused-card bible-card-focus-flip bible-bingo-focus-arrive mx-auto mt-4 max-w-3xl overflow-visible rounded-[1.35rem] border p-4 text-center text-slate-100 shadow-2xl shadow-black/30 sm:mt-6 sm:rounded-[2rem] sm:p-8 ${cardTone(focusedIndex)} ${spinVersions[focusedIndex] > 0 ? "bible-card-spin" : ""} ${spinningCards[focusedIndex] ? "bible-card-is-spinning" : ""}`}
              style={{
                minHeight: "430px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                animationDelay: spinningCards[focusedIndex] ? `${spinDelays[focusedIndex]}ms` : "0ms",
              }}
            >
              <div className="mb-4 flex w-full items-center justify-center gap-2 sm:justify-end">
                <CardInfoLegend />
                <BibleBingoShareMenu
                  boardHref={`${boardPath}?card=${focusedIndex + 1}`}
                  boardUrl={`${boardUrl}?card=${focusedIndex + 1}`}
                  shareText={[
                    `I dealt this ${focusedCard.section.title} Bible Bingo card on Cross Heart Pray.`,
                    "",
                    focusedCard.passage.label,
                    focusedCard.passage.text,
                    "",
                    "Open this card:",
                    `${boardUrl}?card=${focusedIndex + 1}`,
                    "",
                    "Open in the Holy Bible app:",
                    verseUrl(focusedCard.passage),
                    "",
                    "Read the chapter:",
                    chapterUrl(focusedCard.passage),
                  ].join("\n")}
                  emailSubject={`${focusedCard.passage.label} Bible Bingo card`}
                  htmlEmail={cardHtmlEmail(focusedCard.section, focusedCard.passage, focusedIndex)}
                  align="right"
                  itemLabel="card"
                  buttonLabel="Share"
                  enableSignature
                  iconOnly
                  instagramContent={{
                    eyebrow: "Bible Bingo 7",
                    title: focusedCard.passage.label,
                    body: focusedCard.passage.text,
                    tagline:
                      "Context matters. One verse is the doorway. Read the chapter.",
                    footer: "crossheartpray.com",
                    fileBase: `bible-bingo-${focusedCard.passage.label}`,
                  }}
                />
              </div>

              <div className="flex justify-center gap-4 text-3xl" aria-hidden="true">
                <span>✝️</span>
                <span>❤️</span>
                <span>🙏</span>
              </div>

              <div className="hidden sm:mt-5 sm:block sm:text-5xl">{focusedCard.section.emoji}</div>

              <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-slate-300">
                Card {focusedIndex + 1} · <span className="text-emerald-100">{focusedTitle?.dayLabel}</span>
              </p>

              {focusedReadInPlan ? (
                <p className="mt-3 rounded-full border border-emerald-200/30 bg-emerald-300/15 px-4 py-1 text-xs font-black uppercase tracking-[0.16em] text-emerald-50">
                  Read in Plan
                </p>
              ) : null}

              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                {focusedTitle?.title ?? focusedCard.section.title}
              </h2>

              <p className="mt-4 text-2xl font-black text-white">
                {chpBingoVerseOnlyLabel(focusedCard.passage.label)}
              </p>

              <div className="mt-5 w-full rounded-[1.5rem] border border-white/10 bg-black/25 px-5 py-5 text-lg font-bold leading-8 text-slate-100 sm:text-xl sm:leading-9">
                <VerifiedVerseText
                  passage={focusedCard.passage}
                  wordStudies={wordStudiesForPassage(focusedCard.passage)}
                  onWordClick={(wordStudy) => openWordStudy(focusedCard.section, focusedCard.passage, wordStudy)}
                />
              </div>

              <div className="mt-auto flex flex-col gap-2 pt-6 sm:flex-row sm:flex-wrap sm:justify-center">
                <CardReadMenu
                  verseHref={verseUrl(focusedCard.passage)}
                  chapterHref={chapterUrl(focusedCard.passage)}
                  readingPlanHref={bibleReadingPlanHrefForReference(focusedCard.passage.code, focusedCard.passage.chapter)}
                />

                <button
                  type="button"
                  onClick={() => openWordStudy(focusedCard.section, focusedCard.passage)}
                  title={
                    hasVerifiedWordLinks(wordStudiesForPassage(focusedCard.passage))
                      ? "Open verified original-language word study"
                      : "Deep Dive opens when this verse has verified underlined word links."
                  }
                  className="text-center justify-center items-center inline-flex rounded-full border border-emerald-200/20 bg-emerald-300/10 px-5 py-2 text-sm font-semibold text-emerald-100 shadow-sm transition hover:bg-emerald-300/15 disabled:cursor-not-allowed disabled:border-zinc-700/70 disabled:bg-zinc-800/70 disabled:text-zinc-500 disabled:shadow-none disabled:hover:bg-zinc-800/70"
                >
                  {loadingStudyKey === wordStudyLookupKey(focusedCard.passage)
                    ? "Deep Dive…"
                    : "Deep Dive"}
                </button>
              </div>

              <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row sm:flex-wrap">
                {focusedPrinciples.length ? (
                  <button
                    type="button"
                    onClick={() =>
                      setFocusedMoreSection((section) => (section === "life" ? null : "life"))
                    }
                    aria-expanded={focusedMoreSection === "life"}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-black text-slate-200 shadow-sm transition hover:bg-white/10"
                  >
                    More Life Essentials
                    <span
                      aria-hidden
                      className={`text-xs transition-transform duration-200 ${focusedMoreSection === "life" ? "rotate-180" : ""}`}
                    >
                      ▾
                    </span>
                  </button>
                ) : null}

                {focusedBookLinks.length ? (
                  <button
                    type="button"
                    onClick={() =>
                      setFocusedMoreSection((section) => (section === "books" ? null : "books"))
                    }
                    aria-expanded={focusedMoreSection === "books"}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-black text-slate-200 shadow-sm transition hover:bg-white/10"
                  >
                    Books in this Lane
                    <span
                      aria-hidden
                      className={`text-xs transition-transform duration-200 ${focusedMoreSection === "books" ? "rotate-180" : ""}`}
                    >
                      ▾
                    </span>
                  </button>
                ) : null}
              </div>

              {/* Dealing again is the fun last resort — easy to find, never the hero. */}
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => spinOne(focusedIndex)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-slate-400 transition hover:border-yellow-200/40 hover:bg-yellow-200/10 hover:text-yellow-100"
                >
                  🎲 Deal a new card
                </button>
              </div>

              {focusedMoreSection === "life" ? (
                <div className="w-full text-left">
                  <GeneGetzResourceCard principles={focusedPrinciples} />
                </div>
              ) : null}

              {focusedMoreSection === "books" ? (
                <div className="bible-bingo-focused-lane-books mt-5 w-full rounded-[1.35rem] border border-white/10 bg-black/15 px-4 py-4 text-center sm:rounded-[2rem] sm:px-5 sm:py-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-100">
                    Books in this lane
                  </p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-slate-300">
                    {focusedCard.section.line}
                  </p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {focusedBookLinks.map((book) => (
                      <a
                        key={book.label}
                        href={book.href}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-slate-100 transition hover:border-emerald-200/60 hover:bg-emerald-200/10"
                      >
                        {book.label}
                      </a>
                    ))}
                  </div>
                  <p className="bible-bingo-focused-lane-position-footnote mt-3 text-xs font-semibold leading-5 text-slate-400">
                    {bibleBingoLaneVerseLabel(focusedCard)}
                  </p>
                </div>
              ) : null}

            </article>
          ) : null}
        </section>

        {activeWordStudy && (
          <OriginalWordStudyModal
            passage={activeWordStudy.passage}
            wordStudy={activeWordStudy.wordStudy}
            wordStudies={wordStudiesForPassage(activeWordStudy.passage)}
            verseUrl={verseUrl(activeWordStudy.passage)}
            onClose={() => setActiveWordStudy(null)}
          />
        )}

        <LazyBibleVerseLookup className="mt-8" initialReference="Romans 15:7" />

        <section className="mt-16 border-t border-white/10 px-4 pt-14 pb-8 text-center">
          <h2 className="text-xl font-bold text-white">How it works</h2>
          <p className="mx-auto mt-3 max-w-3xl text-sm leading-7 text-slate-400">
            Every board opens a fresh path through the Bible. Verse opens the exact
            verse. Chapter opens the full chapter. Deep Dive opens when verified
            Hebrew or Greek word details are available.
          </p>
        </section>
</div>

      <style>{`
        @keyframes bible-card-axis-spin {
          0% {
            opacity: 1;
            transform: perspective(1000px) translate3d(-36px, -54px, 0) rotateY(-10deg) rotateZ(-5.5deg) scale(0.93);
          }

          18% {
            transform: perspective(1000px) translate3d(-16px, -25px, 0) rotateY(38deg) rotateZ(-2.4deg) scale(0.985);
          }

          42% {
            transform: perspective(1000px) translate3d(10px, 5px, 0) rotateY(104deg) rotateZ(1.6deg) scale(1.012);
          }

          60% {
            transform: perspective(1000px) translate3d(-7px, -3px, 0) rotateY(238deg) rotateZ(-1.1deg) scale(0.992);
          }

          82% {
            transform: perspective(1000px) translate3d(4px, -5px, 0) rotateY(335deg) rotateZ(0.7deg) scale(1.01);
          }

          100% {
            opacity: 1;
            transform: perspective(1000px) translate3d(0, 0, 0) rotateY(360deg) rotateZ(0deg) scale(1);
          }
        }

        @keyframes bible-card-back-face {
          0% {
            opacity: 0;
            transform: scale(0.985);
          }

          14% {
            opacity: 0.94;
            transform: scale(1);
          }

          76% {
            opacity: 0.94;
            transform: scale(1);
          }

          94% {
            opacity: 0;
            transform: scale(1.015);
          }

          100% {
            opacity: 0;
            transform: scale(1.015);
          }
        }

        @keyframes bible-card-soft-sheen {
          0% {
            opacity: 0;
            transform: translateX(-135%) rotate(12deg);
          }

          28% {
            opacity: 0.32;
          }

          100% {
            opacity: 0;
            transform: translateX(135%) rotate(12deg);
          }
        }

        .bible-card-spin {
          animation-name: bible-card-axis-spin;
          animation-duration: 980ms;
          animation-timing-function: cubic-bezier(0.16, 0.86, 0.24, 1.08);
          animation-fill-mode: both;
          transform-origin: center;
          transform-style: preserve-3d;
          backface-visibility: hidden;
          will-change: transform, opacity;
        }

        .bible-card-is-spinning {
          box-shadow:
            0 0 0 1px rgb(255 255 255 / 0.08),
            0 20px 50px rgb(16 185 129 / 0.16);
        }

        .bible-card-is-spinning::before {
          content: "✝️  ❤️  🙏";
          position: absolute;
          inset: 0;
          z-index: 18;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 1.5rem;
          border: 1px solid rgb(255 255 255 / 0.14);
          background:
            radial-gradient(circle at 20% 18%, rgb(255 255 255 / 0.14), transparent 31%),
            radial-gradient(circle at 78% 24%, rgb(52 211 153 / 0.16), transparent 34%),
            repeating-linear-gradient(
              135deg,
              rgb(255 255 255 / 0.035) 0,
              rgb(255 255 255 / 0.035) 8px,
              transparent 8px,
              transparent 18px
            ),
            linear-gradient(135deg, rgb(15 23 42 / 0.98), rgb(6 78 59 / 0.95), rgb(30 41 59 / 0.98));
          color: rgb(240 253 250);
          font-size: 2.15rem;
          letter-spacing: 0.28rem;
          pointer-events: none;
          animation-name: bible-card-back-face;
          animation-duration: 980ms;
          animation-timing-function: ease-in-out;
          animation-fill-mode: both;
          animation-delay: inherit;
        }

        .bible-card-is-spinning::after {
          content: "";
          position: absolute;
          top: -20%;
          bottom: -20%;
          left: 0;
          z-index: 19;
          width: 34%;
          background: linear-gradient(
            90deg,
            transparent,
            rgb(255 255 255 / 0.16),
            transparent
          );
          pointer-events: none;
          animation-name: bible-card-soft-sheen;
          animation-duration: 720ms;
          animation-timing-function: ease-in-out;
          animation-fill-mode: both;
          animation-delay: inherit;
        }


        @keyframes bible-focus-card-flip {
          0% {
            opacity: 0;
            transform: perspective(1100px) rotateY(-78deg) translateY(12px) scale(0.96);
            filter: blur(5px);
          }

          45% {
            opacity: 1;
            transform: perspective(1100px) rotateY(8deg) translateY(0) scale(1.01);
            filter: blur(0);
          }

          100% {
            opacity: 1;
            transform: perspective(1100px) rotateY(0deg) translateY(0) scale(1);
            filter: blur(0);
          }
        }

        @keyframes bible-focus-card-symbols {
          0% {
            opacity: 0;
            transform: scale(0.86) translateY(10px);
          }

          35% {
            opacity: 0.95;
            transform: scale(1.04) translateY(0);
          }

          100% {
            opacity: 0;
            transform: scale(1.12) translateY(-10px);
          }
        }

        .bible-card-focus-flip {
          transform-style: preserve-3d;
          animation: bible-focus-card-flip 620ms ease-out both;
        }

        .bible-card-focus-flip::before {
          content: "✝️  ❤️  🙏";
          position: absolute;
          inset: 0;
          z-index: 8;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at center, rgb(15 23 42 / 0.76), rgb(15 23 42 / 0));
          font-size: clamp(2.4rem, 9vw, 5.25rem);
          letter-spacing: 0.22em;
          pointer-events: none;
          animation: bible-focus-card-symbols 620ms ease-out both;
        }

        .bible-card-focus-flip > * {
          position: relative;
          z-index: 1;
        }

        .bible-card-verse-preview {
          display: -webkit-box;
          -webkit-line-clamp: 5;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .bible-bingo-deck-card.bible-card-is-spinning::before,
        .bible-bingo-focused-card.bible-card-is-spinning::before {
          content: "✝️  ❤️  🙏\\A Cross Heart Pray";
          white-space: pre-line;
          flex-direction: column;
          gap: 0.65rem;
          font-family: Georgia, "Times New Roman", serif;
          font-weight: 900;
          line-height: 1.25;
          text-align: center;
        }

        .bible-bingo-deck-card.bible-card-is-spinning::before {
          font-size: 1.2rem;
          letter-spacing: 0.08rem;
        }

        .bible-bingo-focused-card.bible-card-is-spinning::before {
          font-size: 2.35rem;
          letter-spacing: 0.14rem;
        }

        @media (prefers-reduced-motion: reduce) {
          .bible-card-spin,
          .bible-card-is-spinning::before,
          .bible-card-is-spinning::after {
            animation: none;
          }
        }
      `}</style>
          <SiteFooter />
    </main>
  );
}
