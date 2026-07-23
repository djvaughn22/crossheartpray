"use client";

// In-app Scripture reader, backed by the hybrid provider boundary
// (src/lib/scripture/provider.ts).
//
// Reading priority — verified, never assumed:
//   1. A YouVersion Platform translation this application is genuinely
//      licensed for (server-proxied; the App Key never reaches the client).
//   2. The local public-domain World English Bible.
//   3. A Bible.com deep link when both fail. No dead ends.
//
// Translation truthfulness: the picker is generated from the live
// capability list (/api/scripture/translations). Text is always attributed
// to the translation actually on screen — when a licensed translation cannot
// load and WEB is shown instead, the reader says so plainly.
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
import ReadInContextButton from "./ReadInContextButton";
import ScriptureReferenceInput from "./ScriptureReferenceInput";
import TranslationPicker from "./TranslationPicker";

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
  const [translations, setTranslations] = useState<ScriptureTranslation[]>(
    () => provider.listAvailableTranslations(),
  );
  const [translation, setTranslation] = useState<ScriptureTranslation>(
    () => pickDefaultTranslation(provider.listAvailableTranslations(), null),
  );
  const userPickedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [justMarkedComplete, setJustMarkedComplete] = useState(false);

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
      onReferenceChange?.(reference);
    },
    [onReferenceChange],
  );

  // The translation whose text should render: the picked one when readable
  // here, otherwise local WEB (external-only picks just change the link).
  const readTranslation =
    translation.access === "readHere"
      ? translation
      : translations.find((entry) => entry.source === "local") ?? translation;

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- switching translation must show the loading state, not stale text under a new name
    setIsLoading(true);

    (async () => {
      try {
        let notice: string | null = null;
        let data: ScriptureChapter;

        if (readTranslation.source === "youVersion") {
          const missingBook =
            readTranslation.books &&
            readTranslation.books.length > 0 &&
            !readTranslation.books.includes(current.book);

          if (missingBook) {
            notice = `${readTranslation.label} doesn't include this book — showing the World English Bible (WEB) instead.`;
            data = await provider.loadChapter(current, { signal: controller.signal });
          } else {
            try {
              data = await provider.loadChapter(current, {
                signal: controller.signal,
                translation: readTranslation,
              });
            } catch (caught) {
              if (isAbortError(caught)) throw caught;
              notice = `Couldn't load ${readTranslation.label} right now — showing the World English Bible (WEB) instead.`;
              data = await provider.loadChapter(current, { signal: controller.signal });
            }
          }
        } else {
          data = await provider.loadChapter(current, { signal: controller.signal });
        }

        setChapterData(data);
        setLoadFailed(false);
        setFallbackNotice(notice);
      } catch (caught) {
        if (!isAbortError(caught)) {
          setChapterData(null);
          setLoadFailed(true);
          setFallbackNotice(null);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [current, readTranslation]);

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

  // Truthful labeling when the picked translation is external-only: the text
  // on screen is WEB, and the way to the picked translation stays clear.
  const unlicensedNotice =
    translation.access === "bibleComLink" && readTranslation.source === "local"
      ? `${translation.label} can't be read inside CrossHeartPray yet — showing the World English Bible (WEB). The Bible.com button below opens ${translation.label}.`
      : null;
  const notice = fallbackNotice ?? unlicensedNotice;

  const externalReference = targetVerse ? { ...current, verse: targetVerse } : current;
  const externalLabel =
    translation.access === "readHere" ? "Bible.com" : `${translation.label} · Bible.com`;

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
        inputClassName="min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-4 text-sm font-semibold text-white placeholder:text-white/30 outline-none ring-0 focus:border-white/40"
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
              Couldn&apos;t load {heading} here right now.
            </p>
            <div className="mt-5 flex justify-center">
              <ReadInContextButton
                reference={current}
                version={translation}
                label={`${heading} · Bible.com`}
              />
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
              {chapterData.verses.map(({ verse, text }) => (
                <p
                  key={verse}
                  data-verse={verse}
                  className={`flex items-baseline gap-2.5 rounded-xl px-2 py-[0.3rem] ${
                    isTargetVerse(verse)
                      ? "chp-verse-target bg-emerald-300/10 ring-1 ring-emerald-200/25"
                      : ""
                  }`}
                >
                  <span className="w-6 shrink-0 select-none text-right text-[0.68rem] font-bold leading-6 text-zinc-500">
                    {verse}
                  </span>
                  <span className="chp-scripture-serif min-w-0 flex-1 text-[1.05rem] leading-[1.8] text-slate-100 sm:text-lg sm:leading-8">
                    {text}
                  </span>
                </p>
              ))}
            </div>

            <p className="mx-auto mt-7 max-w-md border-t border-white/10 pt-4 text-center text-xs font-semibold leading-5 text-zinc-400">
              Reading here: {chapterData?.attribution ?? "World English Bible (WEB), public domain."}
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
                    onClick={() => {
                      onMarkComplete(readingId);
                      setJustMarkedComplete(true);
                    }}
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

        <ReadInContextButton
          reference={externalReference}
          version={translation}
          label={externalLabel}
          className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-2xl px-3 text-center text-xs font-bold leading-4 text-zinc-400 transition hover:text-white"
        />

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
    </section>
  );
}
