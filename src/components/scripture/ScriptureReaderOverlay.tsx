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
  formatPrincipleRange,
  getGeneGetzPrinciplesForChapter,
  type LifeEssentialsPrinciple,
} from "../../lib/geneGetzLifeEssentials";
import { track } from "../../lib/analytics";
import ScriptureReader from "./ScriptureReader";

function principleKey(principle: LifeEssentialsPrinciple) {
  return `${principle.code}-${principle.principleNumber}-${principle.startChapter}-${principle.startVerse}`;
}

export default function ScriptureReaderOverlay() {
  const [reference, setReference] = useState<ScriptureReference | null>(null);
  const [current, setCurrent] = useState<ScriptureReference | null>(null);
  const [openCount, setOpenCount] = useState(0);
  // Which principle's embedded player is revealed — playback starts only on
  // the explicit Watch tap, never when the reader opens.
  const [playingKey, setPlayingKey] = useState<string | null>(null);
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
    setPlayingKey(null);
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
            'a[href], button:not([disabled]), select, input, iframe, [tabindex]:not([tabindex="-1"])',
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

  const watchPillClass =
    "inline-flex min-h-11 items-center justify-center rounded-full border border-emerald-200/30 bg-emerald-300/10 px-5 text-sm font-bold text-emerald-50 transition hover:bg-emerald-300/20";

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
            onReferenceChange={(next) => {
              setCurrent(next);
              setPlayingKey(null);
            }}
            onRequestClose={requestClose}
            afterScripture={
              getzMatches.length > 0 ? (
                <section
                  aria-label={GENE_GETZ_SOURCE_LABEL}
                  className="mx-auto mt-6 max-w-[38rem] text-left"
                >
                  <div className="rounded-2xl border border-emerald-200/25 bg-emerald-300/[0.07] p-4 sm:p-5">
                    <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-emerald-100">
                      {GENE_GETZ_SOURCE_LABEL}
                    </p>

                    {getzMatches.map((principle) => {
                      const key = principleKey(principle);
                      const playing = playingKey === key;
                      return (
                        <article
                          key={key}
                          className="mt-3 rounded-xl border border-white/10 bg-black/25 p-4"
                        >
                          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100">
                            Principle {principle.principleNumber} · {principle.book}{" "}
                            {formatPrincipleRange(principle)}
                          </p>
                          <h4 className="mt-1 text-base font-bold leading-6 text-white">
                            {principle.principleTitle}
                          </h4>
                          <p className="mt-1.5 text-xs leading-5 text-slate-300">
                            {principle.shortPrincipleSummary}
                          </p>

                          {playing && principle.youtubeId ? (
                            <>
                              {/* The same in-app player CrossHeartPray already
                                  uses (YouTubeModal), embedded in the reader.
                                  It mounts only on the explicit Watch tap. */}
                              <div className="-mx-4 mt-3 aspect-video overflow-hidden border-y border-white/10 bg-black sm:mx-0 sm:rounded-xl sm:border-x">
                                <iframe
                                  className="h-full w-full"
                                  src={`https://www.youtube-nocookie.com/embed/${principle.youtubeId}?autoplay=1&rel=0&controls=1&playsinline=1&fs=1`}
                                  title={`Principle ${principle.principleNumber} · ${principle.principleTitle}`}
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                                  allowFullScreen
                                  referrerPolicy="strict-origin-when-cross-origin"
                                />
                              </div>
                              <p className="mt-2 text-[11px] font-semibold leading-4 text-slate-400">
                                Player not loading?{" "}
                                <a
                                  href={principle.officialVideoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-100 underline decoration-white/25 underline-offset-2 hover:text-white"
                                >
                                  Watch on the official player
                                </a>
                                .
                              </p>
                            </>
                          ) : null}

                          <div className="mt-3 flex flex-wrap items-center gap-2.5">
                            {principle.youtubeId ? (
                              <button
                                type="button"
                                aria-expanded={playing}
                                onClick={() => {
                                  if (!playing) {
                                    track("media_play", {
                                      content_type: "getz_video",
                                      content_title: principle.principleTitle,
                                    });
                                  }
                                  setPlayingKey(playing ? null : key);
                                }}
                                className={watchPillClass}
                              >
                                {playing ? "Hide player" : "▶ Watch principle"}
                              </button>
                            ) : (
                              <a
                                href={principle.officialVideoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={watchPillClass}
                              >
                                ▶ Watch principle
                              </a>
                            )}
                            <a
                              href={principle.officialVideoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-emerald-100/70 underline decoration-white/20 underline-offset-4 hover:text-emerald-50"
                            >
                              Official page
                            </a>
                          </div>

                          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                            {principle.sourceLabel ?? GENE_GETZ_SOURCE_LABEL}
                          </p>
                        </article>
                      );
                    })}

                    <a
                      href="/life-essentials"
                      className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 text-xs font-bold text-slate-200 transition hover:bg-white/10"
                    >
                      All Life Essentials →
                    </a>
                  </div>
                </section>
              ) : null
            }
          />
        </div>
      </div>
    </>,
    document.body,
  );
}
