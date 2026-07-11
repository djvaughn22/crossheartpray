"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Lightweight in-app YouTube player (privacy-enhanced, free). Opens on an
// explicit user click, closes on overlay click or Escape. Optional onPrev /
// onNext callbacks add ⏮/⏭ buttons (and ←/→ keys) so a series plays like a
// playlist. ⛶ Fullscreen expands the video itself. If YouTube blocks the
// embed, a small footer lets the viewer reload or watch on YouTube —
// matching the player used on TheDJCares so both feel the same.
export default function YouTubeModal({
  videoId,
  title,
  onClose,
  onPrev,
  onNext,
}: {
  videoId: string;
  title?: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const [reload, setReload] = useState(0);
  const frameBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && onPrev) onPrev();
      if (e.key === "ArrowRight" && onNext) onNext();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, onPrev, onNext]);

  const pill =
    "rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-bold text-white no-underline transition hover:bg-white/20";

  // Portal to <body>: an ancestor with a CSS transform (e.g. an animated card)
  // would otherwise capture position:fixed and strand the modal off-screen.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title ?? "Video"}
      onClick={onClose}
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/85 p-3 sm:p-4"
    >
      <div
        className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1523] p-3 sm:p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm font-bold text-amber-100">
            {title ?? "Dr. Gene Getz · Life Essentials"}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close video"
            className="shrink-0 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm font-bold text-white transition hover:bg-white/20"
          >
            Close ✕
          </button>
        </div>
        <div
          ref={frameBoxRef}
          className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black"
        >
          <iframe
            key={`${videoId}-${reload}`}
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&controls=1&playsinline=1&fs=1`}
            title={title ?? "Dr. Gene Getz video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {onPrev ? (
            <button type="button" onClick={onPrev} className={pill}>
              ⏮ Previous
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => frameBoxRef.current?.requestFullscreen?.()}
            className={pill}
          >
            ⛶ Fullscreen
          </button>
          {onNext ? (
            <button
              type="button"
              onClick={onNext}
              className="rounded-full bg-amber-600 px-4 py-2 text-xs font-bold text-white no-underline transition hover:bg-amber-500"
            >
              Next ⏭
            </button>
          ) : null}
        </div>
        <p className="mt-3 text-center text-xs text-slate-400">
          Blocked or asked to sign in? Reload, or watch on YouTube — you stay right here.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => setReload((v) => v + 1)} className={pill}>
            ↻ Reload player
          </button>
          <a
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white no-underline transition hover:bg-red-500"
          >
            ▶ Watch on YouTube
          </a>
        </div>
      </div>
    </div>,
    document.body,
  );
}
