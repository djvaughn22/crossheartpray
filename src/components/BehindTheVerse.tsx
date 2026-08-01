"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  bibleComUrlForPassage,
  getScriptureProvider,
  parseScriptureReference,
  resolveScriptureSelection,
  type ScriptureReference,
} from "../lib/scripture";
import { getGeneGetzPrinciplesForVerse, type LifeEssentialsPrinciple } from "../lib/geneGetzLifeEssentials";
import type { VerifiedWordStudy } from "../lib/originalLanguageWordStudy";
import type { BibleBingoCardPassage } from "./BibleBingoVerseCard";
import ScriptureReaderModal from "./scripture/ScriptureReaderModal";
import OriginalWordStudyModal from "./OriginalWordStudyModal";

type BehindTheVerseProps = {
  verseReference: string;
};

type VerseData = {
  passage: BibleBingoCardPassage;
  principles: LifeEssentialsPrinciple[];
  wordStudy: VerifiedWordStudy | null;
};

const provider = getScriptureProvider();

export default function BehindTheVerse({ verseReference }: BehindTheVerseProps) {
  const [data, setData] = useState<VerseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showReaderModal, setShowReaderModal] = useState(false);
  const [readerReference, setReaderReference] = useState<ScriptureReference | null>(null);
  const [showWordStudyModal, setShowWordStudyModal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        setError("");

        // Parse and resolve the verse reference
        const parsed = parseScriptureReference(verseReference);

        if (!parsed) {
          setError("Couldn't parse verse reference");
          if (!cancelled) setIsLoading(false);
          return;
        }

        const resolved = resolveScriptureSelection({
          ...parsed,
          chapter: parsed.chapter ?? 1,
          verse: parsed.verse ?? 1,
        });

        if (!resolved) {
          setError("Couldn't resolve verse reference");
          if (!cancelled) setIsLoading(false);
          return;
        }

        // Load the verse text
        const chapterData = await provider.loadChapter(resolved.chapterReference);
        if (cancelled) return;

        const firstVerse = resolved.verse ?? 1;
        const lastVerse = resolved.endVerse ?? firstVerse;
        const picked = chapterData.verses.filter(
          (entry) => entry.verse >= firstVerse && entry.verse <= lastVerse,
        );

        if (!picked.length) {
          setError(`${resolved.chapterLabel} not found`);
          if (!cancelled) setIsLoading(false);
          return;
        }

        const text = picked.map((entry) => entry.text).join(" ");
        const passage: BibleBingoCardPassage = {
          label: resolved.label,
          book: resolved.bookName,
          code: resolved.bookCode,
          chapter: String(resolved.chapter),
          verse: String(resolved.verse ?? 1),
          ...(resolved.endVerse !== undefined ? { endVerse: String(resolved.endVerse) } : {}),
          text,
          group: resolved.testament === "OT" ? "Old Testament" : "New Testament",
        };

        // Get Life Essentials principles for this verse
        const principles = getGeneGetzPrinciplesForVerse(
          resolved.bookName,
          resolved.chapter,
          resolved.verse ?? 1,
        );

        if (!cancelled) {
          setData({
            passage,
            principles,
            wordStudy: null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          console.error("BehindTheVerse error:", err);
          setError("Couldn't load verse data");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [verseReference]);

  if (isLoading) {
    return (
      <section className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-[2rem] border border-emerald-200/15 bg-slate-950/35 shadow-2xl shadow-emerald-950/15 sm:mt-14">
        <details className="group" open>
          <summary className="cursor-pointer select-none list-none p-6 [&::-webkit-details-marker]:hidden">
            <p className="text-xs font-black uppercase tracking-[0.26em] text-emerald-100">
              Open the Word
            </p>
            <div className="mt-2 flex items-center justify-between gap-4">
              <h2 className="text-3xl font-black leading-tight text-white sm:text-4xl">
                Behind the Verse
              </h2>
            </div>
            <p className="mt-2 max-w-xl text-sm font-semibold leading-7 text-slate-300">
              Loading verse data…
            </p>
          </summary>
        </details>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-[2rem] border border-emerald-200/15 bg-slate-950/35 shadow-2xl shadow-emerald-950/15 sm:mt-14">
        <details className="group">
          <summary className="cursor-pointer select-none list-none p-6 [&::-webkit-details-marker]:hidden">
            <p className="text-xs font-black uppercase tracking-[0.26em] text-emerald-100">
              Open the Word
            </p>
            <div className="mt-2 flex items-center justify-between gap-4">
              <h2 className="text-3xl font-black leading-tight text-white sm:text-4xl">
                Behind the Verse
              </h2>
            </div>
            <p className="mt-2 max-w-xl text-sm font-semibold leading-7 text-slate-300">
              {error || "Couldn't load verse"}
            </p>
          </summary>
        </details>
      </section>
    );
  }

  const { passage, principles, wordStudy } = data;
  const verseUrl = bibleComUrlForPassage(passage);

  const handleOpenVerse = () => {
    setReaderReference({
      book: passage.code as ScriptureReference["book"],
      chapter: parseInt(passage.chapter),
      verse: parseInt(passage.verse),
      endVerse: passage.endVerse ? parseInt(passage.endVerse) : undefined,
    });
    setShowReaderModal(true);
  };

  return (
    <>
    <section className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-[2rem] border border-emerald-200/15 bg-slate-950/35 shadow-2xl shadow-emerald-950/15 sm:mt-14">
      <details className="group" open>
        <summary className="cursor-pointer select-none list-none p-6 [&::-webkit-details-marker]:hidden">
          <p className="text-xs font-black uppercase tracking-[0.26em] text-emerald-100">
            Open the Word
          </p>
          <div className="mt-2 flex items-center justify-between gap-4">
            <h2 className="text-3xl font-black leading-tight text-white sm:text-4xl">
              Behind the Verse
            </h2>
            <span
              aria-hidden="true"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-xl font-black leading-none text-slate-200 transition-transform duration-200 group-open:rotate-45"
            >
              +
            </span>
          </div>
          <p className="mt-2 max-w-xl text-sm font-semibold leading-7 text-slate-300">
            One verse opens the chapter — Life Essentials and the original words take you deeper.
          </p>
        </summary>

        <div className="grid gap-0 border-t border-white/10 lg:grid-cols-[1fr_1.15fr]">
          <div className="border-b border-white/10 bg-emerald-300/[0.08] p-6 lg:border-b-0 lg:border-r lg:border-white/10">
            <p className="max-w-xl text-sm font-semibold leading-7 text-slate-200 sm:text-base">
              Start with one verse and open the full chapter. Then go deeper — first with{" "}
              <strong className="text-white">Life Essentials by Dr. Gene Getz</strong>:
              1,500 Bible principles with official video teaching, matched to the verse.
            </p>

            <p className="mt-3 max-w-xl text-sm font-semibold leading-7 text-slate-300">
              Next, open the meaning with the original word. When Deep Dive verifies a word it
              shows the source language, pronunciation, Strong&apos;s number, and meaning.
            </p>

            <Link
              href="/life-essentials"
              className="mt-5 inline-flex rounded-full border border-emerald-200/30 bg-emerald-300/10 px-5 py-2.5 text-xs font-black uppercase tracking-[0.16em] text-emerald-50 transition hover:bg-emerald-300/18"
            >
              Explore Life Essentials · Gene Getz →
            </Link>
          </div>

          <div className="flex flex-col justify-between p-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-[0.66rem] font-black uppercase tracking-[0.2em] text-emerald-100">
                  1 verse
                </p>
                <button
                  onClick={handleOpenVerse}
                  className="mt-2 inline-flex text-lg font-black text-white underline decoration-emerald-300/45 decoration-2 underline-offset-4 transition hover:text-emerald-100"
                >
                  {passage.label}
                </button>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
                  Read {passage.label}.
                </p>
              </div>

              <div>
                <p className="text-[0.66rem] font-black uppercase tracking-[0.2em] text-emerald-100">
                  Life Essentials
                </p>
                {principles.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {principles.slice(0, 1).map((p) => (
                      <Link
                        key={p.principleNumber}
                        href="/life-essentials"
                        className="inline-flex text-sm font-black text-white underline decoration-emerald-300/45 decoration-2 underline-offset-4 transition hover:text-emerald-100"
                      >
                        Principle {p.principleNumber}
                      </Link>
                    ))}
                    <p className="text-xs font-semibold leading-5 text-slate-400">
                      {principles.length} principle{principles.length !== 1 ? "s" : ""} found.
                    </p>
                  </div>
                ) : (
                  <div className="mt-2">
                    <p className="text-xs font-semibold leading-5 text-slate-400">
                      Explore all principles on Life Essentials.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-[0.66rem] font-black uppercase tracking-[0.2em] text-emerald-100">
                  Original Word
                </p>
                {wordStudy ? (
                  <button
                    onClick={() => setShowWordStudyModal(true)}
                    className="mt-2 inline-flex text-lg font-black text-white underline decoration-emerald-300/45 decoration-2 underline-offset-4 transition hover:text-emerald-100"
                  >
                    {wordStudy.englishWord}
                  </button>
                ) : (
                  <div className="mt-2">
                    <p className="text-xs font-semibold leading-5 text-slate-400">
                      View verified word studies.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-7 flex flex-wrap gap-2 border-t border-white/10 pt-4">
              <button
                onClick={handleOpenVerse}
                className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-200 transition hover:border-emerald-200/30 hover:bg-emerald-300/10 hover:text-emerald-50"
              >
                Read Scripture →
              </button>
              <Link
                href="/life-essentials"
                className="inline-flex rounded-full border border-emerald-200/25 bg-emerald-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-50 transition hover:bg-emerald-300/18"
              >
                Life Essentials →
              </Link>
            </div>
          </div>
        </div>

        {wordStudy && (
          <div className="border-t border-white/10 bg-slate-950/45 p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
              <div className="lg:w-[15rem] lg:shrink-0">
                <p className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-emerald-100">
                  Original · {wordStudy.language === "greek" ? "Greek" : "Hebrew"}
                </p>
                <h3 className="mt-1 text-3xl font-black leading-none text-white">
                  {wordStudy.englishWord}
                </h3>
                <p className="mt-3 text-xs font-bold leading-6 text-slate-300">
                  One English word, shown with verified source language details.
                </p>
              </div>

              <div className="grid flex-1 gap-3 md:grid-cols-2">
                <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[0.55rem] font-black uppercase tracking-[0.14em] text-sky-100">
                        {wordStudy.language === "greek" ? "Greek" : "Hebrew"}
                      </p>
                      <p className="mt-2 text-4xl font-black leading-none text-white">
                        {wordStudy.originalWord}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[0.55rem] font-black uppercase tracking-[0.12em] text-slate-300">
                      {wordStudy.strongs}
                    </span>
                  </div>

                  <dl className="mt-4 grid gap-2 text-xs font-bold leading-relaxed text-slate-300">
                    <div className="grid gap-1 sm:grid-cols-[7.5rem_1fr]">
                      <dt className="text-slate-500">Transliteration</dt>
                      <dd className="text-emerald-100">{wordStudy.transliteration}</dd>
                    </div>
                    {wordStudy.pronunciation && (
                      <div className="grid gap-1 sm:grid-cols-[7.5rem_1fr]">
                        <dt className="text-slate-500">Pronunciation</dt>
                        <dd className="text-emerald-100">{wordStudy.pronunciation}</dd>
                      </div>
                    )}
                    <div className="grid gap-1 sm:grid-cols-[7.5rem_1fr]">
                      <dt className="text-slate-500">Meaning</dt>
                      <dd>{wordStudy.sourceGloss}</dd>
                    </div>
                  </dl>
                </article>

                <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[0.55rem] font-black uppercase tracking-[0.14em] text-sky-100">
                        Lexicon
                      </p>
                      <p className="mt-2 text-lg font-black leading-none text-white">
                        Definition
                      </p>
                    </div>
                  </div>

                  <dl className="mt-4 grid gap-2 text-xs font-bold leading-relaxed text-slate-300">
                    <div className="grid gap-1">
                      <dt className="text-slate-500">Source</dt>
                      <dd className="text-emerald-100">{wordStudy.lexiconSourceName}</dd>
                    </div>
                    <div className="grid gap-1">
                      <dt className="text-slate-500 mb-2">Meaning</dt>
                      <dd>{wordStudy.lexiconMeaning}</dd>
                    </div>
                  </dl>
                </article>
              </div>
            </div>
          </div>
        )}
      </details>
    </section>
    {showReaderModal && readerReference && (
      <ScriptureReaderModal reference={readerReference} onClose={() => setShowReaderModal(false)} />
    )}
    {showWordStudyModal && wordStudy && (
      <OriginalWordStudyModal
        passage={passage}
        wordStudy={wordStudy}
        wordStudies={[wordStudy]}
        verseUrl={verseUrl}
        onClose={() => setShowWordStudyModal(false)}
      />
    )}
    </>
  );
}
