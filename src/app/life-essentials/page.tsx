import SiteHeader from "../../components/SiteHeader";
import PageNucleusHero from "../../components/PageNucleusHero";
import SiteFooter from "../../components/SiteFooter";
import GeneGetzFullIndex from "../../components/GeneGetzFullIndex";
import {
  LIFE_ESSENTIALS_PRINCIPLES,
  seededPrincipleBooks,
  type LifeEssentialsPrinciple,
} from "../../lib/geneGetzLifeEssentials";

export const metadata = {
  title: "Life Essentials",
  description:
    "Continue from Scripture into Life Essentials principles and official video teaching from Dr. Gene Getz.",
  robots: { index: false, follow: false },
};

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

          <GeneGetzFullIndex groups={groups} />
        </section>

        <section className="mt-12 border-t border-white/10 pt-8 text-center">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">
            Sources
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-center text-sm font-semibold leading-7 text-slate-300">
            Principle index and video teaching © B&amp;H Publishing / Dr. Gene
            Getz, from the official Principle Finder (bibleprinciples.org) and
            the official Life Essentials video library. CrossHeartPray opens
            Scripture first; these study helps play right here.
          </p>
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}
