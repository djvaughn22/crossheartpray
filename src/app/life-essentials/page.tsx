import SiteHeader from "../../components/SiteHeader";
import PageNucleusHero from "../../components/PageNucleusHero";
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
  title: "Life Essentials",
  description:
    "Continue from Scripture into Life Essentials principles and official video teaching from Dr. Gene Getz.",
  robots: { index: false, follow: false },
};

const ctas = [
  { label: "Open official Bible Principles", href: BIBLE_PRINCIPLES_HOME },
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

        <PageNucleusHero
          title="Life Essentials"
          subhead="Principles & video teaching by Dr. Gene Getz"
          body={`All ${total.toLocaleString()} principles, each with Dr. Getz's official video. Bible first — these are study helps, not a replacement for Scripture.`}
        />


        {/* Full index, grouped by book */}
        <section className="mt-12 border-t border-white/10 pt-8 text-center">
          <h2 className="text-2xl font-black text-white">
            All {total.toLocaleString()} Life Essentials principles
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-7 text-slate-300">
            Tap a book, then any principle. Read opens the Scripture — the
            passage, the chapter, or its day in the 52-week Reading Plan. Watch
            plays the official video.
          </p>

          <GeneGetzFullIndex
            groups={groups}
            principleFinderUrl={PRINCIPLE_FINDER_BY_BOOK}
          />
        </section>

        <section className="mt-12 border-t border-white/10 pt-8 text-center">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">
            Official Life Essentials links
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {ctas.map((cta) => (
              <a
                key={cta.href}
                href={cta.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-amber-200/25 bg-amber-300/[0.06] px-4 py-2 text-xs font-bold text-amber-50 transition hover:bg-amber-300/15"
              >
                {cta.label} <span aria-hidden="true">→</span>
              </a>
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-center text-sm font-semibold leading-7 text-slate-300">
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
