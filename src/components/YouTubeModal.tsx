"use client";

import { useEffect } from "react";

// Lightweight in-app YouTube player (privacy-enhanced, free). Opens on an
// explicit user click, closes on overlay click or Escape.
export default function YouTubeModal({
  videoId,
  title,
  onClose,
}: {
  videoId: string;
  title?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title ?? "Video"}
      onClick={onClose}
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/85 p-4"
    >
      <div
        className="relative w-full max-w-3xl"
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
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
            title={title ?? "Dr. Gene Getz video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    </div>
  );
}
