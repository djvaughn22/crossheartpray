"use client";

import { createPortal } from "react-dom";
import { useEffect, useState, type ReactNode } from "react";
import ScriptureReader from "./ScriptureReader";
import type { ScriptureReference } from "../../lib/scripture";

// Modal wrapper for the Scripture reader. Opens in a centered overlay,
// closes on Escape, outside-click, or explicit close button.
// Preserves scroll position of the page behind it.
export default function ScriptureReaderModal({
  reference,
  onClose,
  afterScripture,
}: {
  reference: ScriptureReference;
  onClose: () => void;
  afterScripture?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl max-h-[90vh] rounded-2xl bg-slate-900 shadow-2xl overflow-hidden flex flex-col">
        {/* Header with close button */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-300">Scripture</h2>
          <button
            onClick={onClose}
            aria-label="Close Scripture reader"
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 transition"
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </div>

        {/* Reader content */}
        <div className="flex-1 overflow-y-auto">
          <ScriptureReader
            initialReference={reference}
            variant="fill"
            onRequestClose={onClose}
            afterScripture={afterScripture}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
