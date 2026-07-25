"use client";

import Link from "next/link";

// The emailed Bible Bingo 7 board — rendered by the EXISTING Bible Bingo 7
// page (/explorebible) when a ?batch=TOKEN link from an email is opened.
// The seven cards come from the saved batch on the server, so refreshing or
// opening on another device always shows the same seven cards the email
// showed. Completion is stored server-side (cross-device) and mirrored into
// the local Bible Reading Plan checklist so the plan page lines up too.

import { useCallback, useEffect, useState } from "react";
import {
  BIBLE_READING_PLAN_PROGRESS_EVENT,
  BIBLE_READING_PLAN_STORAGE_KEY,
} from "./BibleReadingPlanProgress";
import {
  loadChecklistProgress,
  saveChecklistProgress,
} from "../lib/checklistProgress";

type BatchCard = {
  id: string;
  week: number;
  dayLabel: string;
  category: string;
  reading: string;
  emoji: string;
  laneTitle: string;
  planHref: string;
  completed: boolean;
};

type BatchView = {
  setNumber: number;
  totalSets: number;
  cards: BatchCard[];
  batchCompletedCount: number;
  batchSize: number;
  planCompletedCount: number;
  planTotal: number;
  allSetsSent: boolean;
  planFullyCompleted: boolean;
};

// Same rotating tones the shared Bible Bingo board uses.
const cardTones = [
  "border-emerald-200/15 bg-emerald-300/10",
  "border-yellow-200/15 bg-yellow-200/10",
  "border-red-200/15 bg-red-300/10",
  "border-sky-200/15 bg-sky-300/10",
  "border-lime-200/15 bg-lime-300/10",
  "border-orange-200/15 bg-orange-300/10",
  "border-violet-200/15 bg-violet-300/10",
];

function cardGridClass(index: number) {
  return index < 3 ? "lg:col-span-2" : "lg:col-span-3";
}

function mirrorToLocalPlanProgress(readingId: string, completed: boolean) {
  const progress = loadChecklistProgress(BIBLE_READING_PLAN_STORAGE_KEY);
  if (completed) {
    progress[readingId] = true;
  } else {
    delete progress[readingId];
  }
  saveChecklistProgress(
    BIBLE_READING_PLAN_STORAGE_KEY,
    progress,
    BIBLE_READING_PLAN_PROGRESS_EVENT,
  );
}

type BibleBingoEmailBatchProps = {
  token: string;
  /** 1-based card number from the email's per-card link, if any. */
  focusCard: number | null;
};

export default function BibleBingoEmailBatch({
  token,
  focusCard,
}: BibleBingoEmailBatchProps) {
  const [view, setView] = useState<BatchView | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "missing">(
    "loading",
  );
  const [savingId, setSavingId] = useState<string | null>(null);

  // Tokenized states never get indexed.
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(
          `/api/bingo-email/batch/${encodeURIComponent(token)}`,
          { cache: "no-store" },
        );
        if (cancelled) return;
        if (!response.ok) {
          setLoadState("missing");
          return;
        }
        setView((await response.json()) as BatchView);
        setLoadState("ready");
      } catch {
        if (!cancelled) setLoadState("missing");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Land on the card the email link pointed at.
  useEffect(() => {
    if (loadState !== "ready" || !focusCard) return;
    document
      .getElementById(`bingo-email-card-${focusCard}`)
      ?.scrollIntoView({ block: "center" });
  }, [loadState, focusCard]);

  const toggleCard = useCallback(
    async (card: BatchCard) => {
      const nextCompleted = !card.completed;
      setSavingId(card.id);
      try {
        const response = await fetch(
          `/api/bingo-email/batch/${encodeURIComponent(token)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ readingId: card.id, completed: nextCompleted }),
          },
        );
        if (response.ok) {
          setView((await response.json()) as BatchView);
          mirrorToLocalPlanProgress(card.id, nextCompleted);
        }
      } catch {
        // Leave state as-is; the reader can tap again.
      } finally {
        setSavingId(null);
      }
    },
    [token],
  );

  if (loadState === "loading") {
    return (
      <section className="py-24 text-center" aria-busy="true">
        <p className="text-4xl">✝️ ❤️ 🙏</p>
        <p className="mt-4 text-sm font-semibold text-slate-400" role="status">
          Opening your Bible Bingo 7…
        </p>
      </section>
    );
  }

  if (loadState === "missing" || !view) {
    return (
      <section className="mx-auto max-w-xl py-24 text-center">
        <p className="text-4xl">✝️ ❤️ 🙏</p>
        <h1 className="mt-4 font-serif text-3xl font-black text-white">
          This Bible Bingo 7 link isn&apos;t available
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
          The link may be incomplete. You can open the most recent email
          again, or deal a fresh set of cards right here.
        </p>
        <Link
          href="/explorebible"
          className="mt-6 inline-flex min-h-11 items-center rounded-full border border-emerald-200/25 bg-emerald-300/10 px-5 py-2 text-sm font-bold text-emerald-50 transition hover:bg-emerald-300/15"
        >
          Open Bible Bingo 7
        </Link>
      </section>
    );
  }

  const planPercent = view.planTotal
    ? Math.round((view.planCompletedCount / view.planTotal) * 100)
    : 0;

  return (
    <section aria-label="Your emailed Bible Bingo 7">
      <div className="mx-auto max-w-3xl py-10 text-center">
        <p className="mb-6 flex items-center justify-center gap-8 text-5xl">
          <span>✝️</span>
          <span>❤️</span>
          <span>🙏</span>
        </p>

        <p className="mb-4 inline-flex rounded-full border border-white/15 bg-black/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100">
          Your emailed Bible Bingo 7
        </p>

        <h1 className="font-serif text-4xl font-black tracking-tight text-white sm:text-5xl">
          Set {view.setNumber} of {view.totalSets}
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-base font-semibold leading-7 text-slate-300">
          Your next seven readings are ready. Open your Bible Bingo 7 and
          continue through the plan.
        </p>

        <div className="mx-auto mt-6 max-w-md">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-100">
            This set: {view.batchCompletedCount} of {view.batchSize} complete
          </p>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={view.batchSize}
            aria-valuenow={view.batchCompletedCount}
            aria-label="Readings completed in this set"
            className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"
          >
            <div
              className="h-full rounded-full bg-emerald-300/70 transition-all"
              style={{
                width: `${view.batchSize ? (view.batchCompletedCount / view.batchSize) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-400">
            Whole plan: {view.planCompletedCount} of {view.planTotal} readings
            complete ({planPercent}%)
          </p>
        </div>

        {view.batchCompletedCount >= view.batchSize && view.batchSize > 0 ? (
          <p className="mx-auto mt-5 max-w-md rounded-2xl border border-emerald-200/25 bg-emerald-300/10 px-5 py-3 text-sm font-bold text-emerald-50">
            You completed this set of seven.
          </p>
        ) : null}

        {view.planFullyCompleted ? (
          <p className="mx-auto mt-5 max-w-md rounded-2xl border border-emerald-200/25 bg-emerald-300/10 px-5 py-4 text-sm font-bold leading-6 text-emerald-50">
            You completed the full Bible Reading Plan. When you&apos;re ready,
            the manage page can begin a fresh journey through the plan.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {view.cards.map((card, index) => (
          <article
            key={card.id}
            id={`bingo-email-card-${index + 1}`}
            className={`rounded-[1.75rem] border p-6 shadow-sm shadow-black/20 ${cardTones[index % cardTones.length]} ${cardGridClass(index)}`}
          >
            <p className="text-center text-3xl" aria-hidden="true">
              {card.emoji}
            </p>
            <p className="mt-2 text-center text-[0.65rem] font-black uppercase tracking-[0.18em] text-emerald-100">
              Card {index + 1} · {card.laneTitle}
            </p>
            <h2 className="mt-3 text-center font-serif text-2xl font-black leading-tight text-white">
              {card.reading}
            </h2>
            <p className="mt-2 text-center text-xs font-semibold text-slate-300">
              Week {card.week} · {card.dayLabel} · {card.category}
            </p>

            <div className="mt-5 flex flex-col items-center gap-2">
              <Link
                href={card.planHref}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-emerald-200/25 bg-emerald-300/10 px-4 py-2 text-sm font-bold text-emerald-50 transition hover:bg-emerald-300/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
              >
                Read in the plan
              </Link>
              <button
                type="button"
                onClick={() => toggleCard(card)}
                disabled={savingId === card.id}
                aria-pressed={card.completed}
                className={`inline-flex min-h-11 w-full items-center justify-center rounded-full border px-4 py-2 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:opacity-60 ${
                  card.completed
                    ? "border-emerald-200/40 bg-emerald-300/25 text-white"
                    : "border-white/15 bg-black/20 text-slate-200 hover:bg-black/30"
                }`}
              >
                {card.completed ? "Completed ✓" : "Mark complete"}
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="mx-auto mt-10 flex max-w-xl flex-col items-center gap-3 pb-4 text-center">
        <Link
          href="/explorebible"
          className="inline-flex min-h-11 items-center rounded-full border border-white/15 bg-black/20 px-5 py-2 text-sm font-bold text-slate-200 transition hover:bg-black/30"
        >
          Back to the regular Bible Bingo 7
        </Link>
        <Link
          href="/bible-reading-plan"
          className="inline-flex min-h-11 items-center rounded-full border border-white/15 bg-black/20 px-5 py-2 text-sm font-bold text-slate-200 transition hover:bg-black/30"
        >
          Open the full Bible Reading Plan
        </Link>
        <p className="text-xs font-semibold leading-5 text-slate-400">
          Want to change how often these arrive? Use the{" "}
          <Link
            href="/bible-bingo/manage"
            className="font-bold text-emerald-100 underline decoration-white/20 underline-offset-4"
          >
            manage email settings
          </Link>{" "}
          link from any of your emails.
        </p>
      </div>
    </section>
  );
}
