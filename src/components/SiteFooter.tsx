import Link from "next/link";
import { bibleComUrl } from "../lib/scripture";

export default function SiteFooter() {
  return (
    <footer className="mt-14 border-t border-white/10 py-8 text-center text-xs text-slate-500 sm:text-sm">
      <div className="mx-auto max-w-6xl px-6">
        {/* Line 1: CrossHeartPray's spiritual mission and copyright */}
        <p className="leading-relaxed">
          <a
            href={bibleComUrl({ book: "MAT", chapter: 22, verse: 35, endVerse: 40 })}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-300 underline decoration-white/20 underline-offset-4 transition hover:text-emerald-100 hover:decoration-emerald-100/60"
          >
            Love God, love your neighbor
          </a>{" "}
          · © 2026 CrossHeartPray
        </p>

        {/* Line 2: Family standard — Open Mirror LLC · About Open Mirror · CrossHeartPray link */}
        <p className="mt-4 font-semibold text-slate-400">
          <a
            href="https://openmirrorllc.com"
            className="text-slate-300 decoration-white/20 underline-offset-2 transition hover:text-emerald-100 hover:decoration-emerald-100/60"
          >
            Open Mirror LLC
          </a>
          {" · "}
          <a
            href="https://openmirrorllc.com/about-open-mirror"
            className="text-slate-300 decoration-white/20 underline-offset-2 transition hover:text-emerald-100 hover:decoration-emerald-100/60"
          >
            About Open Mirror
          </a>
          {" · "}
          <span
            aria-label="Visit CrossHeartPray (this site)"
            className="inline-block"
          >
            ✝️ ❤️ 🙏
          </span>
        </p>

        {/* Line 3: Family standard — independence statement and disclaimer */}
        <p className="mt-3 font-semibold text-slate-400">
          <span className="inline-block">Open Mirror LLC is a small independent company.</span>
          {" · "}
          <a
            href="https://openmirrorllc.com/disclaimer"
            className="text-slate-300 underline decoration-white/20 underline-offset-2 transition hover:text-emerald-100 hover:decoration-emerald-100/60"
          >
            Disclaimer
          </a>
        </p>
      </div>
    </footer>
  );
}
