"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { downloadReadingPlanPdf, readingPlanPdfAsset } from "@/lib/readingPlanPdf";
import {
  DEFAULT_READING_PLAN_DURATION,
  subscribeToReadingPlanDuration,
  type ReadingPlanDuration,
} from "@/lib/readingPlanDuration";

// Read opens the PDF in a NEW tab so the reading-plan page (and its saved
// progress) stays put; Download saves the file without navigating anywhere.
// Neither action may ever replace this page with the browser's PDF viewer —
// that's the mobile trap this component exists to prevent. The Back link is
// the visible way home after the PDF detour.
type PdfStatus = "idle" | "preparing" | "downloaded" | "opened-in-tab" | "failed";

const STATUS_MESSAGES: Record<Exclude<PdfStatus, "idle">, string> = {
  preparing: "Preparing PDF…",
  downloaded: "PDF downloaded.",
  "opened-in-tab": "The PDF opened in a new tab so you can save it.",
  failed: "Couldn’t open the PDF. Try again.",
};

export default function ReadingPlanPdfActions() {
  const [status, setStatus] = useState<PdfStatus>("idle");
  // These buttons act on whichever pace the board is showing. The switch
  // lives further down the page, so the choice arrives through the shared
  // duration store rather than through props.
  const [duration, setDuration] = useState<ReadingPlanDuration>(
    DEFAULT_READING_PLAN_DURATION,
  );
  const clearTimerRef = useRef<number | null>(null);
  // Rapid taps land before React re-renders the disabled state, so the guard
  // must be a ref, not the status closure — one tap, one download.
  const busyRef = useRef(false);

  useEffect(() => {
    return () => {
      if (clearTimerRef.current !== null) window.clearTimeout(clearTimerRef.current);
    };
  }, []);

  useEffect(() => subscribeToReadingPlanDuration(setDuration), []);

  const planLabel = duration === 104 ? "104-week" : "52-week";
  const { href: pdfHref } = readingPlanPdfAsset(duration);

  async function handleDownload() {
    if (busyRef.current) return;
    busyRef.current = true;
    if (clearTimerRef.current !== null) {
      window.clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }

    setStatus("preparing");
    const result = await downloadReadingPlanPdf(duration);
    busyRef.current = false;
    setStatus(result);

    if (result !== "failed") {
      clearTimerRef.current = window.setTimeout(() => {
        clearTimerRef.current = null;
        setStatus("idle");
      }, 6000);
    }
  }

  return (
    <span className="flex w-full max-w-sm flex-col items-stretch gap-2 sm:w-auto">
      <span className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-center">
        <a
          href={pdfHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Read the ${planLabel} Bible Reading Plan PDF in a new tab`}
          className="inline-flex min-h-[2.75rem] items-center justify-center rounded-full border border-white/15 bg-white/10 px-6 py-3 text-center text-sm font-black uppercase tracking-[0.18em] text-slate-100 transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200"
        >
          Read the Plan (PDF)
        </a>
        <button
          type="button"
          onClick={handleDownload}
          disabled={status === "preparing"}
          aria-label={`Download the ${planLabel} Bible Reading Plan PDF`}
          className="inline-flex min-h-[2.75rem] items-center justify-center rounded-full px-6 py-3 text-center text-sm font-bold text-slate-300 underline-offset-4 transition hover:text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200 disabled:cursor-wait disabled:opacity-70"
        >
          {status === "preparing" ? "Preparing PDF…" : "Download PDF"}
        </button>
      </span>

      <span
        role="status"
        aria-live="polite"
        className="block min-h-[1.25rem] text-center text-xs font-semibold text-emerald-100"
      >
        {status === "idle" ? "" : STATUS_MESSAGES[status]}
      </span>

      <Link
        href="/"
        className="inline-flex min-h-[2.75rem] items-center justify-center text-center text-xs font-bold text-slate-400 underline-offset-4 transition hover:text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200"
      >
        ← Back to CrossHeartPray
      </Link>
    </span>
  );
}
