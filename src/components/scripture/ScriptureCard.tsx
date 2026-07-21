"use client";

// Small reusable passage card: reference, verse text, attribution, and a
// Bible.com link. Callers that already have the verse text (bingo cards,
// Daily Hope) pass it in and no request is made; otherwise the text is
// fetched from the local-WEB chapter endpoint.

import { useEffect, useState } from "react";
import {
  formatScriptureReference,
  getScriptureProvider,
  type ScriptureReference,
} from "../../lib/scripture";
import ReadInContextButton from "./ReadInContextButton";

type ScriptureCardProps = {
  reference: ScriptureReference;
  /** Verse text if the caller already has it — skips the fetch entirely. */
  text?: string;
  className?: string;
};

export default function ScriptureCard({ reference, text, className = "" }: ScriptureCardProps) {
  const [fetchedText, setFetchedText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const needsFetch = !text && reference.chapter !== undefined && reference.verse !== undefined;

  const { book, chapter, verse, endVerse } = reference;

  useEffect(() => {
    if (!needsFetch) return;
    const controller = new AbortController();

    (async () => {
      try {
        const data = await getScriptureProvider().loadChapter(
          { book, chapter },
          { signal: controller.signal },
        );
        const last = endVerse ?? verse!;
        const picked = data.verses
          .filter((entry) => entry.verse >= verse! && entry.verse <= last)
          .map((entry) => entry.text)
          .join(" ");
        if (picked) setFetchedText(picked);
        else setFailed(true);
      } catch (caught) {
        if (!(caught instanceof DOMException && caught.name === "AbortError")) {
          setFailed(true);
        }
      }
    })();

    return () => controller.abort();
  }, [needsFetch, book, chapter, verse, endVerse]);

  const displayText = text ?? fetchedText;

  return (
    <article
      className={`rounded-[1.75rem] border border-white/10 bg-black/20 p-5 text-left shadow-xl shadow-black/20 sm:p-6 ${className}`}
    >
      <p className="text-sm font-black uppercase tracking-[0.18em] text-zinc-400">
        {formatScriptureReference(reference)}
      </p>

      {displayText ? (
        <p className="mt-3 text-lg font-semibold leading-8 text-slate-100">{displayText}</p>
      ) : failed ? (
        <p className="mt-3 text-sm font-semibold text-zinc-300">
          Read this passage on Bible.com below.
        </p>
      ) : needsFetch ? (
        <p className="mt-3 text-sm font-semibold text-zinc-300">Opening...</p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold text-zinc-400">
          World English Bible (WEB), public domain.
        </p>
        <ReadInContextButton reference={reference} label="Read in context" />
      </div>
    </article>
  );
}
