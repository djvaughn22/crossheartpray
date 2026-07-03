import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import {
  BIBLE_PRINCIPLES_HOME,
  LIFE_ESSENTIALS_APP,
  LIFE_ESSENTIALS_PRINCIPLES,
  LIFE_ESSENTIALS_YOUTUBE,
  PRINCIPLE_FINDER_BY_BOOK,
  formatPrincipleRange,
  seededPrincipleBooks,
  type LifeEssentialsPrinciple,
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
            principle, continue with Dr. Gene Getz. All {total.toLocaleString()}{" "}
            principles are indexed here and link to official video teaching —
            external study helps, not a replacement for Scripture.
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

        {/* Full index, grouped by book */}
        <section className="mt-12 max-w-4xl border-t border-white/10 pt-8">
          <h2 className="text-2xl font-black text-white">
            All {total.toLocaleString()} Life Essentials principles
          </h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-7 text-slate-300">
            Grouped by book. Tap a book to expand. Each principle opens the
            official Dr. Gene Getz video. The full study lives on the official
            site — open the{" "}
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

          <div className="mt-6 space-y-3">
            {groups.map((group) => (
              <details
                key={group.book}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <span className="text-base font-black text-white">
                    {group.book}
                  </span>
                  <span className="rounded-full border border-amber-200/25 bg-amber-300/10 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.14em] text-amber-100">
                    {group.items.length} principle
                    {group.items.length === 1 ? "" : "s"}
                  </span>
                </summary>

                <ul className="mt-4 space-y-2 border-t border-white/10 pt-4">
                  {group.items.map((p) => (
                    <li
                      key={`${p.code}-${p.principleNumber}-${p.startChapter}-${p.startVerse}`}
                      className="flex flex-col gap-1 rounded-xl border border-white/8 bg-black/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-100">
                          #{p.principleNumber} · {p.book} {formatPrincipleRange(p)}
                        </p>
                        <p className="text-sm font-bold leading-5 text-white">
                          {p.principleTitle}
                        </p>
                      </div>
                      <a
                        href={p.officialVideoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex shrink-0 items-center justify-center rounded-full border border-amber-200/30 bg-amber-300/12 px-4 py-1.5 text-xs font-bold text-amber-50 transition hover:bg-amber-300/20 sm:mt-0"
                      >
                        Watch video
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-12 max-w-4xl border-t border-white/10 pt-8">
          <p className="text-sm font-semibold leading-7 text-slate-300">
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
