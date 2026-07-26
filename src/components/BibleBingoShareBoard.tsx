"use client";
import { useEffect, useState } from "react";
import type { BibleBingoPassage } from "../lib/bibleRandom";
import {
  buildDeepDiveWordStudiesUrl,
  getDefaultWordStudy,
  hasVerifiedWordStudies,
  type VerifiedWordStudy,
  wordStudyLookupKey,
} from "../lib/originalLanguageWordStudy";
import CardReadMenu from "./CardReadMenu";
import OriginalWordStudyModal from "./OriginalWordStudyModal";
import VerifiedVerseText from "./VerifiedVerseText";
import { bibleComUrlForPassage, referenceForPassage } from "../lib/scripture";
import { bibleBingoPlanEntryIdForPassage } from "../lib/bibleRandom";
import { subscribeToReadingPlanProgress } from "../lib/readingPlanProgress";

type ShareSection = {
  title: string;
  emoji: string;
  line: string;
  odds?: string;
};

type ActiveWordStudy = {
  passage: BibleBingoPassage;
  wordStudy: VerifiedWordStudy;
};

type BibleBingoShareBoardProps = {
  passages: BibleBingoPassage[];
  shareSections: ShareSection[];
  cardTones: string[];
};

function verseUrl(passage: BibleBingoPassage) {
  return bibleComUrlForPassage(passage);
}

function shareCardGridClass(index: number) {
  return index < 3 ? "lg:col-span-2" : "lg:col-span-3";
}

function hasVerifiedWordLinks(wordStudies: VerifiedWordStudy[]) {
  return hasVerifiedWordStudies(wordStudies);
}

export default function BibleBingoShareBoard({
  passages,
  shareSections,
  cardTones,
}: BibleBingoShareBoardProps) {
  const [activeWordStudy, setActiveWordStudy] = useState<ActiveWordStudy | null>(null);
  const [planProgress, setPlanProgress] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Saved boards keep their original cards forever; completion state is
    // reconciled live from the canonical annual Reading Plan progress
    // (including completions made on the plan board or another tab).
    return subscribeToReadingPlanProgress((progress) => {
      setPlanProgress(progress);
    });
  }, []);
  const [wordStudiesByPassage, setWordStudiesByPassage] = useState<
    Record<string, VerifiedWordStudy[]>
  >({});

  function wordStudiesForPassage(passage: BibleBingoPassage) {
    return wordStudiesByPassage[wordStudyLookupKey(passage)] ?? [];
  }

  function openWordStudy(
    passage: BibleBingoPassage,
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

  useEffect(() => {
    let cancelled = false;

    async function loadWordStudies() {
      const uniquePassages = new Map(
        passages.map((passage) => [wordStudyLookupKey(passage), passage]),
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
  }, [passages]);

  return (
    <>
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl sm:p-8">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-6">
          {passages.map((passage, index) => {
            const section = shareSections[index];
            const wordStudies = wordStudiesForPassage(passage);
            const planEntryId = bibleBingoPlanEntryIdForPassage(passage);
            const readInPlan = Boolean(planEntryId && planProgress[planEntryId]);

            return (
              <article
                id={`card-${index + 1}`}
                key={`${section.title}-${passage.label}`}
                className={`rounded-[1.5rem] border p-5 text-center ${cardTones[index]} ${shareCardGridClass(index)}`}
              >
                <div className="text-4xl">{section.emoji}</div>

                <h2 className="mt-4 text-xl font-bold">{section.title}</h2>

                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {section.line}
                </p>

                <p className="mt-5 text-2xl font-bold text-white">
                  {passage.label}
                </p>

                {readInPlan ? (
                  <p className="mx-auto mt-3 inline-flex rounded-full border border-emerald-200/30 bg-emerald-300/15 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.14em] text-emerald-50">
                    Read in Plan
                  </p>
                ) : null}

                {passage.text ? (
                  <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-slate-200">
                    <VerifiedVerseText
                      passage={passage}
                      wordStudies={wordStudies}
                      onWordClick={(wordStudy) => openWordStudy(passage, wordStudy)}
                    />
                  </p>
                ) : (
                  <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-slate-300">
                    This verse is carried in a footnote in the current
                    translation — open it on Bible.com to read it in full.
                  </p>
                )}

                <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-slate-300">
                  Shuffled from: <span className="text-white">{section.odds ?? section.title}</span>
                </p>

                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  {(() => {
                    const readReference = referenceForPassage(passage);
                    return readReference ? (
                      <CardReadMenu reference={readReference} />
                    ) : null;
                  })()}

                  <button
                    type="button"
                    onClick={() => openWordStudy(passage)}
                    title={
                      hasVerifiedWordLinks(wordStudies)
                        ? "Open verified original-language word study"
                        : "Deep Dive opens when this verse has verified underlined word links."
                    }
                    className="text-center justify-center items-center inline-flex rounded-full border border-emerald-200/20 bg-emerald-300/10 px-5 py-2 text-sm font-semibold text-emerald-100 shadow-sm transition hover:bg-emerald-300/15 disabled:cursor-not-allowed disabled:border-zinc-700/70 disabled:bg-zinc-800/70 disabled:text-zinc-500 disabled:shadow-none disabled:hover:bg-zinc-800/70"
                  >
                    Deep Dive
                  </button>
                </div>
              </article>
            );
          })}
        </div>
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
    </>
  );
}
