"use client";

// In-app Scripture reader, backed by the hybrid provider boundary
// (src/lib/scripture/provider.ts).
//
// Reading priority — verified, never assumed:
//   1. A YouVersion Platform translation this application is genuinely
//      licensed for (server-proxied; the App Key never reaches the client).
//   2. The local public-domain text in the active site-wide translation
//      (src/lib/scripture/translationConfig.ts — BSB by default).
//   3. A Bible.com deep link when both fail. No dead ends.
//
// Translation truthfulness: the picker is generated from the live
// capability list (/api/scripture/translations). Text is always attributed
// to the translation actually on screen — when a licensed translation cannot
// load and the local text is shown instead, the reader says so plainly.
//
// Layout: one calm Scripture card. Top bar (reference, translation, optional
// close), quiet go-to search, the Scripture surface as the visual center, and
// a thumb-friendly Previous / Bible.com / Next bar at the bottom. The "fill"
// variant stretches to its container (the shared overlay sheet); "inline"
// keeps a bounded scroll for in-page embeds like Explore Bible.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  fetchAvailableTranslations,
  formatScriptureReference,
  getScriptureProvider,
  loadTranslationPreference,
  pickDefaultTranslation,
  saveTranslationPreference,
  type ScriptureChapter,
  type ScriptureReference,
  type ScriptureTranslation,
} from "../../lib/scripture";
import {
  ACTIVE_BIBLE_TRANSLATION,
  SUPPORTED_BIBLE_TRANSLATIONS,
} from "../../lib/scripture/translationConfig";
import ScriptureReferenceInput from "./ScriptureReferenceInput";
import TranslationPicker from "./TranslationPicker";
import VerifiedVerseText from "../VerifiedVerseText";
import OriginalWordStudyModal from "../OriginalWordStudyModal";
import {
  fetchVerifiedWordStudies,
  wordStudyLookupKey,
  type VerifiedWordStudy,
  type WordStudyPassage,
} from "../../lib/originalLanguageWordStudy";

// Deep Dive's word-level alignment is verified against ONE English text.
//
// The verified word studies map an English word in a specific verse to the
// Hebrew/Greek term it renders, and that mapping was built from the Berean
// Standard Bible: John 3:16 aligns "one" and "only" to G3439 (BSB's "one and
// only Son"), which is not how the KJV or the WEB words that verse.
//
// Translations differ in word choice, word count, and which English word
// carries which original term, so those mappings are not transferable. We
// therefore offer dotted words only on the translation they were verified
// against. Showing them over other translations would be guessing at
// Scripture, which this app does not do.
const DEEP_DIVE_ALIGNED_TRANSLATION =
  SUPPORTED_BIBLE_TRANSLATIONS.BSB;

type ScriptureReaderProps = {
  /** Where the reader opens. Book-only references open chapter 1. */
  initialReference?: ScriptureReference;
  /** "inline" = bounded card in a page; "fill" = stretch to the container. */
  variant?: "inline" | "fill";
  /** When set, the top bar renders a close control. */
  onRequestClose?: () => void;
  /** Quiet extra content after the chapter text (e.g. Life Essentials). */
  afterScripture?: ReactNode;
  /**
   * Restrict Previous/Next to an assigned passage (same book) — the Reading
   * Plan cell reader. Intentional navigation elsewhere via the go-to search
   * releases the bounds.
   */
  chapterBounds?: { book: string; startChapter: number; endChapter: number };
  /** Reading plan context to display in header (week, day, book, chapters). */
  readingContext?: {
    week: number;
    day: string;
    book: string;
    startChapter: number;
    endChapter: number;
  };
  /** Reading ID for completion tracking in Bible Reading Plan. */
  readingId?: string;
  /** Whether this reading is already marked complete. */
  isCompleted?: boolean;
  /** Called when user marks this reading complete. */
  onMarkComplete?: (readingId: string) => void;
  className?: string;
  onReferenceChange?: (reference: ScriptureReference) => void;
};

const provider = getScriptureProvider();

// Scripture-shaped skeleton line widths — calm, no spinner.
const SKELETON_WIDTHS = ["92%", "85%", "96%", "78%", "90%", "83%", "94%", "70%"];

function isAbortError(caught: unknown): boolean {
  return caught instanceof DOMException && caught.name === "AbortError";
}

export default function ScriptureReader({
  initialReference = { book: "JHN", chapter: 1 },
  variant = "inline",
  onRequestClose,
  afterScripture,
  chapterBounds,
  readingContext,
  readingId,
  isCompleted,
  onMarkComplete,
  className = "",
  onReferenceChange,
}: ScriptureReaderProps) {
  const [current, setCurrent] = useState<ScriptureReference>({
    book: initialReference.book,
    chapter: initialReference.chapter ?? 1,
  });
  const [targetVerse, setTargetVerse] = useState<number | null>(
    initialReference.verse ?? null,
  );
  const [targetEndVerse, setTargetEndVerse] = useState<number | null>(
    initialReference.endVerse ?? null,
  );
  const [chapterData, setChapterData] = useState<ScriptureChapter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  // Bumped by Try again, so a failed load can be retried without changing
  // the reference or the translation.
  const [reloadToken, setReloadToken] = useState(0);
  const latestRequestRef = useRef(0);
  const [translations, setTranslations] = useState<ScriptureTranslation[]>(
    () => provider.listAvailableTranslations(),
  );
  const [translation, setTranslation] = useState<ScriptureTranslation>(
    () => pickDefaultTranslation(provider.listAvailableTranslations(), null),
  );
  const userPickedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // ── Deep Dive — the same verified Greek/Hebrew word study Bible Bingo 7
  // uses, available on every verse of every chapter read here. Loads once
  // for the entire chapter, not per-verse on demand.
  const [chapterWordStudies, setChapterWordStudies] = useState<
    Record<string, VerifiedWordStudy[]>
  >({});
  const [activeWordStudy, setActiveWordStudy] = useState<{
    passage: WordStudyPassage;
    wordStudy: VerifiedWordStudy;
  } | null>(null);
  const chapterStudiesRef = useRef<string | null>(null);

  const passageForVerse = useCallback(
    (verse: number, text: string): WordStudyPassage => ({
      label: `${chapterData?.bookName ?? current.book} ${current.chapter ?? 1}:${verse}`,
      code: current.book,
      chapter: String(current.chapter ?? 1),
      verse: String(verse),
      text,
    }),
    [chapterData, current],
  );

  // Upgrade to the live capability list once it arrives; a user's explicit
  // in-session pick is never overridden.
  useEffect(() => {
    let cancelled = false;
    fetchAvailableTranslations().then((available) => {
      if (cancelled) return;
      setTranslations(available);
      setTranslation((previous) =>
        userPickedRef.current
          ? previous
          : pickDefaultTranslation(available, loadTranslationPreference()),
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const goTo = useCallback(
    (reference: ScriptureReference) => {
      setIsLoading(true);
      setCurrent({ book: reference.book, chapter: reference.chapter ?? 1 });
      setTargetVerse(reference.verse ?? null);
      setTargetEndVerse(reference.endVerse ?? null);
      // A new chapter starts fresh — clear Deep Dive and word studies.
      setChapterWordStudies({});
      setActiveWordStudy(null);
      onReferenceChange?.(reference);
    },
    [onReferenceChange],
  );

  // Every translation the picker offers can genuinely be rendered, so the
  // selected translation is the one that loads. Nothing is ever swapped in
  // behind its name.
  const readTranslation = translation;

  useEffect(() => {
    const controller = new AbortController();
    // Only the newest request may write state. Aborting stops the network,
    // but a request that already resolved — or one answered instantly from
    // the chapter cache — would otherwise still land after a newer pick and
    // put the previous translation's text under the current label.
    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;
    const isStale = () => latestRequestRef.current !== requestId;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- switching translation must show the loading state, not stale text under a new name
    setIsLoading(true);

    (async () => {
      try {
        const missingBook =
          readTranslation.source === "youVersion" &&
          readTranslation.books &&
          readTranslation.books.length > 0 &&
          !readTranslation.books.includes(current.book);

        if (missingBook) {
          throw new Error(
            `${readTranslation.label} does not include ${current.book}.`,
          );
        }

        const data = await provider.loadChapter(current, {
          signal: controller.signal,
          translation: readTranslation,
        });

        if (isStale()) return;

        setChapterData(data);
        setLoadFailed(false);
        setFallbackNotice(null);
      } catch (caught) {
        if (isAbortError(caught) || isStale()) return;
        // Failure is reported as failure. Showing a different translation
        // here is what made the reader lie about what it was displaying.
        setChapterData(null);
        setLoadFailed(true);
        setFallbackNotice(null);
      } finally {
        if (!isStale()) setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [current, readTranslation, reloadToken]);

  // Judged on the translation actually rendered, not the one requested, so a
  // pending switch can never briefly offer word links over the wrong text.
  const deepDiveAligned =
    (chapterData?.translation?.id ?? translation.id) ===
    DEEP_DIVE_ALIGNED_TRANSLATION.bibleComId;

  // Load verified word studies for all verses in the chapter once chapter data
  // arrives — only for the translation they are actually aligned to, so an
  // unaligned translation costs nothing and can never render word links.
  useEffect(() => {
    if (!chapterData || !deepDiveAligned) return;

    const chapterKey = `${current.book}|${current.chapter ?? 1}`;
    if (chapterStudiesRef.current === chapterKey) return;
    chapterStudiesRef.current = chapterKey;

    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        const chapterStudies: Record<string, VerifiedWordStudy[]> = {};

        await Promise.all(
          chapterData.verses.map(({ verse }) =>
            fetchVerifiedWordStudies(
              {
                code: current.book,
                chapter: String(current.chapter ?? 1),
                verse: String(verse),
              },
              { signal: controller.signal }
            )
              .then((studies) => {
                const key = wordStudyLookupKey({
                  code: current.book,
                  chapter: String(current.chapter ?? 1),
                  verse: String(verse),
                });
                chapterStudies[key] = studies;
              })
              .catch(() => {
                const key = wordStudyLookupKey({
                  code: current.book,
                  chapter: String(current.chapter ?? 1),
                  verse: String(verse),
                });
                chapterStudies[key] = [];
              })
          )
        );

        if (!cancelled) {
          setChapterWordStudies(chapterStudies);
        }
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") throw caught;
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [chapterData, current, deepDiveAligned]);

  // Scroll the target verse into view once its chapter is on screen;
  // otherwise start each chapter at the top.
  useEffect(() => {
    if (!chapterData) return;
    if (targetVerse) {
      const el = scrollRef.current?.querySelector<HTMLElement>(
        `[data-verse="${targetVerse}"]`,
      );
      el?.scrollIntoView({ block: "center" });
    } else {
      scrollRef.current?.scrollTo({ top: 0 });
    }
  }, [chapterData, targetVerse]);

  // While loading, name the chapter being opened — not the one still on
  // screen from before.
  const heading =
    !isLoading && chapterData
      ? `${chapterData.bookName} ${chapterData.chapter}`
      : formatScriptureReference({ book: current.book, chapter: current.chapter });

  // The picker only offers translations that genuinely render, so there is
  // no "showing something else instead" case left to describe.
  const notice = fallbackNotice;


  const lastTargetVerse = targetEndVerse ?? targetVerse;
  const isTargetVerse = (verse: number) =>
    targetVerse !== null && verse >= targetVerse && verse <= (lastTargetVerse ?? targetVerse);

  // Assigned-passage bounds: clamp Previous/Next while reading inside the
  // assignment; a go-to search outside it releases the clamp intentionally.
  const boundsActive = Boolean(
    chapterBounds &&
      current.book === chapterBounds.book &&
      current.chapter !== undefined &&
      current.chapter >= chapterBounds.startChapter &&
      current.chapter <= chapterBounds.endChapter,
  );
  const withinBounds = (reference: ScriptureReference | null | undefined) =>
    Boolean(
      reference &&
        (!boundsActive ||
          (chapterBounds &&
            reference.book === chapterBounds.book &&
            (reference.chapter ?? 1) >= chapterBounds.startChapter &&
            (reference.chapter ?? 1) <= chapterBounds.endChapter)),
    );
  const previousReference =
    chapterData?.previous && withinBounds(chapterData.previous) ? chapterData.previous : null;
  const nextReference =
    chapterData?.next && withinBounds(chapterData.next) ? chapterData.next : null;

  const fill = variant === "fill";

  const navButtonClass =
    "inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-3 text-sm font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <section
      className={
        fill
          ? `flex h-full min-h-0 flex-col text-left ${className}`
          : `flex flex-col rounded-[1.75rem] border border-white/10 bg-black/20 p-4 text-left shadow-xl shadow-black/20 sm:p-5 ${className}`
      }
      aria-label="Scripture reader"
    >
      {/* Top bar: reference context, translation, optional close. */}
      <div
        className={`flex shrink-0 items-center gap-2.5 ${fill ? "px-4 pt-3 sm:px-5 sm:pt-4" : ""}`}
      >
        {onRequestClose ? (
          <button
            type="button"
            onClick={onRequestClose}
            aria-label="Close Scripture reader"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-base font-black text-white transition hover:bg-white/20"
          >
            ✕
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="chp-scripture-serif truncate text-lg font-bold tracking-tight text-white sm:text-xl">
            {heading}
          </p>
          {readingContext && (
            <p className="mt-1 truncate text-xs font-semibold text-slate-300">
              Week {readingContext.week} · {readingContext.day} · {readingContext.book}{" "}
              {readingContext.startChapter === readingContext.endChapter
                ? readingContext.startChapter
                : `${readingContext.startChapter}–${readingContext.endChapter}`}
            </p>
          )}
        </div>
        <TranslationPicker
          compact
          translations={translations}
          selectedId={translation.id}
          onChange={(picked) => {
            userPickedRef.current = true;
            setTranslation(picked);
            saveTranslationPreference(picked.id);
          }}
        />
      </div>

      {/* Quiet go-to search. */}
      <ScriptureReferenceInput
        className={`mt-2.5 shrink-0 ${fill ? "px-4 sm:px-5" : ""}`}
        inputClassName="chp-reader-goto min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-4 text-sm font-semibold text-white placeholder:text-white/30 outline-none ring-0 focus:border-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
        onSelect={(suggestion) => goTo(suggestion.reference)}
        placeholder="Go to a book, chapter, or verse"
        ariaLabel="Go to a book, chapter, or verse"
        clearOnSelect
      />

      {/* The Scripture surface — the visual center. */}
      <div
        ref={scrollRef}
        className={`chp-scripture-surface overflow-y-auto rounded-2xl border border-white/10 bg-black/15 px-3 py-5 sm:px-5 ${
          fill ? "mx-4 mt-3 min-h-0 flex-1 sm:mx-5" : "mt-3 max-h-[62svh]"
        }`}
      >
        {isLoading && (
          <>
            <div aria-hidden="true" className="space-y-3.5 px-2 py-6">
              <div className="chp-scripture-skeleton mx-auto h-6 w-40 rounded-full bg-white/10 motion-safe:animate-pulse" />
              <div className="h-2" />
              {SKELETON_WIDTHS.map((width, index) => (
                <div
                  key={index}
                  style={{ width }}
                  className="chp-scripture-skeleton h-4 rounded-full bg-white/10 motion-safe:animate-pulse"
                />
              ))}
            </div>
            <p role="status" className="sr-only">
              Opening {heading}
            </p>
          </>
        )}

        {!isLoading && loadFailed && (
          <div className="py-10 text-center">
            <p className="text-sm font-semibold leading-6 text-zinc-300">
              Couldn&apos;t load {heading} in {translation.label} right now.
            </p>
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => setReloadToken((token) => token + 1)}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-black text-white transition hover:bg-white/15"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {!isLoading && chapterData && (
          <>
            {/* Chapter opening — the quiet card header. */}
            <header className="pb-3 text-center">
              <p aria-hidden="true" className="text-xs tracking-[0.5em]">
                ✝️ ❤️ 🙏
              </p>
              <h3 className="chp-scripture-serif mt-2.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {chapterData.bookName} {chapterData.chapter}
              </h3>
              <hr className="mx-auto mt-3.5 w-16 border-white/15" />
              <p className="mx-auto mt-3 max-w-xs text-xs font-semibold leading-5 text-zinc-400">
                {deepDiveAligned
                  ? "Dotted words open the original Hebrew or Greek study."
                  : `The original Hebrew and Greek study is verified against the ${DEEP_DIVE_ALIGNED_TRANSLATION.shortName}. Switch to it to open words here.`}
              </p>
            </header>

            {notice ? (
              <p
                role="status"
                className="mx-auto mb-4 max-w-md rounded-xl border border-amber-200/20 bg-amber-300/10 px-3.5 py-2.5 text-center text-xs font-semibold leading-5 text-amber-100"
              >
                {notice}
              </p>
            ) : null}

            <div className="mx-auto max-w-[38rem]">
              {chapterData.verses.map(({ verse, text }) => {
                const studyKey = wordStudyLookupKey({
                  code: current.book,
                  chapter: String(current.chapter ?? 1),
                  verse: String(verse),
                });
                // Only the aligned translation gets clickable words; other
                // translations render as plain, honest Scripture.
                const studies = deepDiveAligned
                  ? chapterWordStudies[studyKey] ?? []
                  : [];

                return (
                  <div
                    key={verse}
                    data-verse={verse}
                    className={`rounded-xl ${
                      isTargetVerse(verse)
                        ? "chp-verse-target bg-emerald-300/10 ring-1 ring-emerald-200/25"
                        : ""
                    }`}
                  >
                    <p className="flex items-baseline gap-2.5 px-2 py-[0.3rem]">
                      <span className="w-6 shrink-0 select-none text-right text-[0.68rem] font-bold leading-6 text-zinc-500">
                        {verse}
                      </span>
                      <span className="chp-scripture-serif min-w-0 flex-1 break-words text-[1.05rem] leading-[1.8] text-slate-100 sm:text-lg sm:leading-8">
                        <VerifiedVerseText
                          passage={passageForVerse(verse, text)}
                          wordStudies={studies}
                          onWordClick={(wordStudy) =>
                            setActiveWordStudy({
                              passage: passageForVerse(verse, text),
                              wordStudy,
                            })
                          }
                        />
                      </span>
                    </p>
                  </div>
                );
              })}
            </div>

            <p className="mx-auto mt-7 max-w-md border-t border-white/10 pt-4 text-center text-xs font-semibold leading-5 text-zinc-400">
              Reading here: {chapterData?.attribution ?? ACTIVE_BIBLE_TRANSLATION.attribution}
            </p>

            {afterScripture}

            {/* Mark complete button - show only on final chapter of Bible Reading Plan reading */}
            {readingContext &&
              chapterBounds &&
              current.chapter === chapterBounds.endChapter &&
              readingId &&
              onMarkComplete && (
                <div className="mx-auto mt-8 max-w-md space-y-3">
                  <button
                    type="button"
                    onClick={() => onMarkComplete(readingId)}
                    aria-pressed={isCompleted}
                    aria-label={isCompleted ? "Mark this reading as unread" : "Mark this day read"}
                    className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
                  >
                    {isCompleted ? "Mark unread" : "Mark this day read"}
                  </button>
                  {isCompleted && (
                    <>
                      <p className="text-center text-xs font-semibold text-slate-300">
                        Marked read
                      </p>
                      <button
                        type="button"
                        onClick={onRequestClose}
                        className="w-full rounded-xl bg-slate-700 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
                      >
                        Close and return to plan
                      </button>
                    </>
                  )}
                </div>
              )}
          </>
        )}
      </div>

      {/* Bottom navigation — thumb-friendly, never covering Scripture. */}
      <div
        className={`flex shrink-0 items-center gap-2.5 ${
          fill
            ? "px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-5"
            : "pt-3"
        }`}
      >
        <button
          type="button"
          onClick={() => previousReference && goTo(previousReference)}
          disabled={!previousReference || isLoading}
          className={navButtonClass}
          aria-label={
            previousReference
              ? `Previous chapter, ${formatScriptureReference(previousReference)}`
              : boundsActive
                ? "Start of this reading"
                : "No previous chapter"
          }
        >
          ← Previous
        </button>

        <span
          aria-hidden="true"
          className="inline-flex min-h-12 shrink-0 items-center justify-center px-3 text-center text-xs font-bold leading-4 text-zinc-500"
        >
          {heading}
        </span>

        <button
          type="button"
          onClick={() => nextReference && goTo(nextReference)}
          disabled={!nextReference || isLoading}
          className={navButtonClass}
          aria-label={
            nextReference
              ? `Next chapter, ${formatScriptureReference(nextReference)}`
              : boundsActive
                ? "End of this reading"
                : "No next chapter"
          }
        >
          Next →
        </button>
      </div>

      {/* The shared Deep Dive panel — identical to Bible Bingo 7's. */}
      {activeWordStudy ? (
        <OriginalWordStudyModal
          passage={activeWordStudy.passage}
          wordStudy={activeWordStudy.wordStudy}
          wordStudies={
            chapterWordStudies[wordStudyLookupKey(activeWordStudy.passage)] ?? []
          }
          onClose={() => setActiveWordStudy(null)}
        />
      ) : null}
    </section>
  );
}
