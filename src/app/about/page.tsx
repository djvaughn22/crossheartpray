import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import AboutDestinationCard from "../../components/AboutDestinationCard";
import { BE_PREPARED_CARD } from "../../lib/destinations";

export const metadata = {
  title: "About",
  description:
    "A simple Bible routine built around Daily Hope, the Bible Reading Plan, Life Essentials, Bible Bingo 7, source-backed Deep Dive, and progress tracking.",
};

const READING_LANES = [
  "Sunday — Epistles",
  "Monday — Law",
  "Tuesday — History",
  "Wednesday — Psalms",
  "Thursday — Poetry",
  "Friday — Prophecy",
  "Saturday — Gospels",
];

const cardClass =
  "rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-left";
const buttonClass =
  "mt-6 inline-flex rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/15";

export default function AboutPage() {
  return (
    <main className="chp-lively-dark-page min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <SiteHeader />

        <div className="mx-auto max-w-2xl">
          {/* Hero — a short, faith-first explanation of CrossHeartPray */}
          <section className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-100">
              About CrossHeartPray
            </p>

            <h1 className="mt-5 text-balance text-4xl font-black tracking-tight text-white sm:text-5xl">
              ✝️ Cross ❤️ Heart 🙏 Pray
            </h1>

            <p className="mx-auto mt-5 max-w-lg text-balance text-lg font-semibold leading-8 text-slate-200">
              CrossHeartPray is a simple, Bible-first way to read Scripture, pray, and grow every day.
            </p>
            <p className="mx-auto mt-3 max-w-xl text-pretty text-base font-semibold leading-8 text-slate-300">
              It started with a daily rhythm: read the Word, pray, reflect.
              <br className="hidden sm:block" /> A few focused tools help you stay consistent
              and keep going.
            </p>
            <p className="mx-auto mt-5 max-w-xl text-balance text-sm font-black uppercase tracking-[0.08em] text-emerald-100">
              Daily&nbsp;Hope → Bible&nbsp;Reading&nbsp;Plan → Life&nbsp;Essentials →
              Bible&nbsp;Bingo&nbsp;7 → Deep&nbsp;Dive → Track&nbsp;progress
            </p>
          </section>

          {/* The CrossHeartPray pages — in the same order as the site menu */}
          <p className="mb-5 text-center text-sm font-black uppercase tracking-[0.2em] text-slate-400">
            The CrossHeartPray pages
          </p>

          <div className="flex flex-col gap-5">
            <section className={cardClass}>
              <h2 className="text-2xl font-black text-white">Daily Hope</h2>

              <ul className="mt-4 space-y-2 text-base leading-8 text-slate-300">
                <li>Begin with the Sinner Prayer.</li>
                <li>Continue with the Salvation Prayer.</li>
                <li>Read the fixed hope verses for the day.</li>
                <li>Close with prayer.</li>
              </ul>

              <Link href="/daily-hope" className={buttonClass}>
                Start Daily Hope
              </Link>
            </section>

            <section className={cardClass}>
              <h2 className="text-2xl font-black text-white">Bible Reading Plan</h2>

              <ul className="mt-4 space-y-2 text-base leading-8 text-slate-300">
                <li>Start here with the 52-week board.</li>
                <li>Follow seven lanes across each week.</li>
                <li>Open the linked chapter in the Bible app.</li>
                <li>Mark readings done and keep moving.</li>
              </ul>

              <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-300">
                {READING_LANES.map((lane) => (
                  <span key={lane} className="rounded-full border border-white/10 px-3 py-2">
                    {lane}
                  </span>
                ))}
              </div>

              <Link href="/bible-reading-plan" className={buttonClass}>
                Open Bible Reading Plan
              </Link>
            </section>

            <section className={cardClass}>
              <h2 className="text-2xl font-black text-white">Life Essentials · Dr. Gene Getz</h2>

              <div className="mt-4 space-y-4 text-base leading-8 text-slate-300">
                <p>
                  <a
                    href="https://en.wikipedia.org/wiki/Gene_Getz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-emerald-200 underline decoration-emerald-300/40 underline-offset-4 hover:text-emerald-100"
                  >
                    Dr. Gene Getz
                  </a>
                  &apos;s <span className="font-semibold text-white">Life Essentials</span> has shaped a
                  big part of this project. It is his life&apos;s work — more than{" "}
                  <span className="font-semibold text-white">1,500 Bible principles</span> drawn straight
                  from Scripture, paired with hundreds of hours of video teaching.
                </p>
                <p>
                  I was blessed to meet Dr. Getz in person and to hold his own{" "}
                  <span className="font-semibold text-white">personally signed Life Essentials Study Bible</span>.
                  We sat together with his men&apos;s ski group — which included Apollo 16 moonwalker{" "}
                  <a
                    href="https://en.wikipedia.org/wiki/Charlie_Duke"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-emerald-200 underline decoration-emerald-300/40 underline-offset-4 hover:text-emerald-100"
                  >
                    astronaut Charlie Duke
                  </a>
                  . It is a night I will never forget, and a big reason Life Essentials runs all
                  through CrossHeartPray.
                </p>
                <p className="font-semibold text-emerald-100">
                  Open the Bible first. When a verse connects to a Life Essentials principle, continue
                  with Dr. Gene Getz.
                </p>
              </div>

              <Link href="/life-essentials" className={buttonClass}>
                Explore the Bible with Dr. Gene Getz →
              </Link>
            </section>

            <section className={cardClass}>
              <h2 className="text-2xl font-black text-white">Bible Bingo 7</h2>

              <ul className="mt-4 space-y-2 text-base leading-8 text-slate-300">
                <li>One board.</li>
                <li>Seven Bible verses.</li>
                <li>Each card opens the Bible chapter.</li>
                <li>Cards connect back to the matching Reading Plan lane.</li>
              </ul>

              <div className="mt-5 rounded-[1.5rem] border border-emerald-200/15 bg-emerald-300/[0.06] p-5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-100">
                  Why 7 cards?
                </p>

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

              <Link href="/explorebible" className={buttonClass}>
                Open Bible Bingo
              </Link>
            </section>
          </div>

          {/* Existing meaningful details */}
          <p className="mb-5 mt-10 text-center text-sm font-black uppercase tracking-[0.2em] text-slate-400">
            More about CrossHeartPray
          </p>

          <div className="flex flex-col gap-5">
            <section className={cardClass}>
              <h2 className="text-2xl font-black text-white">Deep Dive</h2>

              <ul className="mt-4 space-y-2 text-base leading-8 text-slate-300">
                <li>Deep Dive appears only when source-backed original-language data is available.</li>
                <li>
                  Source details can include the original word, transliteration, pronunciation,
                  source gloss, lexicon meaning, Strong&apos;s number, lemma, and morphology.
                </li>
                <li>If no verified source match is found, the page says so instead of guessing.</li>
              </ul>

              <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-100">
                  Source info
                </p>
                <p className="mt-2 text-sm font-semibold leading-7 text-slate-300">
                  The Bible is the path. Chapter links open in the Bible app. Deep Dive adds
                  original-language source notes only where the data is verified.
                </p>
              </div>
            </section>

            <section className={cardClass}>
              <h2 className="text-2xl font-black text-white">Track Progress</h2>

              <ul className="mt-4 space-y-2 text-base leading-8 text-slate-300">
                <li>Mark Reading Plan cells complete.</li>
                <li>See the next reading.</li>
                <li>Use Bible Bingo cards to return to the plan.</li>
                <li>Print or save a clean Reading Plan PDF.</li>
              </ul>

              <Link href="/bible-reading-plan" className={buttonClass}>
                Track Progress
              </Link>
            </section>

            <section className={cardClass}>
              <h2 className="text-2xl font-black text-white">Cross Heart Pray</h2>

              <ul className="mt-4 space-y-3 text-base leading-8 text-slate-300">
                <li>
                  <span className="font-black text-white">✝️ Cross:</span>{" "}
                  <span className="font-semibold text-emerald-100">Come to Jesus…</span>
                </li>
                <li>
                  <span className="font-black text-white">❤️ Heart:</span>{" "}
                  <span className="font-semibold text-emerald-100">Receive God&apos;s Love…</span>
                </li>
                <li>
                  <span className="font-black text-white">🙏 Pray:</span>{" "}
                  <span className="font-semibold text-emerald-100">Dear God…</span>
                </li>
              </ul>
            </section>

            <section className={cardClass}>
              <h2 className="text-2xl font-black text-white">Sources</h2>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-white/60">
                  Other Sources
                </h3>
                <p className="mt-3 text-sm leading-6 text-white/75">
                  52 Week Bible Reading Plan — ©Copyright 1995-2009 Michael Coley — Used With
                  Permission — http://www.Bible-Reading.com
                </p>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-white/60">
                  Gene Getz · Life Essentials
                </h3>
                <p className="mt-3 text-sm leading-6 text-white/75">
                  Gene Getz / Bible Principles resources are linked as external study helps.
                  CrossHeartPray opens Scripture first and points to official resources when
                  available.
                </p>
                <ul className="mt-3 space-y-1 text-sm leading-6">
                  <li>
                    <a href="https://bibleprinciples.org" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-200 underline decoration-white/20 underline-offset-4 hover:text-emerald-100">Bible Principles</a>
                  </li>
                  <li>
                    <a href="https://bibleprinciples.org/pf-search-book/" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-200 underline decoration-white/20 underline-offset-4 hover:text-emerald-100">Principle Finder</a>
                  </li>
                  <li>
                    <a href="https://bibleprinciples.org/life-essentials-app/" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-200 underline decoration-white/20 underline-offset-4 hover:text-emerald-100">Life Essentials App</a>
                  </li>
                  <li>
                    <a href="https://bibleprinciples.org/the-life-essentials-study-bible/" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-200 underline decoration-white/20 underline-offset-4 hover:text-emerald-100">Life Essentials Study Bible</a>
                  </li>
                  <li>
                    <a href="https://www.youtube.com/user/LifeEssentialsVideos" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-200 underline decoration-white/20 underline-offset-4 hover:text-emerald-100">Official YouTube Channel</a>
                  </li>
                </ul>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center">
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

            {/* The one quiet destination area — last, after everything that is
                CrossHeartPray. Never in the header, never near Scripture. */}
            <AboutDestinationCard card={BE_PREPARED_CARD} />
          </div>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
