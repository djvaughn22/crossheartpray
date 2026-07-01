export default function SiteFooter() {
  return (
    <footer className="mt-14 border-t border-white/10 py-7 text-xs text-slate-500 sm:text-sm">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-3 px-6 text-center sm:grid-cols-3 sm:text-left">
        <p>© 2026</p>

        <a
          href="https://www.bible.com/bible/206/MAT.22.35-40.WEBUS"
          target="_blank"
          rel="noopener noreferrer"
          className="justify-self-center font-semibold text-slate-300 underline decoration-white/20 underline-offset-4 transition hover:text-emerald-100 hover:decoration-emerald-100/60"
        >
          Love God, love your neighbor
        </a>

        <p className="font-semibold tracking-[0.08em] text-slate-400 sm:text-right">
          VTLT · ✝️ ❤️ 🙏
        </p>
      </div>
    </footer>
  );
}
