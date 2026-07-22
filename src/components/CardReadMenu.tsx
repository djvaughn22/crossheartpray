"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { openScriptureReader, type ScriptureReference } from "../lib/scripture";

type CardReadMenuProps = {
  verseHref: string;
  chapterHref: string;
  readingPlanHref?: string;
  /** When present, "Read here" leads the menu and opens the shared in-app reader. */
  readHereReference?: ScriptureReference;
  className?: string;
  /** Accessible name for the Read trigger, e.g. "Read Genesis 1:26-28". */
  triggerAriaLabel?: string;
  /** Menu label for the verse link (default "Open Verse"). */
  verseLabel?: string;
  /** Sub-label for the reading-plan link (default "Track it in the 52-week plan."). */
  readingPlanNote?: string;
};

// One "Read" button replacing the separate Verse / Chapter / Reading Plan pills.
// Portaled to <body> like CrossHeartPrayShareMenu so it escapes card transforms.
export default function CardReadMenu({
  verseHref,
  chapterHref,
  readingPlanHref,
  readHereReference,
  className = "",
  triggerAriaLabel,
  verseLabel = "Open Verse",
  readingPlanNote = "Track it in the 52-week plan.",
}: CardReadMenuProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; center: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  function toggleOpen() {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      // Keep the menu on-screen when the trigger sits near the bottom.
      const estimatedHeight = readHereReference ? 310 : 250;
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

  const itemClass =
    "block w-full rounded-xl px-3 py-3 text-left text-sm font-black text-white hover:bg-white/10";
  const subClass = "mt-0.5 block text-xs font-semibold leading-5 text-slate-300";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={triggerAriaLabel}
        className={`inline-flex items-center justify-center rounded-full border border-white/25 bg-white/20 px-5 py-2 text-sm font-black text-white shadow-sm transition hover:bg-white/30 ${className}`}
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
                ref={panelRef}
                style={{
                  position: "fixed",
                  top: coords.top,
                  left: coords.center,
                  transform: "translateX(-50%)",
                }}
                className="z-[9999] w-64 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-white/15 bg-slate-950 p-2 text-left shadow-2xl shadow-black/60"
              >
                {readHereReference ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      // Focus the persistent Read trigger first so the reader
                      // overlay can restore focus there on close — this menu
                      // item unmounts when the menu closes.
                      triggerRef.current?.focus();
                      setOpen(false);
                      openScriptureReader(readHereReference);
                    }}
                    className={itemClass}
                  >
                    Read here
                    <span className={subClass}>Right here on CrossHeartPray.</span>
                  </button>
                ) : null}
                <a
                  href={verseHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={itemClass}
                >
                  {verseLabel}
                  <span className={subClass}>In the Holy Bible app or Bible.com.</span>
                </a>
                <a
                  href={chapterHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={itemClass}
                >
                  Read the Chapter
                  <span className={subClass}>
                    Context matters. One verse is the doorway.
                  </span>
                </a>
                {readingPlanHref ? (
                  <a
                    href={readingPlanHref}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className={itemClass}
                  >
                    Open Reading Plan
                    <span className={subClass}>{readingPlanNote}</span>
                  </a>
                ) : null}
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
