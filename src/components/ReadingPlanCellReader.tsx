"use client";

// The Reading Plan's own reader — expands inside the selected plan cell and
// reads the complete assigned passage right there. This is the one internal
// reading destination for every verse on CrossHeartPray: arrive from Bible
// Bingo, Daily Hope, search, or Life Essentials; read the whole assignment
// with the arriving verse highlighted; mark the reading complete without
// leaving the row. Uses the shared ScriptureReader (translation picker,
// Bible.com ↗, verse highlight, chapter cache) with Previous/Next clamped to
// the assigned chapters, and the same Life Essentials companion the reader
// has always had.

import { useState } from "react";
import ScriptureReader from "./scripture/ScriptureReader";
import ReaderLifeEssentials from "./scripture/ReaderLifeEssentials";
import { type ScriptureReference } from "../lib/scripture";

export type ReadingPlanCellAssignment = {
  book: string;
  startChapter: number;
  /** Clamped to the book's real chapter count by the caller. */
  endChapter: number;
};

type ReadingPlanCellReaderProps = {
  /** The plan's own reading text, e.g. "Malachi" or "John 1-3". */
  readingLabel: string;
  weekNo: number;
  dayLabel: string;
  assignment: ReadingPlanCellAssignment;
  /** The verse that brought the person here, when there is one. */
  focus: ScriptureReference | null;
  isRead: boolean;
  onToggleRead: () => void;
  onClose: () => void;
};

export default function ReadingPlanCellReader({
  readingLabel,
  weekNo,
  dayLabel,
  assignment,
  focus,
  isRead,
  onToggleRead,
  onClose,
}: ReadingPlanCellReaderProps) {
  const [current, setCurrent] = useState<ScriptureReference>(
    focus && focus.book === assignment.book
      ? focus
      : { book: assignment.book, chapter: assignment.startChapter },
  );

  const assignedChapterCount = assignment.endChapter - assignment.startChapter + 1;
  const withinAssignment =
    current.book === assignment.book &&
    (current.chapter ?? 1) >= assignment.startChapter &&
    (current.chapter ?? 1) <= assignment.endChapter;
  const chapterPosition = (current.chapter ?? 1) - assignment.startChapter + 1;

  return (
    <div className="chp-plan-cell-reader border-t border-white/10 bg-slate-950/40 px-3 py-4 text-left sm:px-5">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pb-3">
          <div className="min-w-0">
            <p className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-emerald-100">
              Week {weekNo} · {dayLabel}
            </p>
            <p className="mt-0.5 text-base font-black leading-6 text-white">
              {readingLabel}
              {assignedChapterCount > 1 && withinAssignment ? (
                <span className="ml-2 text-xs font-bold text-slate-400">
                  Chapter {chapterPosition} of {assignedChapterCount} in this reading
                </span>
              ) : null}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-emerald-200/25 bg-white/[0.06] px-3.5 py-2 text-[0.68rem] font-black uppercase tracking-[0.12em] text-white transition hover:border-emerald-200/45 hover:bg-white/[0.1]">
              <input
                type="checkbox"
                checked={isRead}
                onChange={onToggleRead}
                aria-label={`Mark ${readingLabel} complete`}
                className="peer sr-only"
              />
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-emerald-200/35 bg-slate-950/45 text-[0.72rem] leading-none text-transparent transition peer-checked:border-emerald-200/70 peer-checked:bg-emerald-300 peer-checked:text-slate-950">
                ✓
              </span>
              <span>{isRead ? "Done" : "Mark Done"}</span>
            </label>

            <button
              type="button"
              onClick={onClose}
              aria-label={`Close ${readingLabel} reader`}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-base font-black text-white transition hover:bg-white/[0.12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
            >
              ✕
            </button>
          </div>
        </div>

        <ScriptureReader
          variant="inline"
          initialReference={
            focus && focus.book === assignment.book
              ? focus
              : { book: assignment.book, chapter: assignment.startChapter }
          }
          chapterBounds={assignment}
          onReferenceChange={setCurrent}
          afterScripture={
            <ReaderLifeEssentials book={current.book} chapter={current.chapter ?? 1} />
          }
        />
      </div>
    </div>
  );
}
