"use client";

import { usePathname } from "next/navigation";

const steps = [
  // Same order as the banners on the home page. About is intentionally NOT in
  // the flow — it opens as a normal standalone page, not a step in a journey,
  // so it never shows a "Back: Bible Bingo 7" style button.
  { href: "/", label: "Home" },
  { href: "/daily-hope", label: "Daily Hope" },
  { href: "/bible-reading-plan", label: "Bible Reading" },
  { href: "/life-essentials", label: "Life Essentials" },
  { href: "/explorebible", label: "Bible Bingo 7" },
];

function normalizePath(pathname: string | null) {
  if (!pathname || pathname === "/home") return "/";
  return pathname.replace(/\/$/, "") || "/";
}

export default function FlowStepButtons() {
  const currentPath = normalizePath(usePathname());
  const index = steps.findIndex((step) => step.href === currentPath);

  if (index < 0 || currentPath === "/") return null;

  const previous = index > 0 ? steps[index - 1] : null;
  // Last step wraps around so every page has a "next".
  const next = index < steps.length - 1 ? steps[index + 1] : steps[0];

  if (!previous && !next) return null;

  return (
    <div className="mb-10 mt-2 grid grid-cols-2 gap-2 text-[0.68rem] font-black uppercase tracking-[0.12em] print:hidden sm:flex sm:items-center sm:justify-between sm:text-xs">
      {previous ? (
        <a
          href={previous.href}
          aria-label={`Previous: ${previous.label}`}
          className="group inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/[0.10] px-4 py-2 text-slate-50 shadow-lg shadow-black/20 transition hover:bg-white/[0.16] focus:outline-none focus:ring-2 focus:ring-white/40"
        >
          <span aria-hidden="true" className="text-sm transition group-hover:-translate-x-0.5">
            ←
          </span>
          <span className="truncate">Back: {previous.label}</span>
        </a>
      ) : (
        <span aria-hidden="true" />
      )}

      {next ? (
        <a
          href={next.href}
          aria-label={`Next: ${next.label}`}
          className="group inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/[0.10] px-4 py-2 text-slate-50 shadow-lg shadow-black/20 transition hover:bg-white/[0.16] focus:outline-none focus:ring-2 focus:ring-white/40"
        >
          <span className="truncate">Next: {next.label}</span>
          <span aria-hidden="true" className="text-sm transition group-hover:translate-x-0.5">
            →
          </span>
        </a>
      ) : (
        <span aria-hidden="true" />
      )}
    </div>
  );
}
