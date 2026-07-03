import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

export const metadata = {
  title: "About | Cross Heart Pray",
  description:
    "A simple Bible routine built around the Bible Reading Plan, Daily Hope, Bible Bingo 7, source-backed Deep Dive, and progress tracking.",
};

export default function AboutPage() {
  return (
    <main className="chp-lively-dark-page min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <SiteHeader />

        <section className="max-w-4xl text-left">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-100">
            About CrossHeartPray
          </p>

          <h1 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-6xl">
            ✝️ Cross ❤️ Heart 🙏 Pray
          </h1>

          <div className="mt-5 max-w-3xl space-y-3">
            <p className="text-base font-semibold leading-8 text-slate-200 sm:text-lg sm:leading-9">
              CrossHeartPray brings the Bible everywhere.
            </p>
            <p className="text-sm font-semibold leading-7 text-slate-300 sm:text-base sm:leading-8">
              Start with the Bible Reading Plan, return to Daily Hope, deal Bible Bingo 7, open the chapter, use Deep Dive when source-backed original-language data is available, and track progress as you go.
            </p>
            <p className="text-sm font-semibold leading-7 text-slate-300 sm:text-base sm:leading-8">
              Everything connects through 31,103 Holy Bible verses: reading lanes, chapters, daily prayer, source notes, and progress.
            </p>
          </div>

          <p className="mt-5 max-w-3xl text-base font-semibold leading-8 text-slate-300">
            Bible Reading Plan → Daily Hope → Bible Bingo 7 → Deep Dive → Track progress
          </p>
        </section>

        <section className="mt-14 max-w-4xl space-y-8 text-left">
          <section className="border-t border-white/10 pt-8">
            <h2 className="text-2xl font-black text-white">Bible Reading Plan</h2>

            <ul className="mt-5 space-y-4 text-base leading-8 text-slate-300">
              <li>Start here with the 52-week board.</li>
              <li>Follow seven lanes across each week.</li>
              <li>Open the linked chapter in the Bible app.</li>
              <li>Mark readings done and keep moving.</li>
            </ul>

            <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-300">
              <span className="rounded-full border border-white/10 px-3 py-2">Sunday — Epistles</span>
              <span className="rounded-full border border-white/10 px-3 py-2">Monday — Law</span>
              <span className="rounded-full border border-white/10 px-3 py-2">Tuesday — History</span>
              <span className="rounded-full border border-white/10 px-3 py-2">Wednesday — Psalms</span>
              <span className="rounded-full border border-white/10 px-3 py-2">Thursday — Poetry</span>
              <span className="rounded-full border border-white/10 px-3 py-2">Friday — Prophecy</span>
              <span className="rounded-full border border-white/10 px-3 py-2">Saturday — Gospels</span>
            </div>

            <Link
              href="/bible-reading-plan"
              className="mt-6 inline-flex rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/15"
            >
              Open Bible Reading Plan
            </Link>
          </section>

          <section className="border-t border-white/10 pt-8">
            <h2 className="text-2xl font-black text-white">Daily Hope</h2>

            <ul className="mt-5 space-y-4 text-base leading-8 text-slate-300">
              <li>Begin with the Sinner Prayer.</li>
              <li>Continue with the Salvation Prayer.</li>
              <li>Read the fixed hope verses for the day.</li>
              <li>Close with prayer.</li>
            </ul>

            <Link
              href="/daily-hope"
              className="mt-6 inline-flex rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/15"
            >
              Start Daily Hope
            </Link>
          </section>

          <section className="border-t border-white/10 pt-8">
            <h2 className="text-2xl font-black text-white">Bible Bingo 7</h2>

            <ul className="mt-5 space-y-4 text-base leading-8 text-slate-300">
              <li>One board.</li>
              <li>Seven Bible verses.</li>
              <li>Each card opens the Bible chapter.</li>
              <li>Cards connect back to the matching Reading Plan lane.</li>
            </ul>

            <div className="mt-6 rounded-[1.5rem] border border-emerald-200/15 bg-emerald-300/[0.06] p-5 text-left">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-100">Why 7 cards?</p>

              <p className="mt-3 text-sm font-semibold leading-7 text-slate-300">
                One board. Seven Reading Plan lanes. Each card has a purpose.
              </p>

              <ul className="mt-4 space-y-2 text-sm font-semibold leading-6 text-slate-300">
                <li>Sunday — Epistles: Romans through Jude</li>
                <li>Monday — Law: Genesis through Deuteronomy</li>
                <li>Tuesday — History: Joshua through Esther</li>
                <li>Wednesday — Psalms</li>
                <li>Thursday — Poetry: Job through Song of Solomon</li>
                <li>Friday — Prophecy: Isaiah through Malachi</li>
                <li>Saturday — Gospels: Matthew, Mark, Luke, John</li>
              </ul>

              <p className="mt-4 text-base font-black text-emerald-50">
                The weekly Bible path, on one board.
              </p>
            </div>

            <Link
              href="/explorebible"
              className="mt-6 inline-flex rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/15"
            >
              Open Bible Bingo
            </Link>
          </section>

          <section className="border-t border-white/10 pt-8">
            <h2 className="text-2xl font-black text-white">Deep Dive</h2>

            <ul className="mt-5 space-y-4 text-base leading-8 text-slate-300">
              <li>Deep Dive appears only when source-backed original-language data is available.</li>
              <li>Source details can include the original word, transliteration, pronunciation, source gloss, lexicon meaning, Strong&apos;s number, lemma, and morphology.</li>
              <li>If no verified source match is found, the page says so instead of guessing.</li>
            </ul>

            <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-100">
                Source info
              </p>
              <p className="mt-2 text-sm font-semibold leading-7 text-slate-300">
                The Bible is the path. Chapter links open in the Bible app. Deep Dive adds original-language source notes only where the data is verified.
              </p>
            </div>
          </section>

          <section className="border-t border-white/10 pt-8">
            <h2 className="text-2xl font-black text-white">Track Progress</h2>

            <ul className="mt-5 space-y-4 text-base leading-8 text-slate-300">
              <li>Mark Reading Plan cells complete.</li>
              <li>See the next reading.</li>
              <li>Use Bible Bingo cards to return to the plan.</li>
              <li>Print or save a clean Reading Plan PDF.</li>
            </ul>

            <Link
              href="/bible-reading-plan"
              className="mt-6 inline-flex rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/15"
            >
              Track Progress
            </Link>
          </section>

          <section className="border-t border-white/10 pt-8">
            <h2 className="text-2xl font-black text-white">Cross Heart Pray</h2>

            <ul className="mt-5 space-y-4 text-base leading-8 text-slate-300">
              <li>
                <span className="font-black text-white">✝️ Cross:</span>{" "}
                <span className="font-semibold text-emerald-100">Call out to Jesus.</span>
              </li>
              <li>
                <span className="font-black text-white">❤️ Heart:</span>{" "}
                <span className="font-semibold text-emerald-100">Receive God’s love.</span>
              </li>
              <li>
                <span className="font-black text-white">🙏 Pray:</span>{" "}
                <span className="font-semibold text-emerald-100">Pray all the time.</span>
              </li>
            </ul>
          </section>
        </section>

        <section className="mt-12 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-6 text-center">
          <p className="text-lg font-black text-white">
            Cross Heart Pray your way through it.
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-300">
            A simple formula for Truth, Joy and Peace.
          </p>
          <p className="mt-6 text-sm font-semibold text-slate-400">
            RIP Travis - VTL
          </p>
          <p className="mt-1 text-xl">✝️ ❤️ 🙏</p>
        </section>
      </div>

      <SiteFooter />
    
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">Sources</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">Sources</h2>
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-white/60">Other Sources</h3>
            <p className="mt-3 text-sm leading-6 text-white/75">52 Week Bible Reading Plan — ©Copyright 1995-2009 Michael Coley — Used With Permission — http://www.Bible-Reading.com</p>
          </div>

          <div className="mt-4 rounded-2xl border border-amber-200/20 bg-amber-300/[0.05] p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-100/80">Gene Getz · Life Essentials</h3>
            <p className="mt-3 text-sm leading-6 text-white/75">
              Gene Getz / Bible Principles resources are linked as external study helps. CrossHeartPray opens Scripture first and points to official resources when available.
            </p>
            <ul className="mt-3 space-y-1 text-sm leading-6">
              <li>
                <a href="https://bibleprinciples.org" target="_blank" rel="noopener noreferrer" className="font-semibold text-amber-100 underline decoration-white/20 underline-offset-4 hover:text-amber-50">Bible Principles</a>
              </li>
              <li>
                <a href="https://bibleprinciples.org/pf-search-book/" target="_blank" rel="noopener noreferrer" className="font-semibold text-amber-100 underline decoration-white/20 underline-offset-4 hover:text-amber-50">Principle Finder</a>
              </li>
              <li>
                <a href="https://bibleprinciples.org/life-essentials-app/" target="_blank" rel="noopener noreferrer" className="font-semibold text-amber-100 underline decoration-white/20 underline-offset-4 hover:text-amber-50">Life Essentials App</a>
              </li>
              <li>
                <a href="https://bibleprinciples.org/the-life-essentials-study-bible/" target="_blank" rel="noopener noreferrer" className="font-semibold text-amber-100 underline decoration-white/20 underline-offset-4 hover:text-amber-50">Life Essentials Study Bible</a>
              </li>
              <li>
                <a href="https://www.youtube.com/user/LifeEssentialsVideos" target="_blank" rel="noopener noreferrer" className="font-semibold text-amber-100 underline decoration-white/20 underline-offset-4 hover:text-amber-50">Official YouTube Channel</a>
              </li>
            </ul>
          </div>
        </section>

</main>
  );
}
