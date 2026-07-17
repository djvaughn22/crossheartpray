import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="mt-14 border-t border-white/10 py-8 text-center text-xs text-slate-500 sm:text-sm">
      <div className="mx-auto max-w-6xl px-6">
        <p>
          <a
            href="https://www.bible.com/bible/206/MAT.22.35-40.WEBUS"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-300 underline decoration-white/20 underline-offset-4 transition hover:text-emerald-100 hover:decoration-emerald-100/60"
          >
            Love God, love your neighbor
          </a>
        </p>

        <p className="mt-4 font-semibold tracking-[0.08em] text-slate-400">
          VTLT · ✝️ ❤️ 🙏
        </p>

        <p className="mt-4">
          <Link
            href="/about"
            className="font-semibold text-slate-300 underline decoration-white/20 underline-offset-4 transition hover:text-emerald-100 hover:decoration-emerald-100/60"
          >
            About CrossHeartPray
          </Link>
        </p>

        <p className="mt-3">© 2026 CrossHeartPray</p>

        <p className="mt-1 text-[11px] text-slate-600">
          An{" "}
          <a
            href="https://openmirrorllc.com"
            className="underline decoration-white/10 underline-offset-2 transition hover:text-slate-400"
          >
            Open Mirror LLC
          </a>{" "}
          project
        </p>
      </div>
    </footer>
  );
}
