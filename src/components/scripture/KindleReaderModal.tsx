"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import ScriptureReader from "./ScriptureReader";
import { type ScriptureReference } from "../../lib/scripture";

type KindleReaderModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialReference?: ScriptureReference;
  chapterBounds?: { book: string; startChapter: number; endChapter: number };
  afterScripture?: ReactNode;
};

export default function KindleReaderModal({
  isOpen,
  onClose,
  initialReference,
  chapterBounds,
  afterScripture,
}: KindleReaderModalProps) {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative h-[90vh] w-[90vw] max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl bg-slate-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close reader"
          className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-base font-black text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
        >
          ✕
        </button>

        {/* Reader */}
        <div className="h-full overflow-hidden">
          <ScriptureReader
            variant="fill"
            initialReference={initialReference}
            chapterBounds={chapterBounds}
            onRequestClose={onClose}
            afterScripture={afterScripture}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
