import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import GeneGetzFullIndex from "../../components/GeneGetzFullIndex";
import {
  BIBLE_PRINCIPLES_HOME,
  LIFE_ESSENTIALS_APP,
  LIFE_ESSENTIALS_PRINCIPLES,
  LIFE_ESSENTIALS_YOUTUBE,
  PRINCIPLE_FINDER_BY_BOOK,
  seededPrincipleBooks,
  type LifeEssentialsPrinciple,
} from "../../lib/geneGetzLifeEssentials";

export const metadata = {
  title: "Life Essentials | Cross Heart Pray",
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

function groupByBook(): { book: string; items: LifeEssentialsPrinciple[] }[] {
  const groups: { book: string; items: LifeEssentialsPrinciple[] }[] = [];
  for (const book of seededPrincipleBooks()) {
    groups.push({
      book,
      items: LIFE_ESSENTIALS_PRINCIPLES.filter((p) => p.book === book),
    });
  }
  return groups;
}

export default function GeneGetzPage() {
  const total = LIFE_ESSENTIALS_PRINCIPLES.length;
  const groups = groupByBook();

  return (
    <main className="chp-lively-dark-page min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <SiteHeader />

        <section className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-200">
            External study helps
          </p>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-6xl">
            Life Essentials
          </h1>
          <p className="mt-3 text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
            Principles &amp; video teaching by Dr. Gene Getz
          </p>
          <p className="mx-auto mt-5 max-w-2xl text-base font-semibold leading-8 text-slate-200 sm:text-lg sm:leading-9">
            Continue from Scripture into Life Essentials principles and official
            video teaching from Dr. Gene Getz.
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-300">
            Open the Bible first. When a verse connects to a Life Essentials
            principle, continue with Dr. Gene Getz. All {total.toLocaleString()}{" "}
            principles are indexed here and link to official video teaching —
            external study helps, not a replacement for Scripture.
          </p>
        </section>

        {/* Official CTAs */}
        <section className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
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

        {/* Full index, grouped by book */}
        <section className="mt-12 border-t border-white/10 pt-8 text-center">
          <h2 className="text-2xl font-black text-white">
            All {total.toLocaleString()} Life Essentials principles
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-7 text-slate-300">
            Grouped by book. Tap a book, then tap any principle to read it in
            full with a link to the passage, and press Watch for the official
            Dr. Gene Getz video. The full study lives on the official site —
            open the{" "}
            <a
              href={PRINCIPLE_FINDER_BY_BOOK}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-amber-100 underline decoration-white/20 underline-offset-4 hover:text-amber-50"
            >
              official Principle Finder
            </a>
            .
          </p>

          <GeneGetzFullIndex
            groups={groups}
            principleFinderUrl={PRINCIPLE_FINDER_BY_BOOK}
          />
        </section>

        <section className="mt-12 border-t border-white/10 pt-8">
          <p className="mx-auto max-w-2xl text-center text-sm font-semibold leading-7 text-slate-300">
            Gene Getz / Bible Principles resources are linked as external study
            helps. CrossHeartPray opens Scripture first and points to official
            resources when available. Principle index and video links © B&amp;H
            Publishing / Dr. Gene Getz, via the official Principle Finder.
          </p>
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}
