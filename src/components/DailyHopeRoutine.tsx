"use client";

import SiteFooter from "./SiteFooter";


import SiteHeader from "./SiteHeader";

import { useEffect, useMemo, useState } from "react";
import BibleBingoShareMenu from "./BibleBingoShareMenu";
import CardInfoLegend from "./CardInfoLegend";
import CardMore from "./CardMore";
import CardReadMenu from "./CardReadMenu";
import CentralTimeBadge from "./CentralTimeBadge";
import { bibleReadingPlanHrefForReference } from "../lib/bibleReadingPlan";
import OriginalWordStudyModal from "./OriginalWordStudyModal";
import VerifiedVerseText from "./VerifiedVerseText";
import GeneGetzResourceCard from "./GeneGetzResourceCard";
import { getGeneGetzPrinciplesForVerse } from "../lib/geneGetzLifeEssentials";
import {
  buildDeepDiveWordStudiesUrl,
  getDefaultWordStudy,
  hasVerifiedWordStudies,
  type VerifiedWordStudy,
  wordStudyLookupKey,
} from "../lib/originalLanguageWordStudy";
import type {
  DailyHopeDay,
  DailyHopePassageItem,
  DailyHopePrayerCard,
} from "../lib/dailyHopeRoutine";

type DailyHopeRoutineProps = {
  openingPrayers: DailyHopePrayerCard[];
  closingPrayer: DailyHopePrayerCard;
  days: DailyHopeDay[];
  missingReferences: string[];
};

type DailyHopePassage = DailyHopePassageItem["passages"][number];

type ActiveWordStudy = {
  passage: DailyHopePassage;
  wordStudy: VerifiedWordStudy;
};

const DAY_SLUGS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const DAY_SHORT_LABELS: Record<string, string> = {
  sunday: "S",
  monday: "M",
  tuesday: "T",
  wednesday: "W",
  thursday: "T",
  friday: "F",
  saturday: "S",
};

const CARD_TONES = [
  "border-slate-200/10 bg-slate-900/45",
  "border-emerald-200/12 bg-emerald-950/25",
  "border-sky-200/10 bg-sky-950/20",
  "border-teal-200/10 bg-teal-950/20",
  "border-indigo-200/10 bg-indigo-950/18",
  "border-cyan-200/10 bg-cyan-950/18",
  "border-zinc-200/10 bg-zinc-900/35",
];

function cardTone(index: number) {
  return CARD_TONES[index % CARD_TONES.length];
}

const DAILY_HOPE_OPEN_ICONS = ["🕊️", "✝️", "⚓", "🌅", "🛡️", "🌿", "🔥", "💧"];

const DAILY_HOPE_LITERAL_WORDS = [
  "hope",
  "faith",
  "love",
  "comfort",
  "courage",
  "strength",
  "trust",
  "believe",
  "wait",
  "joy",
  "peace",
  "mercy",
  "grace",
  "salvation",
  "endurance",
  "patiently",
  "fear",
  "heart",
];

function prayerOpenIcon(title: string) {
  const lower = title.toLowerCase();

  if (lower.includes("sinner")) return "🕊️";
  if (lower.includes("salvation")) return "✝️";
  if (lower.includes("moment")) return "🌅";

  return "🙏";
}

function prayerLiteralCue(title: string) {
  const lower = title.toLowerCase();

  if (lower.includes("sinner")) return "Confess sin. Ask forgiveness.";
  if (lower.includes("salvation")) return "Receive Jesus as Lord and Savior.";
  if (lower.includes("moment")) return "Live this day. Keep a heavenly perspective.";

  return "Pray.";
}

function literalWordsForItem(item: DailyHopePassageItem) {
  const text = textForItem(item).toLowerCase();
  const words = DAILY_HOPE_LITERAL_WORDS.filter((word) => {
    const pattern = new RegExp(`\\b${word}\\b`, "i");
    return pattern.test(text);
  });

  return words.length ? words.slice(0, 4) : ["Scripture"];
}

function dayReferencePreview(day: DailyHopeDay) {
  return day.items.map((item) => item.label).join(" · ");
}

function dayLiteralPreview(day: DailyHopeDay) {
  const words = day.items.flatMap((item) => literalWordsForItem(item));
  const unique = [...new Set(words)].filter((word) => word !== "Scripture").slice(0, 5);

  return unique.length ? `Words in verses: ${unique.join(" · ")}` : "Open the fixed hope verses.";
}

function verseUrl(passage: DailyHopePassage) {
  return `https://www.bible.com/bible/206/${passage.code}.${passage.chapter}.${passage.verse}.WEBUS`;
}

function chapterUrl(passage: DailyHopePassage) {
  return `https://www.bible.com/bible/206/${passage.code}.${passage.chapter}.WEBUS`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function textForItem(item: DailyHopePassageItem) {
  return item.passages
    .map((passage) => `${passage.label}\n${passage.text}`)
    .join("\n\n");
}

function htmlForPassages(item: DailyHopePassageItem) {
  return item.passages
    .map(
      (passage) => `
        <p style="margin: 14px 0 6px; font-weight: 800; color: #0f172a;">${escapeHtml(passage.label)}</p>
        <p style="margin: 0; color: #334155; line-height: 1.7;">${escapeHtml(passage.text)}</p>
      `,
    )
    .join("");
}


function dailyHopePassageFullLine(passage: any) {
  const label = typeof passage?.label === "string" ? passage.label : "";
  const text =
    typeof passage?.text === "string"
      ? passage.text
      : typeof passage?.verseText === "string"
        ? passage.verseText
        : "";

  return [label, text].filter(Boolean).join(" — ");
}

function dailyHopeItemFullShareText(item: any, cardUrl: string) {
  const title = typeof item?.title === "string" ? item.title : "Daily Hope Card";
  const cue = typeof item?.cue === "string" ? item.cue : "";
  const body =
    typeof item?.body === "string"
      ? item.body
      : typeof item?.text === "string"
        ? item.text
        : "";

  const passageLines = Array.isArray(item?.passages)
    ? item.passages.map((passage: any) => dailyHopePassageFullLine(passage)).filter(Boolean)
    : [];

  return [
    "Daily Hope Card",
    title,
    cue,
    "",
    body,
    "",
    ...passageLines,
    "",
    cardUrl,
  ].filter((line) => line !== undefined && line !== null).join("\n");
}

function dailyHopePrayerFullShareText(prayer: DailyHopePrayerCard, prayerUrl: string) {
  return ["Prayer Card", prayer.title, "", prayer.body, "", prayerUrl].join("\n");
}

function dailyHopeFullPageShareText(
  openingPrayers: DailyHopePrayerCard[],
  days: any[],
  closingPrayer: DailyHopePrayerCard,
  pageUrl: string,
) {
  const lines: string[] = ["Daily Hope", "Don’t just hope. Know.", "", "Opening Prayers"];

  openingPrayers.forEach((prayer) => {
    lines.push("", "Prayer Card", prayer.title, "", prayer.body);
  });

  lines.push("", "Fixed Hope Verses");

  days.forEach((day: any) => {
    lines.push("", day.day || "Daily Hope Day");

    if (Array.isArray(day.items)) {
      day.items.forEach((item: any) => {
        const title = typeof item?.title === "string" ? item.title : "Daily Hope Card";
        const cue = typeof item?.cue === "string" ? item.cue : "";
        const body =
          typeof item?.body === "string"
            ? item.body
            : typeof item?.text === "string"
              ? item.text
              : "";

        lines.push("", "Daily Hope Card", title);
        if (cue) lines.push(cue);
        if (body) lines.push("", body);

        if (Array.isArray(item?.passages)) {
          item.passages.forEach((passage: any) => {
            const passageLine = dailyHopePassageFullLine(passage);
            if (passageLine) lines.push(passageLine);
          });
        }
      });
    }
  });

  lines.push("", "Closing Prayer", closingPrayer.title, "", closingPrayer.body, "", pageUrl);

  return lines.join("\n");
}


function prayerShareText(prayer: DailyHopePrayerCard, pageUrl: string) {
  return [`Daily Hope`, prayer.title, "", prayer.body, "", pageUrl].join("\n");
}

function verseShareText(
  day: DailyHopeDay,
  item: DailyHopePassageItem,
  cardUrl: string,
) {
  return [
    `Daily Hope - ${day.day}`,
    item.label,
    "",
    textForItem(item),
    "",
    cardUrl,
  ].join("\n");
}

function dayShareText(day: DailyHopeDay, dayUrl: string) {
  return [
    `Daily Hope - ${day.day}`,
    "",
    ...day.items.flatMap((item) => [item.label, textForItem(item), ""]),
    dayUrl,
  ].join("\n");
}

function prayerHtmlEmail(prayer: DailyHopePrayerCard, pageUrl: string) {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; background: #f1f5f9; color: #0f172a; padding: 28px 12px;">
      <div style="max-width: 720px; margin: 0 auto;">
        <p style="font-size: 34px; text-align: center; margin: 0 0 14px;">✝️ ❤️ 🙏</p>
        <h1 style="font-family: Georgia, 'Times New Roman', serif; text-align: center; margin: 0; font-size: 30px; line-height: 1.15; color: #0f172a;">${escapeHtml(prayer.title)}</h1>
        <div style="border: 1px solid #dbe3ee; border-radius: 18px; padding: 22px; margin: 18px 0; background: #ffffff;">
          <p style="margin: 0; color: #334155; line-height: 1.8; font-size: 16px;">${escapeHtml(prayer.body)}</p>
        </div>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${pageUrl}" style="display: inline-block; background: #059669; color: #ffffff; padding: 13px 22px; border-radius: 999px; text-decoration: none; font-weight: 800; font-family: Arial, Helvetica, sans-serif; font-size: 15px;">
            Open Daily Hope
          </a>
        </p>
        <p style="text-align: center; color: #64748b; font-size: 13px;">Cross Heart Pray · Daily Hope</p>
      </div>
    </div>
  `;
}

function dayHtmlEmail(day: DailyHopeDay, dayUrl: string) {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; background: #f1f5f9; color: #0f172a; padding: 28px 12px;">
      <div style="max-width: 760px; margin: 0 auto;">
        <p style="font-size: 34px; text-align: center; margin: 0 0 14px;">✝️ ❤️ 🙏</p>
        <h1 style="font-family: Georgia, 'Times New Roman', serif; text-align: center; margin: 0; font-size: 34px; line-height: 1.15; color: #0f172a;">Daily Hope</h1>
        <p style="text-align: center; color: #047857; font-size: 13px; font-weight: 900; letter-spacing: 0.16em; text-transform: uppercase; margin: 12px 0 22px;">${escapeHtml(day.day)}</p>

        ${day.items
          .map(
            (item) => `
              <div style="border: 1px solid #dbe3ee; border-radius: 18px; padding: 22px; margin: 16px 0; background: #ffffff;">
                <h2 style="margin: 0 0 12px; font-size: 22px; color: #0f172a;">${escapeHtml(item.label)}</h2>
                ${htmlForPassages(item)}
              </div>
            `,
          )
          .join("")}

        <p style="text-align: center; margin: 24px 0;">
          <a href="${dayUrl}" style="display: inline-block; background: #059669; color: #ffffff; padding: 13px 22px; border-radius: 999px; text-decoration: none; font-weight: 800; font-family: Arial, Helvetica, sans-serif; font-size: 15px;">
            Open ${escapeHtml(day.day)} Daily Hope
          </a>
        </p>
        <p style="text-align: center; color: #64748b; font-size: 13px;">Cross Heart Pray · Daily Hope</p>
      </div>
    </div>
  `;
}

function boardHtmlEmail(
  openingPrayers: DailyHopePrayerCard[],
  closingPrayer: DailyHopePrayerCard,
  days: DailyHopeDay[],
  pageUrl: string,
) {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; background: #f1f5f9; color: #0f172a; padding: 28px 12px;">
      <div style="max-width: 760px; margin: 0 auto;">
        <p style="font-size: 34px; text-align: center; margin: 0 0 14px;">✝️ ❤️ 🙏</p>
        <h1 style="font-family: Georgia, 'Times New Roman', serif; text-align: center; margin: 0; font-size: 34px; line-height: 1.15; color: #0f172a;">Daily Hope</h1>
        <p style="text-align: center; color: #475569; font-size: 16px; line-height: 1.6; max-width: 560px; margin-left: auto; margin-right: auto;">
          Don’t just hope. Know.
        </p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${pageUrl}" style="display: inline-block; background: #059669; color: #ffffff; padding: 13px 22px; border-radius: 999px; text-decoration: none; font-weight: 800; font-family: Arial, Helvetica, sans-serif; font-size: 15px;">
            Open Daily Hope
          </a>
        </p>

        ${openingPrayers
          .map(
            (prayer) => `
              <div style="border: 1px solid #dbe3ee; border-radius: 18px; padding: 22px; margin: 16px 0; background: #ffffff;">
                <h2 style="margin: 0 0 12px; font-size: 21px; color: #0f172a;">${escapeHtml(prayer.title)}</h2>
                <p style="margin: 0; color: #334155; line-height: 1.8;">${escapeHtml(prayer.body)}</p>
              </div>
            `,
          )
          .join("")}

        ${days
          .map(
            (day) => `
              <h2 style="margin: 30px 0 10px; font-size: 24px; color: #0f172a;">${escapeHtml(day.day)}</h2>
              ${day.items
                .map(
                  (item) => `
                    <div style="border: 1px solid #dbe3ee; border-radius: 18px; padding: 22px; margin: 16px 0; background: #ffffff;">
                      <h3 style="margin: 0 0 12px; font-size: 20px; color: #0f172a;">${escapeHtml(item.label)}</h3>
                      ${htmlForPassages(item)}
                    </div>
                  `,
                )
                .join("")}
            `,
          )
          .join("")}

        <div style="border: 1px solid #dbe3ee; border-radius: 18px; padding: 22px; margin: 22px 0 16px; background: #ffffff;">
          <h2 style="margin: 0 0 12px; font-size: 21px; color: #0f172a;">${escapeHtml(closingPrayer.title)}</h2>
          <p style="margin: 0; color: #334155; line-height: 1.8;">${escapeHtml(closingPrayer.body)}</p>
        </div>

        <p style="text-align: center; color: #64748b; font-size: 13px;">Cross Heart Pray · Daily Hope</p>
      </div>
    </div>
  `;
}

export default function DailyHopeRoutine({
  openingPrayers,
  closingPrayer,
  days,
  missingReferences,
}: DailyHopeRoutineProps) {
  const [todaySlug, setTodaySlug] = useState("");
  const [activeDaySlug, setActiveDaySlug] = useState("");
  const [expandedPrayerIds, setExpandedPrayerIds] = useState<Record<string, boolean>>({});
  const [activeWordStudy, setActiveWordStudy] = useState<ActiveWordStudy | null>(null);
  const [wordStudiesByPassage, setWordStudiesByPassage] = useState<
    Record<string, VerifiedWordStudy[]>
  >({});

  const pagePath = "/daily-hope";
  const pageUrl = "https://crossheartpray.com/daily-hope";

  // The chosen day leads the deck (today by default); the rest follow in
  // week order. Picking a day reorders the cards — no scrolling.
  const pivotSlug =
    activeDaySlug && activeDaySlug !== "all-expanded" && activeDaySlug !== "all-minimized"
      ? activeDaySlug
      : todaySlug;
  const visibleDays = useMemo(() => {
    const idx = days.findIndex((d) => d.slug === pivotSlug);
    if (idx <= 0) return days;
    return [...days.slice(idx), ...days.slice(0, idx)];
  }, [days, pivotSlug]);

  const allPassages = useMemo(() => {
    const uniquePassages = new Map<string, DailyHopePassage>();

    for (const day of days) {
      for (const item of day.items) {
        for (const passage of item.passages) {
          uniquePassages.set(wordStudyLookupKey(passage), passage);
        }
      }
    }

    return [...uniquePassages.values()];
  }, [days]);

  const boardShareText = dailyHopeFullPageShareText(
    openingPrayers,
    days,
    closingPrayer,
    pageUrl,
  );

  const boardHtml = boardHtmlEmail(
    openingPrayers,
    closingPrayer,
    days,
    pageUrl,
  );

  const allDaysExpanded = activeDaySlug === "all-expanded";

  function wordStudiesForPassage(passage: DailyHopePassage) {
    return wordStudiesByPassage[wordStudyLookupKey(passage)] ?? [];
  }

  function openWordStudy(
    passage: DailyHopePassage,
    selectedWordStudy?: VerifiedWordStudy,
  ) {
    const wordStudy =
      selectedWordStudy ?? getDefaultWordStudy(wordStudiesForPassage(passage));

    if (!wordStudy) {
      return;
    }

    setActiveWordStudy({
      passage,
      wordStudy,
    });
  }

  function openWordStudyForItem(item: DailyHopePassageItem) {
    for (const passage of item.passages) {
      const wordStudy = getDefaultWordStudy(wordStudiesForPassage(passage));

      if (wordStudy) {
        openWordStudy(passage, wordStudy);
        return;
      }
    }
  }

  function itemHasVerifiedWordLinks(item: DailyHopePassageItem) {
    return item.passages.some((passage) =>
      hasVerifiedWordStudies(wordStudiesForPassage(passage)),
    );
  }

  function chooseDay(daySlug: string) {
    setActiveDaySlug(daySlug);
    window.history.replaceState(null, "", `#${daySlug}`);
  }

  function chooseToday() {
    if (!todaySlug) {
      return;
    }

    chooseDay(todaySlug);
  }

  function minimizeDays() {
    setActiveDaySlug("all-minimized");
    window.history.replaceState(null, "", pagePath);
  }

  function expandAllDays() {
    setActiveDaySlug("all-expanded");

    window.requestAnimationFrame(() => {
      document.getElementById("daily-hope-days")?.scrollIntoView({ block: "start" });
      window.history.replaceState(null, "", pagePath);
    });
  }

  function togglePrayer(prayerId: string) {
    setExpandedPrayerIds((current) => ({
      ...current,
      [prayerId]: !current[prayerId],
    }));
  }

  useEffect(() => {
    const currentDaySlug = DAY_SLUGS[new Date().getDay()] ?? "";
    const hashSlug = window.location.hash.replace("#", "");
    const initialDaySlug = days.some((day) => day.slug === hashSlug)
      ? hashSlug
      : currentDaySlug;

    setTodaySlug(currentDaySlug);
    setActiveDaySlug(initialDaySlug);
  }, [days]);

  useEffect(() => {
    let cancelled = false;

    async function loadWordStudies() {
      const entries = await Promise.all(
        allPassages.map(async (passage) => {
          const key = wordStudyLookupKey(passage);

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
        setWordStudiesByPassage(Object.fromEntries(entries));
      }
    }

    loadWordStudies();

    return () => {
      cancelled = true;
    };
  }, [allPassages]);

  return (
    <main className="chp-daily-hope-print-root chp-lively-dark-page min-h-screen bg-slate-950 text-slate-100">
      <style>{`@keyframes chpDealIn{0%{opacity:0;transform:translateY(-16px) rotate(-2.5deg) scale(.98)}55%{opacity:1;transform:translateY(3px) rotate(1deg)}100%{opacity:1;transform:none}}
.chp-deal{animation:chpDealIn .5s cubic-bezier(.2,.8,.3,1) both}
@media (prefers-reduced-motion: reduce){.chp-deal{animation:none}}`}</style>
      <section className="mx-auto max-w-6xl px-6 py-8">
        <SiteHeader className="mb-10 sm:mb-12" />
        <div className="text-center">
          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[0.62rem] font-black uppercase tracking-[0.18em] text-white sm:text-[0.66rem]">
            <span className="inline-flex items-center gap-1"><span className="text-xl tracking-normal">✝️</span> Cross</span>
            <span className="inline-flex items-center gap-1"><span className="text-xl tracking-normal">❤️</span> Heart</span>
            <span className="inline-flex items-center gap-1"><span className="text-xl tracking-normal">🙏</span> Pray</span>
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Daily Hope</h1>
          <p className="mt-1 text-sm font-bold text-emerald-100">A prayer and Scripture rhythm for the day.</p>
<CentralTimeBadge className="mt-3" />

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <div
              aria-label="Quick day view"
              className="flex flex-wrap items-center justify-center gap-1.5"
            >
              <button
                type="button"
                onClick={chooseToday}
                className="rounded-full border border-emerald-200/25 bg-emerald-300/10 px-3 py-1.5 text-[0.62rem] font-black uppercase tracking-[0.16em] text-emerald-50 transition hover:bg-emerald-300/18"
              >
                Today
              </button>

              {days.map((day) => {
                const isActive = activeDaySlug === day.slug;
                const isToday = todaySlug === day.slug;

                return (
                  <button
                    key={day.slug}
                    type="button"
                    onClick={() => chooseDay(day.slug)}
                    aria-label={day.day}
                    className={`h-8 w-8 rounded-full border text-xs font-black transition ${
                      isActive
                        ? "border-white/45 bg-white text-slate-950"
                        : isToday
                          ? "border-emerald-200/35 bg-emerald-300/10 text-emerald-50 hover:bg-emerald-300/18"
                          : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                    }`}
                  >
                    {DAY_SHORT_LABELS[day.slug] ?? day.day.slice(0, 1)}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={allDaysExpanded ? minimizeDays : expandAllDays}
              aria-expanded={allDaysExpanded}
              className="inline-flex h-8 items-center justify-center rounded-full border border-emerald-200/30 bg-emerald-300/15 px-3 text-[0.62rem] font-black uppercase tracking-[0.14em] text-emerald-50 shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-300/22"
            >
              {allDaysExpanded ? "Collapse all days" : "Expand all days"}
            </button>

            <BibleBingoShareMenu
              boardHref={pagePath}
              boardUrl={pageUrl}
              shareText={boardShareText}
              emailSubject="Daily Hope"
              htmlEmail={boardHtml}
            />
          </div>
        </div>

        {missingReferences.length > 0 ? (
          <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-yellow-200/30 bg-yellow-200/10 p-4 text-sm font-semibold leading-6 text-yellow-50">
            References to verify: {missingReferences.join(", ")}
          </div>
        ) : null}
        <section className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-5">
          {openingPrayers.map((prayer, index) => {
            const prayerId = `prayer-${index + 1}`;
            const prayerUrl = `${pageUrl}#${prayerId}`;
            const isPrayerExpanded = Boolean(expandedPrayerIds[prayerId]);
            const prayerIcon = prayerOpenIcon(prayer.title);
            const prayerCue = prayerLiteralCue(prayer.title);
            const prayerTone =
              index === 0
                ? "border-rose-200/18 bg-rose-950/22"
                : "border-emerald-200/18 bg-emerald-950/22";

            return (
              <article
                id={prayerId}
                key={prayer.title}
                style={{ animationDelay: `${index * 60}ms` }}
                className={`chp-deal relative overflow-visible border shadow-2xl shadow-black/20 ${prayerTone} ${
                  isPrayerExpanded ? "rounded-[2rem] p-6 sm:p-8" : "rounded-2xl p-3.5 sm:p-4"
                }`}
              >
                {!isPrayerExpanded ? (
                  <button
                    type="button"
                    onClick={() => togglePrayer(prayerId)}
                    aria-label={`Read ${prayer.title}`}
                    aria-expanded={false}
                    aria-controls={`${prayerId}-body`}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <span
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-lg"
                      aria-hidden="true"
                    >
                      {prayerIcon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-extrabold leading-6 text-slate-50">{prayer.title}</span>
                      <span className="block truncate text-xs font-bold text-slate-300">{prayerCue}</span>
                    </span>
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] text-xl font-black leading-none text-slate-300">
                      +
                    </span>
                  </button>
                ) : (
                <>
                <div className="absolute right-5 top-5">
                  <BibleBingoShareMenu
                    boardHref={`#${prayerId}`}
                    boardUrl={prayerUrl}
                    shareText={dailyHopePrayerFullShareText(prayer, prayerUrl)}
                    emailSubject={`Daily Hope - ${prayer.title}`}
                    align="right"
                    itemLabel="dailyHope"
                    buttonLabel="Share full Daily Hope"
                    iconOnly
                    instagramContent={{
                      eyebrow: "Daily Hope",
                      title: prayer.title,
                      body: prayer.body,
                      footer: "crossheartpray.com",
                      fileBase: `daily-hope-${prayer.title}`,
                    }}
                  />
                </div>

                <div className="flex items-start gap-4 pr-12">
                  <span
                    className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-2xl shadow-lg shadow-black/15"
                    aria-hidden="true"
                  >
                    {prayerIcon}
                  </span>

                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-100">
                      Prayer Card
                    </p>
                    <p className="mt-2 text-sm font-black leading-6 text-white">
                      {prayerCue}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 pr-12 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-2xl font-extrabold text-slate-50">
                    {prayer.title}
                  </h2>

                  <button
                    type="button"
                    onClick={() => togglePrayer(prayerId)}
                    aria-label={isPrayerExpanded ? `Hide ${prayer.title}` : `Read ${prayer.title}`}
                    aria-expanded={isPrayerExpanded}
                    aria-controls={`${prayerId}-body`}
                    className="inline-flex h-10 w-10 items-center justify-center self-start rounded-full border border-white/12 bg-white/[0.03] text-xl font-black leading-none text-slate-300 transition hover:border-emerald-200/30 hover:bg-emerald-300/10 hover:text-emerald-50 sm:self-auto"
                  >
                    {isPrayerExpanded ? "−" : "+"}
                  </button>
                </div>

                <p
                  id={`${prayerId}-body`}
                  className="mt-5 text-base font-medium leading-8 text-slate-300"
                >
                  {prayer.body}
                </p>
                </>
                )}
              </article>
            );
          })}
        </section>

        <section id="daily-hope-days" className="mt-12 scroll-mt-24 space-y-8">
          {visibleDays.map((day, dayIndex) => {
            const isToday = todaySlug === day.slug;
            const isActiveDay =
              allDaysExpanded || activeDaySlug === day.slug || (!activeDaySlug && isToday);
            const dayUrl = `${pageUrl}#${day.slug}`;

            return (
              <section
                id={day.slug}
                key={`${day.slug}-${pivotSlug}`}
                style={{ animationDelay: `${dayIndex * 80}ms` }}
                className={`chp-deal scroll-mt-24 rounded-[2rem] border p-5 shadow-2xl sm:p-7 ${
                  isToday
                    ? "border-emerald-200/35 bg-emerald-300/[0.08] shadow-emerald-950/25"
                    : "border-white/10 bg-white/[0.03] shadow-black/20"
                }`}
              >
                <div className="flex flex-col gap-4 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-100">
                      {isToday ? "Today" : "Daily Hope"}
                    </p>
                    <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">
                      {day.day}
                    </h2>
                  </div>

                  <div className="flex flex-col items-center gap-3 sm:items-end">
                    <button
                      type="button"
                      onClick={() => (isActiveDay ? minimizeDays() : chooseDay(day.slug))}
                      aria-label={isActiveDay ? `Minimize ${day.day}` : `Expand ${day.day}`}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-2xl font-black leading-none text-slate-200 transition hover:border-emerald-200/30 hover:bg-emerald-300/10 hover:text-emerald-50"
                    >
                      {isActiveDay ? "−" : "+"}
                    </button>
                  </div>
                </div>

                {!isActiveDay ? (
                  <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-200/20 bg-emerald-300/10 text-2xl"
                        aria-hidden="true"
                      >
                        {DAILY_HOPE_OPEN_ICONS[dayIndex % DAILY_HOPE_OPEN_ICONS.length]}
                      </span>

                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-100">
                          Open {day.day}
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-300">
                          {dayReferencePreview(day)}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-sm font-black leading-6 text-slate-100">
                      {dayLiteralPreview(day)}
                    </p>
                  </div>
                ) : null}

                {isActiveDay ? (
                  <div className="mt-6 grid grid-cols-1 gap-5">
                    {day.items.map((item, itemIndex) => {
                    const firstPassage = item.passages[0];
                    const verifiedReady = itemHasVerifiedWordLinks(item);
                    const cardUrl = `${pageUrl}#${item.id}`;
                    const globalCardIndex = dayIndex * 3 + itemIndex;
                    const literalWords = literalWordsForItem(item);

                    return (
                      <article
                        id={item.id}
                        key={item.id}
                        className={`relative overflow-visible rounded-[1.5rem] border p-5 text-center text-slate-100 shadow-lg shadow-black/15 sm:p-6 ${cardTone(globalCardIndex)}`}
                      >
                        <div className="absolute right-4 top-4 flex items-center gap-2">
                          <CardInfoLegend />
                  <BibleBingoShareMenu
                            boardHref={`#${item.id}`}
                            boardUrl={cardUrl}
                            shareText={dailyHopeItemFullShareText(item, cardUrl)}
                            emailSubject={`Daily Hope - ${day.day}`}
                    align="right"
                            itemLabel="dailyHope"
                            buttonLabel="Share full Daily Hope"
                            iconOnly
                            instagramContent={{
                              eyebrow: "Daily Hope",
                              title: firstPassage?.label ?? item.label,
                              body: firstPassage?.text ?? "",
                              tagline:
                                "Context matters. One verse is the doorway. Read the chapter.",
                              footer: "crossheartpray.com",
                              fileBase: `daily-hope-${firstPassage?.label ?? item.label}`,
                            }}
                          />
                        </div>

                        <div className="flex justify-center gap-3 text-xl" aria-hidden="true">
                          <span>✝️</span>
                          <span>❤️</span>
                          <span>🙏</span>
                        </div>

                        <p className="mt-4 text-xs font-black uppercase tracking-[0.22em] text-emerald-100">
                          Daily Hope Card
                        </p>

                        <div className="mt-3 flex flex-wrap justify-center gap-2">
                          {literalWords.map((word) => (
                            <span
                              key={word}
                              className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-100"
                            >
                              {word}
                            </span>
                          ))}
                        </div>

                        <h3 className="mt-3 pr-10 text-xl font-extrabold text-slate-50 sm:text-2xl">
                          {item.label}
                        </h3>

                        <div className="mt-5 space-y-5 rounded-[1.25rem] border border-white/8 bg-slate-950/35 px-5 py-5 text-left text-base font-medium leading-8 text-slate-200 sm:text-lg sm:leading-9">
                          {item.passages.map((passage) => (
                            <div key={passage.label}>
                              {item.passages.length > 1 ? (
                                <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-100/90">
                                  {passage.label}
                                </p>
                              ) : null}

                              <VerifiedVerseText
                                passage={passage}
                                wordStudies={wordStudiesForPassage(passage)}
                                onWordClick={(wordStudy) =>
                                  openWordStudy(passage, wordStudy)
                                }
                              />
                            </div>
                          ))}
                        </div>

                        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
                          {firstPassage ? (
                            <CardReadMenu
                              verseHref={verseUrl(firstPassage)}
                              chapterHref={chapterUrl(firstPassage)}
                              readingPlanHref={bibleReadingPlanHrefForReference(
                                firstPassage.code,
                                firstPassage.chapter,
                              )}
                            />
                          ) : null}

                          <button
                            type="button"
                            onClick={() => openWordStudyForItem(item)}
                            title={
                              verifiedReady
                                ? "Open verified original-language word study"
                                : "Deep Dive opens when this verse has verified underlined word links."
                            }
                            className="inline-flex items-center justify-center rounded-full border border-emerald-200/18 bg-emerald-300/8 px-5 py-2 text-sm font-semibold text-emerald-100 shadow-sm transition hover:bg-emerald-300/12 disabled:cursor-not-allowed disabled:border-zinc-700/70 disabled:bg-zinc-800/70 disabled:text-zinc-500 disabled:shadow-none disabled:hover:bg-zinc-800/70"
                          >
                            Deep Dive
                          </button>
                        </div>

                        {firstPassage
                          ? (() => {
                              const principles = getGeneGetzPrinciplesForVerse(
                                firstPassage.code,
                                firstPassage.chapter,
                                firstPassage.verse,
                              );

                              return principles.length ? (
                                <CardMore label="More Life Essentials" className="mt-5">
                                  <GeneGetzResourceCard principles={principles} />
                                </CardMore>
                              ) : null;
                            })()
                          : null}
                      </article>
                    );
                  })}
                  </div>
                ) : null}
              </section>
            );
          })}
        </section>

        <section className="mt-10">
          <article
            id="live-in-the-moment"
            className="relative mx-auto max-w-4xl overflow-visible rounded-[2rem] border border-emerald-200/18 bg-emerald-950/22 p-6 text-center shadow-xl shadow-black/20 sm:p-8"
          >
            <div className="absolute right-5 top-5">

                  <BibleBingoShareMenu
                boardHref="#live-in-the-moment"
                boardUrl={`${pageUrl}#live-in-the-moment`}
                shareText={dailyHopePrayerFullShareText(closingPrayer, `${pageUrl}#live-in-the-moment`)}
                emailSubject={`Daily Hope - ${closingPrayer.title}`}
                    align="right"
                itemLabel="dailyHope"
                buttonLabel="Share full Daily Hope"
                iconOnly
                instagramContent={{
                  eyebrow: "Daily Hope",
                  title: closingPrayer.title,
                  body: closingPrayer.body,
                  footer: "crossheartpray.com",
                  fileBase: `daily-hope-${closingPrayer.title}`,
                }}
              />
            </div>

            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-100">
              Closing Prayer Card
            </p>

            <h2 className="mt-4 pr-12 text-2xl font-black text-white sm:text-3xl">
              {closingPrayer.title}
            </h2>

            <p className="mx-auto mt-5 max-w-3xl text-base font-medium leading-8 text-slate-300">
              {closingPrayer.body}
            </p>
          </article>
        </section>
      </section>

      {activeWordStudy ? (
        <OriginalWordStudyModal
          passage={activeWordStudy.passage}
          wordStudy={activeWordStudy.wordStudy}
          wordStudies={wordStudiesForPassage(activeWordStudy.passage)}
          verseUrl={verseUrl(activeWordStudy.passage)}
          onClose={() => setActiveWordStudy(null)}
        />
      ) : null}
  <SiteFooter />
</main>
  );
}
