"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type CardLegendItem = {
  term: string;
  detail: string;
};

type CardInfoLegendProps = {
  items?: CardLegendItem[];
  className?: string;
};

// The one static place that explains every card control, so the cards
// themselves stay clean. Opens from a small "?" button.
export const DEFAULT_CARD_LEGEND: CardLegendItem[] = [
  {
    term: "Shuffle / Deal",
    detail: "Draws a fresh verse for this card.",
  },
  {
    term: "Read",
    detail:
      "Open the verse or the whole chapter in the Holy Bible app, or jump into the 52-week reading plan.",
  },
  {
    term: "Underlined words",
    detail:
      "Tap any underlined word in the verse to see the original Greek or Hebrew behind it.",
  },
  {
    term: "Deep Dive",
    detail:
      "Verified original-language word study: source word, pronunciation, Strong's number, and meaning.",
  },
  {
    term: "Share",
    detail:
      "Send the card by text or email, or save it as a share-ready image for any social app.",
  },
  {
    term: "More Life Essentials",
    detail:
      "Bible principles from Dr. Gene Getz matched to this verse, with his teaching video.",
  },
  {
    term: "Books in this Lane",
    detail:
      "Every Bible book this card draws from, and where this draw landed in the lane.",
  },
];

export default function CardInfoLegend({
  items = DEFAULT_CARD_LEGEND,
  className = "",
}: CardInfoLegendProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="How this card works"
        title="How this card works"
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-sm font-black text-slate-200 shadow-lg shadow-black/20 transition hover:bg-white/15 ${className}`}
      >
        ?
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                type="button"
                aria-label="Close card guide"
                onClick={() => setOpen(false)}
                className="fixed inset-0 z-[9998] cursor-default bg-black/70"
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-label="How this card works"
                className="fixed left-1/2 top-1/2 z-[9999] max-h-[82vh] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-2xl border border-white/15 bg-slate-950 p-5 text-left shadow-2xl shadow-black/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-100">
                    How this card works
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="-mr-1 -mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <dl className="mt-4 space-y-4">
                  {items.map((item) => (
                    <div key={item.term}>
                      <dt className="text-sm font-black text-white">{item.term}</dt>
                      <dd className="mt-0.5 text-xs font-semibold leading-5 text-slate-300">
                        {item.detail}
                      </dd>
                    </div>
                  ))}
                </dl>

                <p className="mt-5 border-t border-white/10 pt-3 text-[11px] font-semibold leading-5 text-slate-400">
                  Bible.com links may follow your Bible App or device theme
                  settings.
                </p>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
