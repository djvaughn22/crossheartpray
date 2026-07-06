"use client";

import { useState } from "react";
import {
  formatPrincipleRange,
  LIFE_ESSENTIALS_APP,
  LIFE_ESSENTIALS_STUDY_BIBLE,
  type LifeEssentialsPrinciple,
} from "../lib/geneGetzLifeEssentials";
import YouTubeModal from "./YouTubeModal";

type Group = { book: string; items: LifeEssentialsPrinciple[] };

function principleKey(p: LifeEssentialsPrinciple) {
  return `${p.code}-${p.principleNumber}-${p.startChapter}-${p.startVerse}`;
}

// Full 1,500-principle index, grouped by book (collapsible). Each principle can
// be expanded to read the full principle summary and open the official Dr. Gene
// Getz video plus his Bible Principles web-app links.
export default function GeneGetzFullIndex({
  groups,
  principleFinderUrl,
}: {
  groups: Group[];
  principleFinderUrl: string;
}) {
  const [active, setActive] = useState<LifeEssentialsPrinciple | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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
    <div className="mt-6 space-y-3">
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
                        Official page
                      </a>
                    )}
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
                        {p.youtubeId ? (
                          <button
                            type="button"
                            onClick={() => setActive(p)}
                            className="inline-flex items-center justify-center rounded-full border border-amber-200/30 bg-amber-300/12 px-4 py-1.5 text-xs font-bold text-amber-50 transition hover:bg-amber-300/20"
                          >
                            ▶ Watch in app
                          </button>
                        ) : null}

                        <a
                          href={p.officialVideoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold text-slate-100 transition hover:bg-white/10"
                        >
                          Official video page →
                        </a>

                        <a
                          href={principleFinderUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold text-slate-100 transition hover:bg-white/10"
                        >
                          Principle Finder →
                        </a>

                        <a
                          href={LIFE_ESSENTIALS_STUDY_BIBLE}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold text-slate-100 transition hover:bg-white/10"
                        >
                          Study Bible →
                        </a>

                        <a
                          href={LIFE_ESSENTIALS_APP}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold text-slate-100 transition hover:bg-white/10"
                        >
                          Life Essentials App →
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
