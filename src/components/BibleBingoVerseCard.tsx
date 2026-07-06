"use client";
import { useMemo, useState, type ReactNode } from "react";
import BibleBingoShareMenu from "./BibleBingoShareMenu";
import CardInfoLegend from "./CardInfoLegend";
import CardMore from "./CardMore";
import CardReadMenu from "./CardReadMenu";
import VerifiedVerseText from "./VerifiedVerseText";
import {
  hasVerifiedWordStudies,
  type VerifiedWordStudy,
} from "../lib/originalLanguageWordStudy";

export type BibleBingoCardPassage = {
  label: string;
  book: string;
  code: string;
  chapter: string;
  verse: string;
  text: string;
  group: string;
};

type BibleBingoVerseCardProps = {
  passage: BibleBingoCardPassage;
  wordStudies: VerifiedWordStudy[];
  isLoadingWordStudies: boolean;
  isSpinning: boolean;
  spinLabel: string;
  spinOdds?: string;
  note?: string;
  onSpinVerse: () => Promise<void> | void;
  onOpenDeepDive: () => void;
  onWordClick: (wordStudy: VerifiedWordStudy) => void;
  readingPlanHref?: string;
  /** Label for the expander button, e.g. "More Life Essentials". */
  moreLabel?: string;
  /** Extra content (Life Essentials, lane books…) revealed inside More. */
  children?: ReactNode;
};

function verseUrl(passage: BibleBingoCardPassage) {
  return `https://www.bible.com/bible/206/${passage.code}.${passage.chapter}.${passage.verse}.WEBUS`;
}

function chapterUrl(passage: BibleBingoCardPassage) {
  return `https://www.bible.com/bible/206/${passage.code}.${passage.chapter}.WEBUS`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const CONTEXT_TAGLINE = "Context matters. One verse is the doorway. Read the chapter.";

function shareTextFor(passage: BibleBingoCardPassage) {
  return [
    passage.label,
    passage.text,
    "",
    CONTEXT_TAGLINE,
    "",
    "Open in the Holy Bible app:",
    verseUrl(passage),
    "",
    "Read the chapter:",
    chapterUrl(passage),
  ].join("\n");
}

function cardHtmlEmailFor(passage: BibleBingoCardPassage) {
  const cardUrl = verseUrl(passage);
  const chapUrl = chapterUrl(passage);

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; background:#f1f5f9; color:#0f172a; padding:28px 12px;">
      <div style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #dbe3ee; border-radius:22px; padding:26px;">
        <p style="font-size:32px; text-align:center; margin:0 0 12px;">✝️ ❤️ 🙏</p>
        <p style="text-align:center; font-size:11px; line-height:1.4; letter-spacing:0.18em; text-transform:uppercase; color:#047857; font-weight:900; margin:0 0 10px;">Bible Bingo Card</p>
        <h1 style="font-family: Georgia, 'Times New Roman', serif; text-align:center; margin:0 0 16px; font-size:30px; line-height:1.15; color:#0f172a;">${escapeHtml(passage.label)}</h1>
        <p style="font-family: Georgia, 'Times New Roman', serif; color:#334155; line-height:1.7; font-size:18px; margin:0 0 18px;">${escapeHtml(passage.text)}</p>
        <p style="text-align:center; font-style:italic; color:#475569; font-size:14px; line-height:1.5; margin:0 0 22px;">${escapeHtml(CONTEXT_TAGLINE)}</p>
        <p style="text-align:center; margin:22px 0 10px;">
          <a href="${cardUrl}" style="display:inline-block; background:#047857; color:#ffffff; padding:13px 22px; border-radius:999px; text-decoration:none; font-weight:800; font-size:15px;">
            Open Verse
          </a>
        </p>
        <p style="text-align:center; margin:0 0 22px;">
          <a href="${chapUrl}" style="color:#047857; text-decoration:underline; font-weight:800; font-size:14px;">
            Read the chapter
          </a>
        </p>
        <p style="text-align:center; color:#64748b; font-size:13px;">Cross Heart Pray · Bible Bingo 7</p>
      </div>
    </div>
  `;
}

export default function BibleBingoVerseCard({
  passage,
  wordStudies,
  isLoadingWordStudies,
  isSpinning,
  spinLabel,
  spinOdds,
  note = "",
  onSpinVerse,
  onOpenDeepDive,
  onWordClick,
  readingPlanHref,
  moreLabel,
  children,
}: BibleBingoVerseCardProps) {
  const [isCardSpinning, setIsCardSpinning] = useState(false);

  const deepDiveReady = hasVerifiedWordStudies(wordStudies);
  const spinningNow = isSpinning || isCardSpinning;

  const shareLinks = useMemo(() => {
    return {
      verse: verseUrl(passage),
      chapter: chapterUrl(passage),
    };
  }, [passage]);

  async function spinCard() {
    if (spinningNow) {
      return;
    }

    setIsCardSpinning(true);

    const startedAt = performance.now();

    try {
      await onSpinVerse();
    } finally {
      const elapsed = performance.now() - startedAt;
      const remaining = Math.max(0, 760 - elapsed);

      window.setTimeout(() => {
        setIsCardSpinning(false);
      }, remaining);
    }
  }

  return (
    <>
      <article
        aria-busy={spinningNow}
        className={`relative mx-auto mt-7 max-w-3xl overflow-visible rounded-[2rem] border border-white/10 bg-gradient-to-br from-emerald-950/60 via-slate-950/90 to-rose-950/45 p-6 text-center shadow-2xl shadow-black/30 transition-transform duration-300 [transform-style:preserve-3d] sm:p-8 ${
          isCardSpinning ? "bible-bingo-bottom-card-spin" : ""
        }`}
      >
        <CardInfoLegend className="absolute right-4 top-4" />

        <div className="flex justify-center gap-4 text-2xl" aria-hidden="true">
          <span>✝️</span>
          <span>❤️</span>
          <span>🙏</span>
        </div>

        <p className="mt-4 text-xs font-black uppercase tracking-[0.24em] text-emerald-100">
          Bible Bingo Card
        </p>

        <h3 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
          {passage.label}
        </h3>

        <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-black/25 px-5 py-5 text-lg font-bold leading-8 text-slate-100 sm:text-xl sm:leading-9">
          <VerifiedVerseText
            passage={passage}
            wordStudies={wordStudies}
            onWordClick={onWordClick}
          />
        </div>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={spinCard}
            disabled={spinningNow}
            className="inline-flex items-center justify-center rounded-full border border-yellow-200/30 bg-yellow-200/15 px-5 py-2 text-sm font-black text-yellow-50 shadow-sm transition hover:bg-yellow-200/25 disabled:cursor-wait disabled:opacity-70"
          >
            {spinningNow ? "Shuffling..." : spinLabel}
          </button>

          <CardReadMenu
            verseHref={shareLinks.verse}
            chapterHref={shareLinks.chapter}
            readingPlanHref={readingPlanHref}
          />

          <button
            type="button"
            onClick={onOpenDeepDive}
            title={
              isLoadingWordStudies
                ? "Checking for verified original-language word links."
                : deepDiveReady
                  ? "Open verified original-language word study"
                  : "Deep Dive opens when this verse has verified underlined word links."
            }
            className="inline-flex items-center justify-center rounded-full border border-emerald-200/20 bg-emerald-300/10 px-5 py-2 text-sm font-black text-emerald-100 shadow-sm transition hover:bg-emerald-300/15 disabled:cursor-not-allowed disabled:border-zinc-700/70 disabled:bg-zinc-800/70 disabled:text-zinc-500 disabled:shadow-none disabled:hover:bg-zinc-800/70"
          >
            Deep Dive
          </button>

          <BibleBingoShareMenu
            boardHref={shareLinks.verse}
            boardUrl={shareLinks.verse}
            shareText={shareTextFor(passage)}
            emailSubject={`Bible Bingo 7 - ${passage.label}`}
            htmlEmail={cardHtmlEmailFor(passage)}
            align="right"
            itemLabel="card"
            buttonLabel="Share"
            enableSignature
            showOpenOption={false}
            instagramContent={{
              eyebrow: "Bible Bingo 7",
              title: passage.label,
              body: passage.text,
              tagline: CONTEXT_TAGLINE,
              footer: "crossheartpray.com",
              fileBase: `bible-bingo-${passage.label}`,
            }}
          />
        </div>

        {children || note || spinOdds ? (
          <CardMore label={moreLabel} className="mt-5">
            {note ? (
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-300">
                {note}
              </p>
            ) : null}

            {spinOdds ? (
              <p className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                Shuffled from: <span className="text-white">{spinOdds}</span>
              </p>
            ) : null}

            {children}
          </CardMore>
        ) : null}
      </article>
    </>
  );
}
