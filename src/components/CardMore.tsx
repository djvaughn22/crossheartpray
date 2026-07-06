"use client";

import { useState, type ReactNode } from "react";

type CardMoreProps = {
  /** Button label, e.g. "More Life Essentials". */
  label?: string;
  /** Short hint shown on the button when collapsed, e.g. "Life Essentials". */
  badge?: string;
  children: ReactNode;
  className?: string;
};

// Progressive-disclosure section for a verse card: everything that is data
// (Life Essentials, books in this lane, odds) stays available but off the
// card face until the reader asks for it.
export default function CardMore({
  label = "More",
  badge,
  children,
  className = "",
}: CardMoreProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`w-full ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="mx-auto inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-black text-slate-200 shadow-sm transition hover:bg-white/10"
      >
        {open ? "Less" : label}
        {!open && badge ? (
          <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100">
            · {badge}
          </span>
        ) : null}
        <span
          aria-hidden
          className={`text-xs transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {open ? <div className="mt-4 w-full text-left">{children}</div> : null}
    </div>
  );
}
