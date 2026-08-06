"use client";

import { useEffect, useRef, useState } from "react";
import {
  formatPrincipleRange,
  getAdjacentPlayablePrinciple,
  type LifeEssentialsPrinciple,
} from "../lib/geneGetzLifeEssentials";
import CardReadMenu from "./CardReadMenu";
import YouTubeModal from "./YouTubeModal";
import OriginalWordStudyModal from "./OriginalWordStudyModal";
import { type ScriptureReference } from "../lib/scripture";
import {
  fetchVerifiedWordStudies,
  getDefaultWordStudy,
  hasVerifiedWordStudies,
  type VerifiedWordStudy,
  type WordStudyPassage,
} from "../lib/originalLanguageWordStudy";
import { track } from "../lib/analytics";

type Group = { book: string; items: LifeEssentialsPrinciple[] };

type ActiveWordStudy = {
  passage: WordStudyPassage;
  wordStudy: VerifiedWordStudy;
  studies: VerifiedWordStudy[];
};

function principleKey(p: LifeEssentialsPrinciple) {
  return `${p.code}-${p.principleNumber}-${p.startChapter}-${p.startVerse}`;
}

// The canonical reference for a principle's passage. CardReadMenu derives the
// reader routes, the Bible.com link, and the real Reading Plan destination
// from this one object.
function principleReference(p: LifeEssentialsPrinciple): ScriptureReference {
  return {
    book: p.code,
    chapter: p.startChapter,
    verse: p.startVerse,
    ...(p.startChapter === p.endChapter && p.endVerse > p.startVerse
      ? { endVerse: p.endVerse }
      : {}),
  };
}

// Convert principle to word study passage format for Deep Dive
function principleAsWordStudyPassage(p: LifeEssentialsPrinciple): WordStudyPassage {
  return {
    label: `${p.book} ${p.startChapter}:${p.startVerse}`,
    code: p.code,
    chapter: String(p.startChapter),
    verse: String(p.startVerse),
    text: "",
  };
}

// Full 1,500-principle index, grouped by book (collapsible). Click a principle to
// open/close it and read the full principle text with a link to the passage; the
// Watch button plays the official Dr. Gene Getz video in-app.
export default function GeneGetzFullIndex({
  groups,
}: {
  groups: Group[];
}) {
  const [active, setActive] = useState<LifeEssentialsPrinciple | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activeWordStudy, setActiveWordStudy] = useState<ActiveWordStudy | null>(null);
  const [wordStudiesByPrinciple, setWordStudiesByPrinciple] = useState<Map<string, VerifiedWordStudy[]>>(new Map());
  const [loadingWordStudies, setLoadingWordStudies] = useState<Set<string>>(new Set());
  // Tracks keys already fetched or in flight. A ref (not state) so writing to
  // it never re-triggers or tears down the effect below — the same pattern
  // ScriptureReader.tsx uses to avoid the effect racing its own state writes.
  const requestedKeysRef = useRef<Set<string>>(new Set());

  // When a principle is expanded, fetch its Deep Dive word studies
  useEffect(() => {
    if (!expanded.size) return;

    const toLoad: string[] = [];
    for (const key of expanded) {
      if (!requestedKeysRef.current.has(key)) {
        requestedKeysRef.current.add(key);
        toLoad.push(key);
      }
    }

    if (!toLoad.length) return;

    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      for (const key of toLoad) {
        setLoadingWordStudies((prev) => new Set([...prev, key]));

        // Find the principle by key to get its coordinates
        for (const group of groups) {
          const principle = group.items.find((p) => principleKey(p) === key);
          if (principle) {
            try {
              const studies = await fetchVerifiedWordStudies(
                {
                  code: principle.code,
                  chapter: String(principle.startChapter),
                  verse: String(principle.startVerse),
                },
                { signal: controller.signal },
              ).catch(() => [] as VerifiedWordStudy[]);

              if (!cancelled) {
                setWordStudiesByPrinciple((prev) => new Map(prev).set(key, studies));
              }
            } finally {
              if (!cancelled) {
                setLoadingWordStudies((prev) => {
                  const next = new Set(prev);
                  next.delete(key);
                  return next;
                });
              }
            }
            break;
          }
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [expanded, groups]);

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

  function openDeepDive(principle: LifeEssentialsPrinciple) {
    const key = principleKey(principle);
    const studies = wordStudiesByPrinciple.get(key) ?? [];
    const wordStudy = getDefaultWordStudy(studies);

    if (!wordStudy) {
      return;
    }

    track("word_study_open", { word: wordStudy.englishWord, reference: wordStudy.reference });
    setActiveWordStudy({
      passage: principleAsWordStudyPassage(principle),
      wordStudy,
      studies,
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
                      <CardReadMenu
                        reference={principleReference(p)}
                        triggerAriaLabel={`Read ${p.book} ${formatPrincipleRange(p)}`}
                      />

                      {(() => {
                        const key = principleKey(p);
                        const studies = wordStudiesByPrinciple.get(key) ?? [];
                        const isLoading = loadingWordStudies.has(key);
                        const hasStudies = hasVerifiedWordStudies(studies);

                        return (
                          <button
                            type="button"
                            onClick={() => openDeepDive(p)}
                            disabled={!hasStudies && !isLoading}
                            title={
                              isLoading
                                ? "Checking for verified original-language word links."
                                : hasStudies
                                  ? "Open verified original-language word study"
                                  : "Deep Dive opens when this verse has verified underlined word links."
                            }
                            className="inline-flex shrink-0 items-center justify-center rounded-full border border-emerald-200/20 bg-emerald-300/10 px-4 py-1.5 text-xs font-bold text-emerald-100 transition hover:bg-emerald-300/15 disabled:cursor-not-allowed disabled:border-zinc-700/70 disabled:bg-zinc-800/70 disabled:text-zinc-500 disabled:shadow-none disabled:hover:bg-zinc-800/70"
                          >
                            {isLoading ? "…" : "Hebrew/Greek"}
                          </button>
                        );
                      })()}

                      {p.youtubeId ? (
                        <button
                          type="button"
                          onClick={() => setActive(p)}
                          className="inline-flex shrink-0 items-center justify-center rounded-full border border-amber-200/30 bg-amber-300/12 px-4 py-1.5 text-xs font-bold text-amber-50 transition hover:bg-amber-300/20"
                        >
                          ▶ Watch
                        </button>
                      ) : null}
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

                      <p className="mt-3 text-xs font-semibold text-slate-400">
                        Source: Dr. Gene Getz, Life Essentials / BiblePrinciples.org
                        (Principle {p.principleNumber}).
                      </p>
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

      {activeWordStudy ? (
        <OriginalWordStudyModal
          passage={activeWordStudy.passage}
          wordStudy={activeWordStudy.wordStudy}
          wordStudies={activeWordStudy.studies}
          onClose={() => setActiveWordStudy(null)}
        />
      ) : null}
    </div>
  );
}
