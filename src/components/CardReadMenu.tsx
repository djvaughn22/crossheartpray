"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import KindleReaderModal from "./scripture/KindleReaderModal";
import {
  bibleComUrl,
  bibleComUrlForTranslation,
  resolveScriptureSelection,
  type ScriptureReference,
  type ScriptureTranslation,
} from "../lib/scripture";

type CardReadMenuProps = {
  /** The canonical selected verse or passage. Everything derives from it. */
  reference: ScriptureReference;
  /** Optional translation for the Bible.com link (falls back to WEB). */
  translation?: ScriptureTranslation;
  className?: string;
  /** Accessible name for the Read trigger. Defaults to "Read {label}". */
  triggerAriaLabel?: string;
};

// The one "Context matters" action group for every verse surface. A "Read"
// pill opens a portaled panel with two clearly separated choices:
//
//   Stay on CrossHeartPray:  Read here — the exact 52-week Reading Plan cell
//                            containing this verse, expanded for reading with
//                            the verse highlighted.
//   Other destinations:      Bible.com ↗ (external, new tab)
//
// The Reading Plan IS the internal reading destination, so there is no
// separate plan button and no duplicate chapter action. Everything derives
// from ONE ResolvedScriptureReference — never from separately passed hrefs,
// so the heading and the actions can never disagree. Portaled to <body> like
// CrossHeartPrayShareMenu so it escapes card transforms.
export default function CardReadMenu({
  reference,
  translation,
  className = "",
  triggerAriaLabel,
}: CardReadMenuProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; center: number } | null>(null);
  const [readerOpen, setReaderOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const resolved = useMemo(
    () => resolveScriptureSelection(reference),
    [reference],
  );

  // Estimate menu height for positioning: 2 sections + ~4 items (read here,
  // chapter on Bible.com, reading plan if available, verse on Bible.com).
  const itemCount = resolved ? (resolved.readingPlan ? 4 : 3) : 0;

  function toggleOpen() {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      // Keep the panel on-screen when the trigger sits near the bottom.
      const estimatedHeight = 120 + itemCount * 64;
      const top = Math.min(rect.bottom + 8, Math.max(12, window.innerHeight - estimatedHeight - 12));
      setCoords({ top, center: rect.left + rect.width / 2 });
    }
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onScrollOrResize(event?: Event) {
      if (
        event &&
        panelRef.current &&
        event.target instanceof Node &&
        panelRef.current.contains(event.target)
      ) {
        return;
      }
      setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  if (!resolved) return null;

  const bibleComHref = bibleComUrlForTranslation(resolved.reference, translation);

  // Chapter-only link (no verse) for "Read Chapter on Bible.com".
  const chapterOnlyRef: ScriptureReference = {
    book: resolved.reference.book,
    chapter: resolved.reference.chapter || 1,
  };
  const chapterHref = bibleComUrl(chapterOnlyRef, translation);

  const itemClass =
    "block w-full rounded-xl px-3 py-3 text-left text-sm font-black text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-300";
  const subClass = "mt-0.5 block text-xs font-semibold leading-5 text-slate-300";
  const groupLabelClass =
    "mt-2 block px-3 pb-1 text-[0.6rem] font-black uppercase tracking-[0.18em] text-slate-500 first:mt-0";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={triggerAriaLabel ?? `Read ${resolved.label}`}
        className={`inline-flex items-center justify-center rounded-full border border-white/25 bg-white/20 px-5 py-2 text-sm font-black text-white shadow-sm transition hover:bg-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 ${className}`}
      >
        Read
      </button>

      {open && coords && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                type="button"
                aria-label="Close read menu"
                onClick={() => setOpen(false)}
                className="fixed inset-0 z-[9998] cursor-default"
              />
              <div
                role="menu"
                aria-label={`Read ${resolved.label}`}
                ref={panelRef}
                style={{
                  position: "fixed",
                  top: coords.top,
                  left: coords.center,
                  transform: "translateX(-50%)",
                }}
                className="z-[9999] w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-white/15 bg-slate-950 p-2 text-left shadow-2xl shadow-black/60"
              >
                {/* Quick Verse section */}
                <span className={groupLabelClass} aria-hidden="true">
                  Quick verse
                </span>

                <a
                  href={bibleComHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  role="menuitem"
                  aria-label={`Open ${resolved.label} on Bible.com in a new tab`}
                  onClick={() => setOpen(false)}
                  className={itemClass}
                >
                  Open in Bible.com
                  <span className={subClass}>View this verse in Bible.com or your app.</span>
                </a>

                {/* Read in Context section */}
                <span className={groupLabelClass} aria-hidden="true">
                  Read in context
                </span>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    setReaderOpen(true);
                  }}
                  className={itemClass}
                >
                  Read Chapter Here
                  <span className={subClass}>Continue reading in CrossHeartPray.</span>
                </button>

                <a
                  href={chapterHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  role="menuitem"
                  aria-label={`Open ${resolved.reference.book} ${resolved.reference.chapter} on Bible.com in a new tab`}
                  onClick={() => setOpen(false)}
                  className={itemClass}
                >
                  Read Chapter on Bible.com
                  <span className={subClass}>Read the full chapter on Bible.com.</span>
                </a>

                {resolved.readingPlan ? (
                  <a
                    href={resolved.readingPlan.readHereHref}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className={itemClass}
                  >
                    Open Reading Plan
                    <span className={subClass}>
                      Jump to {resolved.readingPlan.label}.
                    </span>
                  </a>
                ) : null}
              </div>
            </>,
            document.body,
          )
        : null}

      <KindleReaderModal
        isOpen={readerOpen}
        onClose={() => setReaderOpen(false)}
        initialReference={resolved.reference}
      />
    </>
  );
}
