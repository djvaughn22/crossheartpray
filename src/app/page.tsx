import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import BibleBingoKingCard from "../components/BibleBingoKingCard";
import CrossHeartPrayHero from "../components/CrossHeartPrayHero";
import OpenMirrorBar from "../components/OpenMirrorBar";

export const metadata = {
  title: "✝️ ❤️ 🙏 Welcome | Cross Heart Pray",
  description: "Start with Bible Bingo 7, the Bible Reading Plan, Daily Hope, and source-backed Deep Dive in one simple Bible routine.",
};

const dailyWays = [
  {
    href: "/daily-hope",
    icon: "🌅",
    eyebrow: "Daily",
    title: "Daily Hope",
    body:
      "A fixed daily prayer and Scripture routine with the same hope verses organized by day of the week.",
    cta: "Open Daily Hope",
  },
  {
    href: "/bible-reading-plan",
    icon: "📖",
    eyebrow: "Structured",
    title: "52-week Bible Reading Plan",
    body:
      "A 52-week Bible table with seven lanes across each week, chapter links, checkboxes, and simple progress.",
    cta: "Open Bible Reading",
  },
  {
    href: "/gene-getz",
    icon: "🎬",
    eyebrow: "Deeper study",
    title: "Life Essentials",
    body:
      "Open the Bible first, then continue with Dr. Gene Getz — 1,500 Life Essentials principles with official video teaching, matched to the verse.",
    cta: "Explore Gene Getz",
  },
  {
    href: "/explorebible?passage=Matthew%205",
    icon: "king-of-hearts",
    eyebrow: "7-card deck",
    title: "Bible Bingo 7",
    body:
      "Deal seven Bible cards, open the verse or chapter, and connect the card to the reading plan.",
    cta: "Deal 7 Cards",
  },
];

const deepDiveLinks = [
  {
    label: "Open Bible Bingo 7",
    href: "/explorebible?passage=Matthew%205",
  },
  {
    label: "Study the verse in the Bible app",
    href: "https://www.bible.com/bible/206/JHN.1.1.WEBUS",
  },
  {
    label: "Original word example",
    href: "https://biblehub.com/greek/225.htm",
  },
];

const crossHeartPrayCards = [
  { icon: "✝️", title: "Call out to Jesus" },
  { icon: "❤️", title: "Receive God’s love" },
  { icon: "🙏", title: "Pray all the time" },
];

export default function WelcomePage() {
  return (
    <main className="chp-lively-dark-page min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <OpenMirrorBar project="CrossHeartPray" />
        <SiteHeader />

        <CrossHeartPrayHero>
</CrossHeartPrayHero>

        <section className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {dailyWays.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex h-full min-h-[20rem] flex-col rounded-[2rem] border border-white/10 bg-[#141d2e] p-7 text-left shadow-2xl shadow-slate-950/30 transition hover:-translate-y-1 hover:border-emerald-200/40 hover:bg-[#1a2742]"
            >
              <div className="flex items-center justify-between gap-4">
                {item.icon === "king-of-hearts" ? (
                  <BibleBingoKingCard className="h-16 w-12" />
                ) : (
                  <p className="text-5xl">{item.icon}</p>
                )}
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.7rem] font-black uppercase tracking-[0.2em] text-emerald-100">
                  {item.eyebrow}
                </span>
              </div>

              <h2 className="mt-6 text-2xl font-black tracking-tight text-white">
                {item.title}
              </h2>

              <p className="mt-4 text-sm font-semibold leading-7 text-slate-300">
                {item.body}
              </p>

              <div className="mt-auto pt-7">
                <span className="inline-flex min-w-[11.5rem] justify-center rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-black text-slate-100 transition hover:bg-white/[0.10] group-hover:border-emerald-200/30 group-hover:bg-emerald-300/10 group-hover:text-emerald-50">
                  {item.cta} →
                </span>
              </div>
            </Link>
          ))}
        </section>

        <section className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-[2rem] border border-emerald-200/15 bg-slate-950/35 shadow-2xl shadow-emerald-950/15 sm:mt-14">
          <div className="grid gap-0 lg:grid-cols-[1fr_1.15fr]">
            <div className="border-b border-white/10 bg-emerald-300/[0.08] p-6 lg:border-b-0 lg:border-r lg:border-white/10">
              <p className="text-xs font-black uppercase tracking-[0.26em] text-emerald-100">
                Open the Word
              </p>

              <h2 className="mt-3 text-3xl font-black leading-tight text-white sm:text-4xl">
                Behind the Verse
              </h2>

              <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-slate-200 sm:text-base">
                Start with one verse. Open the full chapter. Follow the connected reading plan.
                When Deep Dive verifies a word, it shows the original source, pronunciation,
                Strong&apos;s number, and meaning.
              </p>


            </div>

            <div className="flex flex-col justify-between p-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-[0.66rem] font-black uppercase tracking-[0.2em] text-emerald-100">
                    1 verse
                  </p>
                  <a
                    href="https://www.bible.com/bible/206/JHN.1.1.WEBUS"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex text-lg font-black text-white underline decoration-emerald-300/45 decoration-2 underline-offset-4 transition hover:text-emerald-100"
                  >
                    John 1:1
                  </a>
                  <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
                    A perfect place to begin.
                  </p>
                </div>

                <div>
                  <p className="text-[0.66rem] font-black uppercase tracking-[0.2em] text-emerald-100">
                    Bible study
                  </p>
                  <Link
                    href="/explorebible?passage=Matthew%205"
                    className="mt-2 inline-flex text-lg font-black text-white underline decoration-emerald-300/45 decoration-2 underline-offset-4 transition hover:text-emerald-100"
                  >
                    Explore Bible
                  </Link>
                  <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
                    Deal a verse, open the chapter, keep moving.
                  </p>
                </div>

                <div>
                  <p className="text-[0.66rem] font-black uppercase tracking-[0.2em] text-emerald-100">
                    Strong’s
                  </p>
                  <a
                    href="https://biblehub.com/greek/225.htm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex text-lg font-black text-white underline decoration-emerald-300/45 decoration-2 underline-offset-4 transition hover:text-emerald-100"
                  >
                    Truth · G225
                  </a>
                  <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
                    Greek source word for truth, reality, what is true.
                  </p>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                {deepDiveLinks.map((item) => {
                  const external = item.href.startsWith("http");

                  return external ? (
                    <a
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-200 transition hover:border-emerald-200/30 hover:bg-emerald-300/10 hover:text-emerald-50"
                    >
                      {item.label} →
                    </a>
                  ) : (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="inline-flex rounded-full border border-emerald-200/25 bg-emerald-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-50 transition hover:bg-emerald-300/18"
                    >
                      {item.label} →
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CHP behind verse truth example start */}
          <div className="border-t border-white/10 bg-slate-950/45 p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
              <div className="lg:w-[15rem] lg:shrink-0">
                <p className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-emerald-100">
                  Original word example
                </p>
                <h3 className="mt-1 text-3xl font-black leading-none text-white">
                  Truth
                </h3>
                <p className="mt-3 text-xs font-bold leading-6 text-slate-300">
                  One English word, shown with verified source language details.
                </p>
              </div>

              <div className="grid flex-1 gap-3 md:grid-cols-2">
                <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[0.55rem] font-black uppercase tracking-[0.14em] text-sky-100">
                        Hebrew
                      </p>
                      <p className="mt-2 text-4xl font-black leading-none text-white" lang="he">
                        אֱמֶת
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[0.55rem] font-black uppercase tracking-[0.12em] text-slate-300">
                      H571
                    </span>
                  </div>

                  <dl className="mt-4 grid gap-2 text-xs font-bold leading-relaxed text-slate-300">
                    <div className="grid gap-1 sm:grid-cols-[7.5rem_1fr]">
                      <dt className="text-slate-500">Transliteration</dt>
                      <dd className="text-emerald-100">emet</dd>
                    </div>
                    <div className="grid gap-1 sm:grid-cols-[7.5rem_1fr]">
                      <dt className="text-slate-500">Pronunciation</dt>
                      <dd className="text-emerald-100">eh-MET</dd>
                    </div>
                    <div className="grid gap-1 sm:grid-cols-[7.5rem_1fr]">
                      <dt className="text-slate-500">Meaning</dt>
                      <dd>truth, faithfulness, reliability, firmness</dd>
                    </div>
                  </dl>
                </article>

                <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[0.55rem] font-black uppercase tracking-[0.14em] text-sky-100">
                        Greek
                      </p>
                      <p className="mt-2 text-4xl font-black leading-none text-white" lang="grc">
                        ἀλήθεια
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[0.55rem] font-black uppercase tracking-[0.12em] text-slate-300">
                      G225
                    </span>
                  </div>

                  <dl className="mt-4 grid gap-2 text-xs font-bold leading-relaxed text-slate-300">
                    <div className="grid gap-1 sm:grid-cols-[7.5rem_1fr]">
                      <dt className="text-slate-500">Transliteration</dt>
                      <dd className="text-emerald-100">alētheia</dd>
                    </div>
                    <div className="grid gap-1 sm:grid-cols-[7.5rem_1fr]">
                      <dt className="text-slate-500">Pronunciation</dt>
                      <dd className="text-emerald-100">ah-LAY-thee-ah</dd>
                    </div>
                    <div className="grid gap-1 sm:grid-cols-[7.5rem_1fr]">
                      <dt className="text-slate-500">Meaning</dt>
                      <dd>truth, reality, what is true</dd>
                    </div>
                  </dl>
                </article>
              </div>
            </div>
          </div>
          {/* CHP behind verse truth example end */}
        </section>
        <section className="mx-auto mt-12 max-w-5xl">
          <div className="flex flex-wrap items-center justify-center gap-3 rounded-full border border-white/10 bg-white/[0.025] px-4 py-3 text-center">
            {crossHeartPrayCards.map((item) => (
              <div
                key={item.title}
                className="inline-flex items-center gap-2 text-sm font-black text-white"
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.title}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-4xl text-center">
          <p className="text-sm font-semibold leading-7 text-slate-400">
            Built for personal daily access to a Bible routine and to share with
            family, friends, and the world.
          </p>
        </section>
      </div>

      <SiteFooter />

    </main>
  );
}
