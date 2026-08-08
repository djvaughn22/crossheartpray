"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_READING_PLAN_DURATION,
  READING_PLAN_DURATIONS,
  saveReadingPlanDuration,
  subscribeToReadingPlanDuration,
  type ReadingPlanDuration,
} from "../lib/readingPlanDuration";

// The pace switch sits OUTSIDE .chp-reading-progress-shell on purpose: that
// wrapper's compact-spreadsheet CSS restyles every button inside it (2rem
// tall, 0.68rem text, pill radius, forced background) to keep the dense
// 7-column table tight. Those rules are right for the table and wrong for a
// primary page control, so the switch lives just above the shell and keeps
// full-size tap targets.

const DURATION_LABELS: Record<ReadingPlanDuration, { title: string; weeks: string }> = {
  52: { title: "1 Year", weeks: "52 Weeks" },
  104: { title: "2 Years", weeks: "104 Weeks" },
};

// Deep links into the plan (?week=&day= or #week-N-day) are written by the
// Scripture Reader, Bible Bingo, and the Bingo emails — all of which address
// the annual plan. Landing on one shows the 1-year pace so the link always
// lands where it meant to.
function hasAnnualDeepLink(): boolean {
  if (typeof window === "undefined") return false;
  if (/^#week-\d+-[a-z]+/.test(window.location.hash)) return true;
  const params = new URLSearchParams(window.location.search);
  return Boolean(params.get("week") && params.get("day")) || Boolean(params.get("bingoBatch"));
}

export default function ReadingPlanDurationTabs() {
  // Server render and first paint are always the 1-year plan — the saved
  // choice is applied after mount, where localStorage exists.
  const [duration, setDuration] = useState<ReadingPlanDuration>(
    DEFAULT_READING_PLAN_DURATION,
  );

  useEffect(() => {
    if (hasAnnualDeepLink()) {
      saveReadingPlanDuration(DEFAULT_READING_PLAN_DURATION);
      return;
    }
    return subscribeToReadingPlanDuration(setDuration);
  }, []);

  function chooseDuration(next: ReadingPlanDuration) {
    // Nothing is cleared or converted here: each pace keeps its own saved
    // progress, so switching is only a change of view.
    setDuration(next);
    saveReadingPlanDuration(next);
  }

  return (
    <div className="chp-plan-duration-switch mt-4 print:hidden">
      <div
        role="tablist"
        aria-label="Bible Reading Plan pace"
        className="flex w-full flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2 sm:flex-row"
      >
        {READING_PLAN_DURATIONS.map((option) => {
          const active = duration === option;
          const labels = DURATION_LABELS[option];

          return (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => chooseDuration(option)}
              className={`flex min-h-[2.75rem] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 ${
                active
                  ? "border border-emerald-200/40 bg-emerald-300/15 text-white"
                  : "border border-transparent text-slate-300 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <span>{labels.title}</span>
              <span
                className={`text-[0.62rem] font-black uppercase tracking-[0.14em] ${
                  active ? "text-emerald-100" : "text-slate-400"
                }`}
              >
                · {labels.weeks}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-2 px-1 text-[0.72rem] font-semibold leading-5 text-slate-400">
        Want to read through the Bible, but one year feels like too much? Choose
        the 2-year pace. Same plan. Smaller weekly readings. Keep going.
      </p>
    </div>
  );
}
