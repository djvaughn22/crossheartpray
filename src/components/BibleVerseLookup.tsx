"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import BibleBingoVerseCard, {
  type BibleBingoCardPassage,
} from "./BibleBingoVerseCard";
import OriginalWordStudyModal from "./OriginalWordStudyModal";
import {
  buildDeepDiveWordStudiesUrl,
  getDefaultWordStudy,
  type VerifiedWordStudy,
} from "../lib/originalLanguageWordStudy";
import GeneGetzResourceCard from "./GeneGetzResourceCard";
import { getGeneGetzPrinciplesForVerse } from "../lib/geneGetzLifeEssentials";
import { bibleReadingPlanHrefForReference } from "../lib/bibleReadingPlan";
import { track } from "../lib/analytics";
import { bibleComUrlForPassage, formatScriptureReference } from "../lib/scripture";
import ScriptureReferenceInput from "./scripture/ScriptureReferenceInput";

type SpinMode = "gospel-epistles" | "gospel" | "epistles" | "proverbs" | "all";

type BibleVerseLookupProps = {
  className?: string;
  initialReference?: string;
  suggestedReferences?: string[];
  initialTextOverride?: string;
  showSearch?: boolean;
  spinMode?: SpinMode;
  spinLabel?: string;
  title?: string;
  description?: string;
};

type ActiveLookupWordStudy = {
  passage: BibleBingoCardPassage;
  wordStudy: VerifiedWordStudy;
};

const DEFAULT_REFERENCE = "Romans 15:7";

function verseUrl(passage: BibleBingoCardPassage) {
  return bibleComUrlForPassage(passage);
}

function defaultSpinLabel(spinMode: SpinMode) {
  if (spinMode === "proverbs") {
    return "Shuffle Proverbs";
  }

  if (spinMode === "gospel") {
    return "Shuffle Gospel Verse";
  }

  if (spinMode === "epistles") {
    return "Shuffle Epistles";
  }

  if (spinMode === "all") {
    return "Shuffle Any Verse";
  }

  return "Shuffle Gospel/Epistles";
}

function defaultSpinOdds(spinMode: SpinMode) {
  if (spinMode === "proverbs") {
    return "Proverbs";
  }

  if (spinMode === "gospel") {
    return "Gospel";
  }

  if (spinMode === "epistles") {
    return "Epistles";
  }

  if (spinMode === "all") {
    return "Whole Bible";
  }

  return "Gospel + Epistles";
}

function formatReferenceList(references: string[]) {
  if (references.length === 0) return "";
  if (references.length === 1) return references[0];

  const allButLast = references.slice(0, -1).join(", ");
  const last = references[references.length - 1];

  return `${allButLast}, or ${last}`;
}

export default function BibleVerseLookup({
  className = "mt-12",
  initialReference = DEFAULT_REFERENCE,
  suggestedReferences,
  initialTextOverride,
  showSearch = true,
  spinMode = "gospel-epistles",
  spinLabel,
  title = "Search a Verse. Share a Card.",
  description,
}: BibleVerseLookupProps) {
  const [query, setQuery] = useState("");
  const [passage, setPassage] = useState<BibleBingoCardPassage | null>(null);
  const [wordStudies, setWordStudies] = useState<VerifiedWordStudy[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isOpeningInitialVerse, setIsOpeningInitialVerse] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isLoadingWordStudies, setIsLoadingWordStudies] = useState(false);
  const [activeWordStudy, setActiveWordStudy] = useState<ActiveLookupWordStudy | null>(null);

  const loadPassageByReference = useCallback(
    async (reference: string, textOverride?: string) => {
      const response = await fetch(
        `https://openmirrorllc.com/api/local-verse-lookup?q=${encodeURIComponent(reference)}`,
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No local verse match found.");
      }

      setPassage({
        ...data.passage,
        text: textOverride ?? data.passage.text,
      });
      setNote(data.note ?? "");
      setError("");
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function openInitialVerse() {
      setIsOpeningInitialVerse(true);

      try {
        const response = await fetch(
          `https://openmirrorllc.com/api/local-verse-lookup?q=${encodeURIComponent(initialReference)}`,
        );

        const data = await response.json();

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to open initial verse.");
        }

        setPassage({
          ...data.passage,
          text: initialTextOverride ?? data.passage.text,
        });
        setNote("");
        setError("");
      } catch {
        if (!cancelled) {
          setError(`Unable to open ${initialReference} right now.`);
        }
      } finally {
        if (!cancelled) {
          setIsOpeningInitialVerse(false);
        }
      }
    }

    openInitialVerse();

    return () => {
      cancelled = true;
    };
  }, [initialReference, initialTextOverride]);

  useEffect(() => {
    if (!passage) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset transient lookup state when the verse changes
      setWordStudies([]);
      setIsLoadingWordStudies(false);
      return;
    }

    const selectedPassage = passage;
    let cancelled = false;

    async function loadWordStudies() {
      setIsLoadingWordStudies(true);
      setWordStudies([]);

      try {
        const response = await fetch(buildDeepDiveWordStudiesUrl(selectedPassage));

        if (!response.ok) {
          if (!cancelled) {
            setWordStudies([]);
          }

          return;
        }

        const data = await response.json();

        if (!cancelled) {
          setWordStudies(Array.isArray(data.wordStudies) ? data.wordStudies : []);
        }
      } catch {
        if (!cancelled) {
          setWordStudies([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingWordStudies(false);
        }
      }
    }

    loadWordStudies();

    return () => {
      cancelled = true;
    };
  }, [passage]);

  async function lookupVerse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setError("Type a Bible reference first.");
      return;
    }

    setIsSearching(true);
    setError("");
    setNote("");

    try {
      await loadPassageByReference(trimmedQuery);
      track("verse_lookup", { search_term: trimmedQuery });
    } catch (caught) {
      setPassage(null);
      setError(caught instanceof Error ? caught.message : "No local verse match found.");
    } finally {
      setIsSearching(false);
    }
  }

  async function spinVerse() {
    setIsSpinning(true);
    setError("");
    setNote("");

    try {
      const response = await fetch(`https://openmirrorllc.com/api/local-verse-lookup?random=${spinMode}`, {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to spin a verse.");
      }

      setPassage(data.passage);
      track("verse_spin", { mode: spinMode });
      setNote(data.note ?? "");
      setQuery("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to spin a verse right now.");
    } finally {
      setIsSpinning(false);
    }
  }

  function openWordStudy(selectedWordStudy?: VerifiedWordStudy) {
    if (!passage) {
      return;
    }

    const wordStudy = selectedWordStudy ?? getDefaultWordStudy(wordStudies);

    if (!wordStudy) {
      return;
    }

    track("word_study_open", { word: wordStudy.englishWord, reference: wordStudy.reference });
    setActiveWordStudy({
      passage,
      wordStudy,
    });
  }

  return (
    <section className={`${className} mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-white/[0.055] px-5 py-8 text-center text-slate-100 shadow-2xl shadow-black/25 sm:px-8 sm:py-10`}>
      <p className="text-xs font-black uppercase tracking-[0.28em] text-zinc-400">
        Bible Bingo 7
      </p>

      <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
        {title}
      </h2>

      {description ? (
        <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-6 text-zinc-300 sm:text-base">
          {description}
        </p>
      ) : null}

      {showSearch && (
        <>
          <form
            onSubmit={lookupVerse}
            className="mx-auto mt-6 flex max-w-2xl flex-col gap-3 sm:flex-row"
          >
            <ScriptureReferenceInput
              className="flex-1"
              placeholder="Romans 15:7"
              ariaLabel="Bible verse to search"
              onQueryChange={setQuery}
              onSelect={(suggestion) => {
                // Book/chapter picks open at verse 1 so a verse card always
                // has a verse to show.
                const reference = {
                  ...suggestion.reference,
                  chapter: suggestion.reference.chapter ?? 1,
                  verse: suggestion.reference.verse ?? 1,
                };
                const label = formatScriptureReference(reference);
                setQuery(label);
                setIsSearching(true);
                setError("");
                setNote("");
                loadPassageByReference(label)
                  .then(() => track("verse_lookup", { search_term: label }))
                  .catch((caught) => {
                    setPassage(null);
                    setError(
                      caught instanceof Error ? caught.message : "No local verse match found.",
                    );
                  })
                  .finally(() => setIsSearching(false));
              }}
            />

            <button
              type="submit"
              disabled={isSearching}
              className="min-h-14 rounded-2xl border border-white/20 bg-white/10 px-6 text-base font-black text-white shadow-lg shadow-black/20 transition hover:bg-white/15 disabled:cursor-wait disabled:opacity-60"
            >
              {isSearching ? "Searching..." : "Search Verse"}
            </button>
          </form>

          <p className="mt-4 text-xs font-semibold text-zinc-400">
            {suggestedReferences
              ? `Try ${formatReferenceList(suggestedReferences)}.`
              : "Try Romans 15:7, John 3:16, Psalm 23:1, Romans 8:28, Genesis 1:1, or Proverbs 17:22."}
          </p>
        </>
      )}

      {isOpeningInitialVerse && !passage && (
        <article className="mx-auto mt-7 max-w-3xl rounded-[1.75rem] border border-white/10 bg-black/20 p-6 text-center shadow-xl shadow-black/20 sm:p-8">
          <p className="text-sm font-bold text-slate-200">Opening {initialReference}...</p>
        </article>
      )}

      {passage &&
        (() => {
          const principles = getGeneGetzPrinciplesForVerse(
            passage.code,
            passage.chapter,
            passage.verse,
          );

          return (
            <BibleBingoVerseCard
              passage={passage}
              wordStudies={wordStudies}
              isLoadingWordStudies={isLoadingWordStudies}
              isSpinning={isSpinning}
              spinLabel={spinLabel ?? defaultSpinLabel(spinMode)}
              spinOdds={defaultSpinOdds(spinMode)}
              note={note}
              onSpinVerse={spinVerse}
              onOpenDeepDive={() => openWordStudy()}
              onWordClick={(wordStudy) => openWordStudy(wordStudy)}
              readingPlanHref={bibleReadingPlanHrefForReference(
                passage.code,
                passage.chapter,
              )}
              moreLabel={principles.length ? "More Life Essentials" : undefined}
            >
              <GeneGetzResourceCard principles={principles} />
            </BibleBingoVerseCard>
          );
        })()}

      {error && (
        <p className="mx-auto mt-5 max-w-xl rounded-2xl border border-red-200/20 bg-red-300/10 px-5 py-3 text-sm font-semibold text-red-100">
          {error}
        </p>
      )}

      {activeWordStudy && (
        <OriginalWordStudyModal
          passage={activeWordStudy.passage}
          wordStudy={activeWordStudy.wordStudy}
          wordStudies={wordStudies}
          verseUrl={verseUrl(activeWordStudy.passage)}
          onClose={() => setActiveWordStudy(null)}
        />
      )}
    </section>
  );
}
