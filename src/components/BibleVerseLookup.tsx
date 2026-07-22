"use client";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
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
import { track } from "../lib/analytics";
import {
  SCRIPTURE_BOOKS,
  bibleComUrlForPassage,
  getScriptureBook,
  getScriptureProvider,
  parseScriptureReference,
  resolveScriptureSelection,
  type ResolvedScriptureReference,
  type ScriptureReference,
} from "../lib/scripture";
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

const provider = getScriptureProvider();

// Spin pools by USFM code — same canonical book table as everything else.
const GOSPEL_CODES = ["MAT", "MRK", "LUK", "JHN"];
const EPISTLE_CODES = [
  "ROM", "1CO", "2CO", "GAL", "EPH", "PHP", "COL", "1TH", "2TH",
  "1TI", "2TI", "TIT", "PHM", "HEB", "JAS", "1PE", "2PE", "1JN",
  "2JN", "3JN", "JUD",
];

function spinPool(spinMode: SpinMode): string[] {
  if (spinMode === "gospel") return GOSPEL_CODES;
  if (spinMode === "epistles") return EPISTLE_CODES;
  if (spinMode === "proverbs") return ["PRO"];
  if (spinMode === "all") return SCRIPTURE_BOOKS.map((book) => book.usfm);
  return [...GOSPEL_CODES, ...EPISTLE_CODES];
}

/** Uniform-by-chapter random chapter reference from the pool. */
function randomChapterReference(spinMode: SpinMode): ScriptureReference {
  const books = spinPool(spinMode)
    .map((code) => getScriptureBook(code))
    .filter((book): book is NonNullable<typeof book> => Boolean(book));
  const totalChapters = books.reduce((sum, book) => sum + book.chapters, 0);
  let pick = Math.floor(Math.random() * totalChapters);
  for (const book of books) {
    if (pick < book.chapters) return { book: book.usfm, chapter: pick + 1 };
    pick -= book.chapters;
  }
  return { book: books[0].usfm, chapter: 1 };
}

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

/** The verse card shape, derived entirely from one canonical resolution. */
function passageFromResolved(
  resolved: ResolvedScriptureReference,
  text: string,
): BibleBingoCardPassage {
  return {
    label: resolved.label,
    book: resolved.bookName,
    code: resolved.bookCode,
    chapter: String(resolved.chapter),
    verse: String(resolved.verse ?? 1),
    ...(resolved.endVerse !== undefined ? { endVerse: String(resolved.endVerse) } : {}),
    text,
    group: resolved.testament === "OT" ? "Old Testament" : "New Testament",
  };
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
  const [error, setError] = useState("");
  const [isOpeningInitialVerse, setIsOpeningInitialVerse] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isLoadingWordStudies, setIsLoadingWordStudies] = useState(false);
  const [activeWordStudy, setActiveWordStudy] = useState<ActiveLookupWordStudy | null>(null);

  // Request identity: only the newest selection may write results. A slow
  // earlier lookup can never overwrite a faster later one, so the search
  // field, verse card, and every action always describe the same reference.
  const requestSeq = useRef(0);

  const showSelection = useCallback(
    async (
      reference: ScriptureReference,
      options?: { textOverride?: string; claimedId?: number },
    ): Promise<boolean> => {
      const requestId = options?.claimedId ?? ++requestSeq.current;
      if (requestSeq.current !== requestId) return false;

      // Search selections always land on a concrete verse.
      const resolved = resolveScriptureSelection({
        ...reference,
        chapter: reference.chapter ?? 1,
        verse: reference.verse ?? 1,
      });

      if (!resolved) {
        setPassage(null);
        setError("Couldn’t find that reference. Try one like John 3:16.");
        return false;
      }

      setError("");

      try {
        const chapterData = await provider.loadChapter(resolved.chapterReference);
        if (requestSeq.current !== requestId) return false;

        const firstVerse = resolved.verse ?? 1;
        const lastVerse = resolved.endVerse ?? firstVerse;
        const picked = chapterData.verses.filter(
          (entry) => entry.verse >= firstVerse && entry.verse <= lastVerse,
        );

        if (!picked.length) {
          setPassage(null);
          setError(
            `${resolved.chapterLabel} has ${chapterData.verses.length} verses.`,
          );
          return false;
        }

        const text =
          options?.textOverride ?? picked.map((entry) => entry.text).join(" ");

        setPassage(passageFromResolved(resolved, text));
        // The search field mirrors the canonical selection.
        setQuery(resolved.label);
        return true;
      } catch {
        if (requestSeq.current !== requestId) return false;
        setPassage(null);
        setError(`Couldn’t open ${resolved.label} right now.`);
        return false;
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const parsed = parseScriptureReference(initialReference);
      if (parsed) {
        await showSelection(parsed, { textOverride: initialTextOverride });
      }
      if (!cancelled) setIsOpeningInitialVerse(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [initialReference, initialTextOverride, showSelection]);

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

    const parsed = parseScriptureReference(trimmedQuery);

    if (!parsed) {
      // An invalid search may not keep the previous verse's actions around.
      requestSeq.current += 1;
      setPassage(null);
      setError(`Couldn’t find “${trimmedQuery}”. Try a reference like John 3:16.`);
      return;
    }

    setIsSearching(true);
    const ok = await showSelection(parsed);
    if (ok) track("verse_lookup", { search_term: trimmedQuery });
    setIsSearching(false);
  }

  async function spinVerse() {
    const claimedId = ++requestSeq.current;
    setIsSpinning(true);
    setError("");

    try {
      const chapterReference = randomChapterReference(spinMode);
      const chapterData = await provider.loadChapter(chapterReference);
      if (requestSeq.current !== claimedId) return;

      const randomVerse =
        chapterData.verses[Math.floor(Math.random() * chapterData.verses.length)];

      const ok = await showSelection(
        { ...chapterReference, verse: randomVerse?.verse ?? 1 },
        { claimedId },
      );
      if (ok) track("verse_spin", { mode: spinMode });
    } catch {
      if (requestSeq.current === claimedId) {
        setError("Couldn’t shuffle a verse right now. Try again.");
      }
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
              value={query}
              bookSelection="refine"
              onQueryChange={setQuery}
              onSelect={(suggestion) => {
                setIsSearching(true);
                showSelection(suggestion.reference)
                  .then((ok) => {
                    if (ok) {
                      track("verse_lookup", { search_term: suggestion.label });
                    }
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
              onSpinVerse={spinVerse}
              onOpenDeepDive={() => openWordStudy()}
              onWordClick={(wordStudy) => openWordStudy(wordStudy)}
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
