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

        <p className="mt-4 text-[11px] font-black uppercase tracking-[0.14em]">
          <a
            href="https://openmirrorllc.com"
            className="text-slate-300 transition hover:text-emerald-100"
          >
            Open Mirror LLC
          </a>
          <span className="text-slate-600"> · </span>
          <a
            href="https://openmirrorllc.com/about-open-mirror"
            className="text-slate-400 transition hover:text-emerald-100"
          >
            About
          </a>
        </p>

        <p className="mt-3 font-semibold tracking-[0.08em] text-slate-400">
          VTLT · ✝️ ❤️ 🙏
        </p>

        <p className="mt-3">© 2026</p>
      </div>
    </footer>
  );
}
