import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="mt-14 border-t border-white/10 py-10 text-center text-xs text-slate-500 sm:text-sm">
      <div className="mx-auto max-w-6xl px-6">
        {/* The Bible destination, moved out of the header into a clear,
            centered footer position — same YouVersion link. */}
        <a
          href="https://www.bible.com/verse-of-the-day"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open the Bible on YouVersion"
          className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-black text-slate-100 transition hover:border-emerald-200/30 hover:bg-emerald-300/10 hover:text-emerald-50"
        >
          <img
            src="/brand/youversion-bible-app.png"
            alt=""
            aria-hidden="true"
            className="h-7 w-7 rounded-md"
          />
          <span>Open the Bible</span>
        </a>

        <p className="mt-6">
          <a
            href="https://www.bible.com/bible/206/MAT.22.35-40.WEBUS"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-300 underline decoration-white/20 underline-offset-4 transition hover:text-emerald-100 hover:decoration-emerald-100/60"
          >
            Love God, love your neighbor
          </a>
        </p>

        <p className="mt-4">
          <Link
            href="/about"
            className="font-semibold text-slate-300 underline decoration-white/20 underline-offset-4 transition hover:text-emerald-100 hover:decoration-emerald-100/60"
          >
            About CrossHeartPray
          </Link>
        </p>

        <p className="mt-5 font-semibold tracking-[0.08em] text-slate-400">
          VTLT · ✝️ ❤️ 🙏
        </p>

        <p className="mt-3">© 2026</p>

        <p className="mx-auto mt-4 max-w-md text-[11px] leading-6 text-slate-500">
          <span className="inline-block">
            Open Mirror LLC is an independent company,
          </span>{" "}
          <span className="inline-block">
            created and operated on personal time.
          </span>{" "}
          <a
            href="https://openmirrorllc.com/about-open-mirror#disclaimer"
            className="inline-block font-semibold text-slate-400 underline decoration-white/20 underline-offset-2 transition hover:text-emerald-100"
          >
            Full disclaimer
          </a>
        </p>

        {/* Quiet connection back to the parent company — secondary, not a
            second navigation. */}
        <p className="mt-6 text-[11px] tracking-[0.08em] text-slate-600">
          <a
            href="https://openmirrorllc.com"
            className="text-slate-500 transition hover:text-slate-300"
          >
            An Open Mirror LLC project
          </a>
        </p>
      </div>
    </footer>
  );
}
