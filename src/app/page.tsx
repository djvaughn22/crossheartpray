import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import BibleBingoKingCard from "../components/BibleBingoKingCard";
import CrossHeartPrayHero from "../components/CrossHeartPrayHero";
import LazyBibleVerseLookup from "../components/LazyBibleVerseLookup";
import BehindTheVerse from "../components/BehindTheVerse";
import { HOMEPAGE_SELECTED_VERSE_REFERENCE } from "../lib/homepageSelectedVerse";

export const metadata = {
  description: "Start with Bible Bingo 7, the Bible Reading Plan, Daily Hope, and source-backed Deep Dive in one simple Bible routine.",
};

const dailyWays = [
  {
    href: "/daily-hope",
    icon: "🌅",
    // Not "Daily" — the chip sat right above the title and read "Daily Daily Hope".
    eyebrow: "Routine",
    title: "Daily Hope",
    body:
      "A fixed daily prayer and Scripture routine with the same hope verses organized by day of the week.",
    cta: "Open Daily Hope",
  },
  {
    href: "/bible-reading-plan",
    icon: "📖",
    eyebrow: "Bible Reading Plan",
    title: "Read the Bible in 1 or 2 Years",
    body:
      "Choose a pace that fits your life. Follow the same seven reading lanes through the whole Bible in 1 Year · 52 Weeks or take the same journey over 2 Years · 104 Weeks.",
    cta: "Choose Your Plan",
  },
  {
    href: "/life-essentials",
    icon: "🎬",
    eyebrow: "Deeper study",
    title: "Life Essentials",
    body:
      "Open the Bible first, then continue with Dr. Gene Getz — 1,500 Life Essentials principles with official video teaching, matched to the verse.",
    cta: "Explore Life Essentials",
  },
  {
    href: "/explorebible",
    icon: "king-of-hearts",
    eyebrow: "7-card deck",
    title: "Bible Bingo 7",
    body:
      "Deal seven Bible cards, open the verse or chapter, and connect the card to the reading plan.",
    cta: "Deal 7 Cards",
  },
];

const crossHeartPrayCards = [
  { icon: "✝️", title: "Come to Jesus…" },
  { icon: "❤️", title: "Receive God’s Love…" },
  { icon: "🙏", title: "Dear God…" },
];

export default function WelcomePage() {
  return (
    <main className="chp-lively-dark-page min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <SiteHeader />

        <CrossHeartPrayHero>
</CrossHeartPrayHero>

        <section className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {dailyWays.map((item, i) => {
            // Cool, distinct accent per card — Open Mirror card style, no warm colors.
            const accent = ["#38BDF8", "#4ADE80", "#A78BFA", "#22D3EE"][i % 4];
            return (
            <Link
              key={item.href}
              href={item.href}
              style={{ borderColor: `${accent}33` }}
              className="group relative flex h-full min-h-[20rem] flex-col overflow-hidden rounded-[2rem] border bg-[#141d2e] p-7 text-left shadow-2xl shadow-slate-950/30 transition hover:-translate-y-1 hover:bg-[#1a2742]"
            >
              <span
                aria-hidden
                style={{ background: accent }}
                className="absolute inset-x-0 top-0 h-1"
              />
              <div className="flex items-center justify-between gap-4">
                {item.icon === "king-of-hearts" ? (
                  <BibleBingoKingCard className="h-16 w-12" />
                ) : (
                  <p className="text-5xl">{item.icon}</p>
                )}
                <span
                  style={{ color: accent, borderColor: `${accent}55`, background: `${accent}1a` }}
                  className="rounded-full border px-3 py-1 text-[0.7rem] font-black uppercase tracking-[0.2em]"
                >
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
                <span
                  style={{ color: accent, borderColor: `${accent}44` }}
                  className="inline-flex min-w-[11.5rem] justify-center rounded-full border bg-white/[0.04] px-4 py-2 text-xs font-black transition group-hover:bg-white/[0.08]"
                >
                  {item.cta} →
                </span>
              </div>
            </Link>
            );
          })}
        </section>

        <LazyBibleVerseLookup className="mt-12" initialReference={HOMEPAGE_SELECTED_VERSE_REFERENCE} />

        <BehindTheVerse verseReference={HOMEPAGE_SELECTED_VERSE_REFERENCE} />
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
