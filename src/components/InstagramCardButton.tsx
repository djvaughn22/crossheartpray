"use client";

import { useEffect, useRef, useState } from "react";
import {
  downloadInstagramCard,
  type InstagramCardContent,
} from "../lib/instagramCard";

type InstagramCardButtonProps = {
  content: InstagramCardContent;
  align?: "left" | "right" | "center";
  className?: string;
};

function menuPositionClass(align: InstagramCardButtonProps["align"]) {
  if (align === "left") return "left-0";
  if (align === "center") return "left-1/2 -translate-x-1/2";
  return "right-0";
}

export default function InstagramCardButton({
  content,
  align = "right",
  className = "",
}: InstagramCardButtonProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <div ref={rootRef} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Download an Instagram-ready image"
        className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/20 px-5 py-2 text-sm font-black text-white shadow-sm transition hover:bg-white/30"
      >
        Instagram
      </button>

      {open ? (
        <div
          role="menu"
          className={`absolute ${menuPositionClass(align)} top-11 z-50 w-60 overflow-hidden rounded-2xl border border-white/15 bg-slate-950/95 p-2 text-left shadow-2xl shadow-black/45 backdrop-blur`}
        >
          <p className="px-3 py-2 text-[0.62rem] font-black uppercase tracking-[0.16em] text-emerald-100">
            Save image
          </p>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              downloadInstagramCard(content, "square");
              setOpen(false);
            }}
            className="block w-full rounded-xl px-3 py-3 text-left text-sm font-black text-white hover:bg-white/10"
          >
            Square post
            <span className="mt-0.5 block text-xs font-semibold text-slate-300">
              1080 × 1080
            </span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              downloadInstagramCard(content, "portrait");
              setOpen(false);
            }}
            className="block w-full rounded-xl px-3 py-3 text-left text-sm font-black text-white hover:bg-white/10"
          >
            Portrait / Story-safe
            <span className="mt-0.5 block text-xs font-semibold text-slate-300">
              1080 × 1350
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
