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

import { useCallback, useEffect, useRef, useState } from "react";
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
  className?: string;
  onReferenceChange?: (reference: ScriptureReference) => void;
};

const provider = getScriptureProvider();

function isAbortError(caught: unknown): boolean {
  return caught instanceof DOMException && caught.name === "AbortError";
}

export default function ScriptureReader({
  initialReference = { book: "JHN", chapter: 1 },
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

  const externalReference = targetVerse ? { ...current, verse: targetVerse } : current;
  const externalLabel =
    translation.access === "readHere"
      ? "Open on Bible.com"
      : `Read ${translation.label} on Bible.com`;

  const navButtonClass =
    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-4 text-sm font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <section
      className={`rounded-[1.75rem] border border-white/10 bg-black/20 p-4 text-left shadow-xl shadow-black/20 sm:p-6 ${className}`}
      aria-label="Scripture reader"
    >
      <ScriptureReferenceInput
        onSelect={(suggestion) => goTo(suggestion.reference)}
        placeholder="Go to a book, chapter, or verse"
        ariaLabel="Go to a book, chapter, or verse"
        clearOnSelect
      />

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => chapterData?.previous && goTo(chapterData.previous)}
          disabled={!chapterData?.previous || isLoading}
          className={navButtonClass}
          aria-label={
            chapterData?.previous
              ? `Previous chapter, ${formatScriptureReference(chapterData.previous)}`
              : "No previous chapter"
          }
        >
          ← Prev
        </button>

        <h3 className="min-w-0 truncate text-center text-xl font-black tracking-tight text-white sm:text-2xl">
          {heading}
        </h3>

        <button
          type="button"
          onClick={() => chapterData?.next && goTo(chapterData.next)}
          disabled={!chapterData?.next || isLoading}
          className={navButtonClass}
          aria-label={
            chapterData?.next
              ? `Next chapter, ${formatScriptureReference(chapterData.next)}`
              : "No next chapter"
          }
        >
          Next →
        </button>
      </div>

      {!isLoading && fallbackNotice ? (
        <p
          role="status"
          className="mt-3 rounded-xl border border-amber-200/20 bg-amber-300/10 px-3 py-2 text-xs font-semibold leading-5 text-amber-100"
        >
          {fallbackNotice}
        </p>
      ) : null}

      <div
        ref={scrollRef}
        className="mt-4 max-h-[60svh] overflow-y-auto rounded-2xl border border-white/10 bg-black/15 px-4 py-4 sm:px-6"
      >
        {isLoading && (
          <p className="py-8 text-center text-sm font-bold text-zinc-300">
            Opening {heading}...
          </p>
        )}

        {!isLoading && loadFailed && (
          <div className="py-8 text-center">
            <p className="text-sm font-semibold text-zinc-300">
              Couldn&apos;t load {heading} here right now.
            </p>
            <div className="mt-4 flex justify-center">
              <ReadInContextButton
                reference={current}
                version={translation}
                label={`Read ${heading} on Bible.com`}
              />
            </div>
          </div>
        )}

        {!isLoading && chapterData && (
          <div className="space-y-0.5">
            {chapterData.verses.map(({ verse, text }) => (
              <p
                key={verse}
                data-verse={verse}
                className={`rounded-lg px-2 py-1.5 text-base leading-7 text-slate-100 sm:text-lg sm:leading-8 ${
                  targetVerse === verse ? "bg-white/15 ring-1 ring-white/25" : ""
                }`}
              >
                <sup className="mr-1.5 select-none text-[0.7em] font-black text-zinc-400">
                  {verse}
                </sup>
                {text}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold text-zinc-400">
          Reading here: {chapterData?.attribution ?? "World English Bible (WEB), public domain."}
        </p>
        <div className="flex items-center gap-2">
          <TranslationPicker
            translations={translations}
            selectedId={translation.id}
            onChange={(picked) => {
              userPickedRef.current = true;
              setTranslation(picked);
              saveTranslationPreference(picked.id);
            }}
          />
          <ReadInContextButton
            reference={externalReference}
            version={translation}
            label={externalLabel}
          />
        </div>
      </div>
    </section>
  );
}
