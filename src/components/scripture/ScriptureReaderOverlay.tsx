"use client";

// The one shared "Read here" destination. Mounted once in the root layout;
// any feature opens it at an exact passage via openScriptureReader() (see
// src/lib/scripture/readerBus.ts). Full-height sheet on phones, centered
// panel on larger screens. The originating page keeps its state — closing
// returns exactly where the reader was opened, and the browser back button
// closes the reader instead of leaving the page. Focus stays inside the
// dialog while it is open and returns to the trigger on close.

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  SCRIPTURE_READER_OPEN_EVENT,
  formatScriptureReference,
  type ScriptureReaderOpenDetail,
  type ScriptureReference,
} from "../../lib/scripture";
import {
  GENE_GETZ_SOURCE_LABEL,
  getGeneGetzPrinciplesForChapter,
  type LifeEssentialsPrinciple,
} from "../../lib/geneGetzLifeEssentials";
import YouTubeModal from "../YouTubeModal";
import ScriptureReader from "./ScriptureReader";

export default function ScriptureReaderOverlay() {
  const [reference, setReference] = useState<ScriptureReference | null>(null);
  const [current, setCurrent] = useState<ScriptureReference | null>(null);
  const [openCount, setOpenCount] = useState(0);
  const [activeVideo, setActiveVideo] = useState<LifeEssentialsPrinciple | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const pushedHistoryRef = useRef(false);

  // Open on the shared event from any Read here control.
  useEffect(() => {
    function onOpen(event: Event) {
      const detail = (event as CustomEvent<ScriptureReaderOpenDetail>).detail;
      if (!detail?.reference) return;
      triggerRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setReference((previous) => {
        if (!previous) {
          // Back button closes the reader instead of leaving the page.
          window.history.pushState({ chpScriptureReader: true }, "");
          pushedHistoryRef.current = true;
        }
        return detail.reference;
      });
      setCurrent(detail.reference);
      setOpenCount((count) => count + 1);
    }
    window.addEventListener(SCRIPTURE_READER_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(SCRIPTURE_READER_OPEN_EVENT, onOpen);
  }, []);

  const closeNow = useCallback(() => {
    setReference(null);
    setCurrent(null);
    setActiveVideo(null);
    pushedHistoryRef.current = false;
    triggerRef.current?.focus?.();
    triggerRef.current = null;
  }, []);

  // Close request from UI (✕, backdrop, Escape): unwind our history entry so
  // Back afterwards behaves normally; popstate then performs the close.
  const requestClose = useCallback(() => {
    if (pushedHistoryRef.current) {
      window.history.back();
    } else {
      closeNow();
    }
  }, [closeNow]);

  useEffect(() => {
    if (!reference) return;

    function onPopState() {
      closeNow();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        requestClose();
        return;
      }
      // Keep Tab cycling inside the dialog while it is open.
      if (event.key === "Tab") {
        const panel = panelRef.current;
        if (!panel) return;
        const focusables = Array.from(
          panel.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), select, input, [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((element) => element.offsetParent !== null || element === document.activeElement);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && (active === first || active === panel)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener("popstate", onPopState);
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    return () => {
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [reference, closeNow, requestClose]);

  if (!reference || typeof document === "undefined") return null;

  const getzMatches = current?.chapter
    ? getGeneGetzPrinciplesForChapter(current.book, current.chapter)
    : [];

  const getzPillClass =
    "inline-flex min-h-11 items-center justify-center rounded-full border border-amber-200/25 bg-amber-300/10 px-4 text-xs font-bold text-amber-50 transition hover:bg-amber-300/20";

  return createPortal(
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Scripture reader — ${formatScriptureReference(reference)}`}
        onClick={requestClose}
        className="chp-reader-backdrop fixed inset-0 z-[900] flex bg-black/80 sm:items-center sm:justify-center sm:p-4"
      >
        <div
          ref={panelRef}
          tabIndex={-1}
          onClick={(event) => event.stopPropagation()}
          className="chp-reader-panel flex h-dvh w-full flex-col overflow-hidden bg-slate-950 pt-[env(safe-area-inset-top)] outline-none sm:h-[min(50rem,calc(100dvh-2rem))] sm:max-w-2xl sm:rounded-[2rem] sm:border sm:border-white/15 sm:pt-0 sm:shadow-2xl sm:shadow-black/60"
        >
          <ScriptureReader
            key={openCount}
            variant="fill"
            initialReference={reference}
            onReferenceChange={setCurrent}
            onRequestClose={requestClose}
            afterScripture={
              getzMatches.length > 0 ? (
                <div className="mx-auto mt-5 max-w-md text-center">
                  <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-amber-100">
                    {GENE_GETZ_SOURCE_LABEL}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    {getzMatches.slice(0, 2).map((principle) =>
                      principle.youtubeId ? (
                        <button
                          key={`${principle.code}-${principle.principleNumber}`}
                          type="button"
                          onClick={() => setActiveVideo(principle)}
                          className={getzPillClass}
                        >
                          ▶ {principle.principleTitle}
                        </button>
                      ) : (
                        <a
                          key={`${principle.code}-${principle.principleNumber}`}
                          href={principle.officialVideoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={getzPillClass}
                        >
                          ▶ {principle.principleTitle}
                        </a>
                      ),
                    )}
                    <a
                      href="/life-essentials"
                      className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 text-xs font-bold text-slate-200 transition hover:bg-white/10"
                    >
                      All Life Essentials →
                    </a>
                  </div>
                </div>
              ) : null
            }
          />
        </div>
      </div>

      {activeVideo?.youtubeId ? (
        <YouTubeModal
          videoId={activeVideo.youtubeId}
          title={`Principle ${activeVideo.principleNumber} · ${activeVideo.principleTitle}`}
          onClose={() => setActiveVideo(null)}
        />
      ) : null}
    </>,
    document.body,
  );
}
