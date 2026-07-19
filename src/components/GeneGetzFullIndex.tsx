"use client";

import { useMemo, useState } from "react";
import {
  formatPrincipleRange,
  getAdjacentPlayablePrinciple,
  type LifeEssentialsPrinciple,
} from "../lib/geneGetzLifeEssentials";
import {
  bibleReadingPlanDayForReference,
  bibleReadingPlanDayHref,
} from "../lib/bibleReadingPlan";
import CardReadMenu from "./CardReadMenu";
import YouTubeModal from "./YouTubeModal";

type Group = { book: string; items: LifeEssentialsPrinciple[] };

type ReadTarget = {
  verseHref: string;
  chapterHref: string;
  verseLabel: string;
  readingPlanHref?: string;
  readingPlanNote?: string;
};

function principleKey(p: LifeEssentialsPrinciple) {
  return `${p.code}-${p.principleNumber}-${p.startChapter}-${p.startVerse}`;
}

// Bible.com (YouVersion, WEBUS) link for the principle's passage range.
function passageUrl(p: LifeEssentialsPrinciple) {
  const base = `https://www.bible.com/bible/206/${p.code}.${p.startChapter}`;
  if (p.startChapter === p.endChapter && p.endVerse > p.startVerse) {
    return `${base}.${p.startVerse}-${p.endVerse}.WEBUS`;
  }
  return `${base}.${p.startVerse}.WEBUS`;
}

function chapterUrl(p: LifeEssentialsPrinciple) {
  return `https://www.bible.com/bible/206/${p.code}.${p.startChapter}.WEBUS`;
}

// Read destinations for each principle: passage + chapter on Bible.com, plus the
// 52-week plan day that contains the start of the principle's passage (only when
// a real plan match resolves from the canonical plan data).
function buildReadTargets(groups: Group[]): Map<string, ReadTarget> {
  const targets = new Map<string, ReadTarget>();
  for (const group of groups) {
    for (const p of group.items) {
      const planDay = bibleReadingPlanDayForReference(p.code, p.startChapter);
      const singleVerse =
        p.startChapter === p.endChapter && p.startVerse === p.endVerse;
      targets.set(principleKey(p), {
        verseHref: passageUrl(p),
        chapterHref: chapterUrl(p),
        verseLabel: singleVerse ? "Open Verse" : "Open Passage",
        readingPlanHref: planDay ? bibleReadingPlanDayHref(planDay) : undefined,
        readingPlanNote: planDay
          ? `Lands in Week ${planDay.week} · ${planDay.dayLabel} (${planDay.reading}).`
          : undefined,
      });
    }
  }
  return targets;
}

// Full 1,500-principle index, grouped by book (collapsible). Click a principle to
// open/close it and read the full principle text with a link to the passage; the
// Watch button plays the official Dr. Gene Getz video in-app.
export default function GeneGetzFullIndex({
  groups,
  principleFinderUrl,
}: {
  groups: Group[];
  principleFinderUrl: string;
}) {
  const [active, setActive] = useState<LifeEssentialsPrinciple | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const readTargets = useMemo(() => buildReadTargets(groups), [groups]);

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <div className="mt-6 space-y-3 text-left">
      {groups.map((group) => (
        <details
          key={group.book}
          className="group rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <span className="text-base font-black text-white">{group.book}</span>
            <span className="rounded-full border border-amber-200/25 bg-amber-300/10 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.14em] text-amber-100">
              {group.items.length} principle{group.items.length === 1 ? "" : "s"}
            </span>
          </summary>

          <ul className="mt-4 space-y-2 border-t border-white/10 pt-4">
            {group.items.map((p) => {
              const key = principleKey(p);
              const isOpen = expanded.has(key);
              const bodyId = `principle-${key}`;
              const read = readTargets.get(key);

              return (
                <li
                  key={key}
                  className="rounded-xl border border-white/8 bg-black/20 px-4 py-3"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <button
                      type="button"
                      onClick={() => toggle(key)}
                      aria-expanded={isOpen}
                      aria-controls={bodyId}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-100">
                        #{p.principleNumber} · {p.book} {formatPrincipleRange(p)}
                      </p>
                      <p className="flex items-center gap-2 text-sm font-bold leading-5 text-white">
                        <span className="min-w-0">{p.principleTitle}</span>
                        <span
                          aria-hidden="true"
                          className={`shrink-0 text-amber-200 transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        >
                          ▾
                        </span>
                      </p>
                    </button>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {read ? (
                        <CardReadMenu
                          verseHref={read.verseHref}
                          chapterHref={read.chapterHref}
                          verseLabel={read.verseLabel}
                          readingPlanHref={read.readingPlanHref}
                          readingPlanNote={read.readingPlanNote}
                          triggerAriaLabel={`Read ${p.book} ${formatPrincipleRange(p)}`}
                        />
                      ) : null}

                      {p.youtubeId ? (
                        <button
                          type="button"
                          onClick={() => setActive(p)}
                          className="inline-flex shrink-0 items-center justify-center rounded-full border border-amber-200/30 bg-amber-300/12 px-4 py-1.5 text-xs font-bold text-amber-50 transition hover:bg-amber-300/20"
                        >
                          ▶ Watch
                        </button>
                      ) : (
                        <a
                          href={p.officialVideoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex shrink-0 items-center justify-center rounded-full border border-amber-200/30 bg-amber-300/12 px-4 py-1.5 text-xs font-bold text-amber-50 transition hover:bg-amber-300/20"
                        >
                          ▶ Watch
                        </a>
                      )}
                    </div>
                  </div>

                  {isOpen ? (
                    <div
                      id={bodyId}
                      className="mt-3 border-t border-white/10 pt-3"
                    >
                      <p className="text-sm font-medium leading-7 text-slate-200">
                        {p.shortPrincipleSummary}
                      </p>

                      {p.referenceNote ? (
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                          Life Essentials Study Bible · {p.referenceNote}
                        </p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <a
                          href={p.officialVideoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold text-slate-100 transition hover:bg-white/10"
                        >
                          Open this principle in Bible Principles →
                        </a>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </details>
      ))}

      {active?.youtubeId ? (
        <YouTubeModal
          videoId={active.youtubeId}
          title={`Principle ${active.principleNumber} · ${active.principleTitle}`}
          onClose={() => setActive(null)}
          onPrev={() => setActive(getAdjacentPlayablePrinciple(active, -1))}
          onNext={() => setActive(getAdjacentPlayablePrinciple(active, 1))}
        />
      ) : null}

      <a
        href={principleFinderUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-bold text-slate-100 transition hover:bg-white/10"
      >
        Open official Principle Finder →
      </a>
    </div>
  );
}
