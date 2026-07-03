import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import {
  BIBLE_PRINCIPLES_HOME,
  LIFE_ESSENTIALS_APP,
  LIFE_ESSENTIALS_PRINCIPLES,
  LIFE_ESSENTIALS_STUDY_BIBLE,
  LIFE_ESSENTIALS_YOUTUBE,
  PRINCIPLE_FINDER_BY_BOOK,
  formatPrincipleRange,
  seededPrincipleBooks,
} from "../../lib/geneGetzLifeEssentials";

export const metadata = {
  title: "Explore the Bible with Dr. Gene Getz | Cross Heart Pray",
  description:
    "Continue from Scripture into Life Essentials principles and official video teaching from Dr. Gene Getz.",
  robots: { index: false, follow: false },
};

const ctas = [
  { label: "Open official Bible Principles", href: BIBLE_PRINCIPLES_HOME },
  { label: "Open Principle Finder", href: PRINCIPLE_FINDER_BY_BOOK },
  { label: "Download Life Essentials App", href: LIFE_ESSENTIALS_APP },
  { label: "Official YouTube Channel", href: LIFE_ESSENTIALS_YOUTUBE },
];

export default function GeneGetzPage() {
  const books = seededPrincipleBooks();

  return (
    <main className="chp-lively-dark-page min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <SiteHeader />

        <section className="max-w-4xl text-left">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-200">
            External study helps
          </p>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-6xl">
            Explore the Bible with Dr. Gene Getz
          </h1>
          <p className="mt-5 max-w-3xl text-base font-semibold leading-8 text-slate-200 sm:text-lg sm:leading-9">
            Continue from Scripture into Life Essentials principles and official
            video teaching from Dr. Gene Getz.
          </p>
          <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-300">
            Open the Bible first. When a verse connects to a Life Essentials
            principle, continue with Dr. Gene Getz. These are official external
            resources, not a replacement for Scripture.
          </p>
        </section>

        {/* Official CTAs */}
        <section className="mt-10 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2">
          {ctas.map((cta) => (
            <a
              key={cta.href}
              href={cta.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-between rounded-2xl border border-amber-200/25 bg-amber-300/[0.06] px-5 py-4 text-sm font-bold text-amber-50 shadow-sm transition hover:bg-amber-300/15"
            >
              <span>{cta.label}</span>
              <span aria-hidden="true">→</span>
            </a>
          ))}
        </section>

        {/* Book navigation — honest: opens the official Principle Finder */}
        <section className="mt-12 max-w-4xl border-t border-white/10 pt-8">
          <h2 className="text-2xl font-black text-white">Browse by book</h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-7 text-slate-300">
            The full library lives on the official site. Open the official
            Principle Finder by book — CrossHeartPray does not host the full
            database.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {books.map((book) => (
              <a
                key={book}
                href={PRINCIPLE_FINDER_BY_BOOK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-slate-100 transition hover:bg-white/10"
              >
                {book}
              </a>
            ))}
          </div>
          <a
            href={PRINCIPLE_FINDER_BY_BOOK}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center justify-center rounded-full border border-amber-200/30 bg-amber-300/12 px-5 py-2 text-sm font-bold text-amber-50 transition hover:bg-amber-300/20"
          >
            Open official Principle Finder by book →
          </a>
        </section>

        {/* Seeded connections */}
        <section className="mt-12 max-w-4xl border-t border-white/10 pt-8">
          <h2 className="text-2xl font-black text-white">
            Seeded Life Essentials connections
          </h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-7 text-slate-300">
            A growing, hand-verified starting set. These principles light up on
            matching Bible Bingo and Daily Hope verses.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {LIFE_ESSENTIALS_PRINCIPLES.map((principle) => {
              const href =
                principle.officialVideoUrl ?? principle.officialSourceUrl;
              const isVideo =
                principle.verified && Boolean(principle.officialVideoUrl);
              return (
                <div
                  key={`${principle.book}-${principle.principleNumber}-${principle.startChapter}-${principle.startVerse}`}
                  className="rounded-2xl border border-white/10 bg-black/25 px-5 py-5"
                >
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-100">
                    Principle {principle.principleNumber} · {principle.book}{" "}
                    {formatPrincipleRange(principle)}
                  </p>
                  <p className="mt-1 text-lg font-bold leading-6 text-white">
                    {principle.principleTitle}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    {principle.shortPrincipleSummary}
                  </p>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center justify-center rounded-full border border-amber-200/30 bg-amber-300/12 px-5 py-2 text-sm font-bold text-amber-50 transition hover:bg-amber-300/20"
                  >
                    {isVideo
                      ? "Watch official Gene Getz video"
                      : "Open official Principle Finder"}
                  </a>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-12 max-w-4xl border-t border-white/10 pt-8">
          <p className="text-sm font-semibold leading-7 text-slate-300">
            Gene Getz / Bible Principles resources are linked as external study
            helps. CrossHeartPray opens Scripture first and points to official
            resources when available.
          </p>
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}
