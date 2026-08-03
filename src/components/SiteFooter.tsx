"use client";

import Link from "next/link";
import { useState } from "react";
import KindleReaderModal from "./scripture/KindleReaderModal";

// ─────────────────────────────────────────────────────────────────────────────
// CrossHeartPray footer — the family's three-line standard (owner, 2026-08-02)
// in CrossHeartPray's own voice:
//   1. OpenMirrorLLC.com · About · ✝️ ❤️ 🙏
//   2. Contact · Disclaimer      (anchors into /about's own sections)
//   3. Open Mirror LLC is a small independent company.
// On CrossHeartPray itself the icon group IS the "Love God, love your
// neighbor" interaction: one accessible control that opens Matthew 22:35–40
// in the internal KindleReaderModal. It never leaves the page and never
// links to an external Bible site (locked Scripture rule).
// ─────────────────────────────────────────────────────────────────────────────

const rowLink =
  "whitespace-nowrap rounded px-0.5 py-1.5 font-semibold text-slate-300 transition hover:text-emerald-100 hover:underline hover:underline-offset-4 active:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200/70";
const subLink =
  "whitespace-nowrap rounded px-0.5 py-1.5 font-semibold text-slate-400 transition hover:text-emerald-100 hover:underline hover:underline-offset-4 active:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200/70";

function Dot() {
  return (
    <span aria-hidden="true" className="select-none text-slate-600">
      ·
    </span>
  );
}

export default function SiteFooter() {
  const [showReaderModal, setShowReaderModal] = useState(false);

  return (
    <footer className="mt-11 border-t border-white/10 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-1.5 text-xs sm:text-sm motion-reduce:transition-none">
      <div className="mx-auto max-w-6xl px-4">
        <nav aria-label="Open Mirror LLC">
          <p className="m-0 flex flex-wrap items-center justify-center gap-x-2.5">
            <a href="https://openmirrorllc.com" className={rowLink}>
              OpenMirrorLLC.com
            </a>
            <Dot />
            <Link href="/about" className={rowLink}>
              About
            </Link>
            <Dot />
            <button
              type="button"
              onClick={() => setShowReaderModal(true)}
              aria-label="Love God, love your neighbor — read Matthew 22:35–40"
              className={rowLink}
            >
              <span aria-hidden="true">✝️ ❤️ 🙏</span>
            </button>
          </p>
          <p className="m-0 flex flex-wrap items-center justify-center gap-x-2.5">
            <Link href="/about#contact" className={subLink}>
              Contact
            </Link>
            <Dot />
            <Link href="/about#disclaimer" className={subLink}>
              Disclaimer
            </Link>
          </p>
        </nav>
        <p className="m-0 mt-0.5 text-center text-[11px] font-medium text-slate-500">
          Open Mirror LLC is a small independent company.
        </p>
      </div>
      <KindleReaderModal
        isOpen={showReaderModal}
        onClose={() => setShowReaderModal(false)}
        initialReference={{ book: "MAT", chapter: 22, verse: 35, endVerse: 40 }}
      />
    </footer>
  );
}
