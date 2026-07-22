import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import BibleBingoKingCard from "../../components/BibleBingoKingCard";
import OpenBibleReaderButton from "../../components/OpenBibleReaderButton";

export const metadata = {
  title: "About",
  description:
    "What CrossHeartPray is: a free place to read the Bible, follow a 52-week reading plan, pray, and discover Life Essentials principles from Dr. Gene Getz.",
};

// Shared card styling — the same visual language as the home-page feature
// cards: dark panel, thin accent bar on top, accent-tinted chip and button.
const startCardButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-full border px-5 py-2 text-sm font-black transition group-hover:bg-white/[0.08]";

const FEATURES: {
  href: string;
  external?: boolean;
  icon: string;
  accent: string;
  title: string;
  body: string;
  cta: string;
}[] = [
  {
    href: "reader",
    icon: "📖",
    accent: "#38BDF8",
    title: "Read the Bible",
    body: "Open any chapter in a clean, comfortable reader and choose the Bible translation you prefer.",
    cta: "Open the reader",
  },
  {
    href: "/bible-reading-plan",
    icon: "📅",
    accent: "#4ADE80",
    title: "52-Week Reading Plan",
    body: "A one-year path through the Bible — seven readings a week, with simple checkboxes to track your progress.",
    cta: "Open the Reading Plan",
  },
  {
    href: "/daily-hope",
    icon: "🌅",
    accent: "#FBBF24",
    title: "Daily Hope",
    body: "A short daily routine: opening prayers, hope verses arranged by day of the week, and a closing prayer.",
    cta: "Open Daily Hope",
  },
  {
    href: "/life-essentials",
    icon: "🎬",
    accent: "#34D399",
    title: "Life Essentials",
    body: "1,500 Bible principles with official video teaching from Dr. Gene Getz, matched to what you're reading.",
    cta: "Explore Life Essentials",
  },
  {
    href: "/explorebible",
    icon: "king-of-hearts",
    accent: "#22D3EE",
    title: "Bible Bingo 7",
    body: "Deal seven Scripture cards — one for each part of the Bible — and read wherever the board takes you.",
    cta: "Deal 7 cards",
  },
  {
    href: "https://thedjcares.com",
    external: true,
    icon: "🎵",
    accent: "#A78BFA",
    title: "TheDJCares",
    body: "A companion site with hand-picked Christian music, sermons, and encouragement to listen to while you read.",
    cta: "Open TheDJCares",
  },
];

const EVERYDAY_USES = [
  "Read today's chapter, right on the page.",
  "Look up a verse someone mentioned.",
  "Check off this week's readings in the plan.",
  "Sit with a difficult passage, then watch the matching Life Essentials teaching.",
  "Read Daily Hope on a hard morning.",
  "Deal a Bible Bingo board and read wherever it lands.",
  "Pray.",
  "Put on encouraging music and keep reading.",
];

const DIFFERENT = [
  {
    title: "Scripture comes first.",
    body: "Every feature opens the Bible itself. Everything else on the site is a way in, not a substitute.",
  },
  {
    title: "Quiet by design.",
    body: "No feed, no notifications, no pop-ups. Just the Word and a few careful tools around it.",
  },
  {
    title: "Free, with no account.",
    body: "There is nothing to sign up for. Open the site and start reading.",
  },
  {
    title: "Nothing is guessed.",
    body: "Bible text comes from real translations, and teaching comes from Dr. Gene Getz's official Life Essentials library. When there is no verified match, the site says so.",
  },
  {
    title: "Made for every day.",
    body: "The reading plan, Daily Hope, and the Bingo board each give you a small, clear reason to come back tomorrow.",
  },
  {
    title: "Comfortable on a phone.",
    body: "Every page — including the reader — is built for one hand on a small screen.",
  },
];

export default function AboutPage() {
  return (
    <main className="chp-lively-dark-page min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <SiteHeader />

        {/* 1 — What is CrossHeartPray? */}
        <section className="mx-auto max-w-2xl pt-6 text-center sm:pt-10">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-100">
            About CrossHeartPray
          </p>

          <h1 className="mt-5 text-balance text-4xl font-black tracking-tight text-white sm:text-5xl">
            ✝️ Cross ❤️ Heart 🙏 Pray
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-balance text-lg font-semibold leading-8 text-slate-200">
            CrossHeartPray is a free website for spending time in the Bible.
            It helps you read Scripture, build a daily habit, pray, and explore
            God&apos;s Word through a few carefully designed tools — all in one
            quiet place.
          </p>

          <p className="mx-auto mt-4 max-w-xl text-pretty text-base font-semibold leading-8 text-slate-400">
            No account. No feed. Nothing asked of you except a little time in
            the Word.
          </p>
        </section>

        {/* Start here — the three most natural first steps. */}
        <section className="mx-auto mt-14 max-w-5xl">
          <h2 className="text-center text-sm font-black uppercase tracking-[0.2em] text-slate-400">
            Start here
          </h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <OpenBibleReaderButton className="group flex h-full flex-col rounded-[2rem] border border-sky-300/25 bg-[#141d2e] p-7 text-left shadow-2xl shadow-slate-950/30 transition hover:-translate-y-1 hover:bg-[#1a2742]">
              <span className="text-4xl">📖</span>
              <span className="mt-4 text-xl font-black tracking-tight text-white">
                Read the Bible
              </span>
              <span className="mt-2 text-sm font-semibold leading-6 text-slate-300">
                Open the Scripture reader and start with John 1.
              </span>
              <span className="mt-auto pt-6">
                <span className={`${startCardButtonClass} border-sky-300/40 bg-white/[0.04] text-sky-200`}>
                  Open the reader →
                </span>
              </span>
            </OpenBibleReaderButton>

            <Link
              href="/bible-reading-plan"
              className="group flex h-full flex-col rounded-[2rem] border border-emerald-300/25 bg-[#141d2e] p-7 text-left shadow-2xl shadow-slate-950/30 transition hover:-translate-y-1 hover:bg-[#1a2742]"
            >
              <span className="text-4xl">📅</span>
              <span className="mt-4 text-xl font-black tracking-tight text-white">
                Start the Reading Plan
              </span>
              <span className="mt-2 text-sm font-semibold leading-6 text-slate-300">
                A 52-week path through the whole Bible, one week at a time.
              </span>
              <span className="mt-auto pt-6">
                <span className={`${startCardButtonClass} border-emerald-300/40 bg-white/[0.04] text-emerald-200`}>
                  Open the plan →
                </span>
              </span>
            </Link>

            <Link
              href="/daily-hope"
              className="group flex h-full flex-col rounded-[2rem] border border-amber-300/25 bg-[#141d2e] p-7 text-left shadow-2xl shadow-slate-950/30 transition hover:-translate-y-1 hover:bg-[#1a2742]"
            >
              <span className="text-4xl">🙏</span>
              <span className="mt-4 text-xl font-black tracking-tight text-white">
                Pray
              </span>
              <span className="mt-2 text-sm font-semibold leading-6 text-slate-300">
                Begin with guided prayers and today&apos;s hope verses in Daily
                Hope.
              </span>
              <span className="mt-auto pt-6">
                <span className={`${startCardButtonClass} border-amber-300/40 bg-white/[0.04] text-amber-200`}>
                  Open Daily Hope →
                </span>
              </span>
            </Link>
          </div>
        </section>

        {/* 2 — What can I do here? */}
        <section className="mx-auto mt-20 max-w-5xl">
          <h2 className="text-center text-3xl font-black tracking-tight text-white">
            What can I do here?
          </h2>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((item) => {
              const inner = (
                <>
                  <span
                    aria-hidden
                    style={{ background: item.accent }}
                    className="absolute inset-x-0 top-0 h-1"
                  />
                  {item.icon === "king-of-hearts" ? (
                    <BibleBingoKingCard className="h-14 w-10" />
                  ) : (
                    <span className="text-4xl">{item.icon}</span>
                  )}
                  <span className="mt-5 text-xl font-black tracking-tight text-white">
                    {item.title}
                  </span>
                  <span className="mt-3 text-sm font-semibold leading-7 text-slate-300">
                    {item.body}
                  </span>
                  <span className="mt-auto pt-6">
                    <span
                      style={{ color: item.accent, borderColor: `${item.accent}44` }}
                      className="inline-flex min-h-10 items-center justify-center rounded-full border bg-white/[0.04] px-4 py-2 text-xs font-black transition group-hover:bg-white/[0.08]"
                    >
                      {item.cta} →
                    </span>
                  </span>
                </>
              );
              const cardClass =
                "group relative flex h-full flex-col overflow-hidden rounded-[2rem] border bg-[#141d2e] p-7 text-left shadow-2xl shadow-slate-950/30 transition hover:-translate-y-1 hover:bg-[#1a2742]";
              const borderStyle = { borderColor: `${item.accent}33` };

              if (item.href === "reader") {
                return (
                  <OpenBibleReaderButton
                    key={item.title}
                    style={borderStyle}
                    className={cardClass}
                  >
                    {inner}
                  </OpenBibleReaderButton>
                );
              }
              if (item.external) {
                return (
                  <a
                    key={item.title}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={borderStyle}
                    className={cardClass}
                  >
                    {inner}
                  </a>
                );
              }
              return (
                <Link key={item.title} href={item.href} style={borderStyle} className={cardClass}>
                  {inner}
                </Link>
              );
            })}
          </div>
        </section>

        {/* 3 — How people use CrossHeartPray */}
        <section className="mx-auto mt-20 max-w-3xl">
          <h2 className="text-center text-3xl font-black tracking-tight text-white">
            How people use CrossHeartPray
          </h2>

          <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-7 sm:p-9">
            <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {EVERYDAY_USES.map((use) => (
                <li
                  key={use}
                  className="flex items-start gap-3 text-base font-semibold leading-7 text-slate-300"
                >
                  <span
                    aria-hidden
                    className="mt-[0.72rem] h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300/70"
                  />
                  {use}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 4 — What makes CrossHeartPray different? */}
        <section className="mx-auto mt-20 max-w-5xl">
          <h2 className="text-center text-3xl font-black tracking-tight text-white">
            What makes it different?
          </h2>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {DIFFERENT.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"
              >
                <h3 className="text-lg font-black text-white">{item.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-7 text-slate-300">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 5 — Life Essentials: why the green cards appear. Same emerald
            language as the cards themselves, so the page answers the question
            visually as well as in words. */}
        <section className="mx-auto mt-20 max-w-3xl">
          <div className="rounded-[2rem] border border-emerald-200/25 bg-emerald-300/[0.07] p-7 sm:p-10">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-100">
              Life Essentials · Dr. Gene Getz
            </p>

            <h2 className="mt-3 text-balance text-3xl font-black tracking-tight text-white">
              Why you&apos;ll see green Life Essentials cards
            </h2>

            <div className="mt-5 space-y-5 text-base font-semibold leading-8 text-slate-200">
              <p>
                As you read Scripture on CrossHeartPray, some passages show a
                green card like this one. Those cards are{" "}
                <span className="text-white">Life Essentials</span>
                {" — "}the life&apos;s work of{" "}
                <a
                  href="https://en.wikipedia.org/wiki/Gene_Getz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-emerald-200 underline decoration-emerald-300/40 underline-offset-4 hover:text-emerald-100"
                >
                  Dr. Gene Getz
                </a>
                , a pastor, professor, and author who spent decades drawing
                more than 1,500 principles directly from the Bible and
                recording an official video teaching for each one.
              </p>
              <p>
                CrossHeartPray checks the passage you are reading against those
                principles. When there is a genuine match, the green card
                appears beside the Scripture with the principle&apos;s title
                and Dr. Getz&apos;s official video. When there is no match, no
                card appears — nothing is stretched to fit.
              </p>
              <p>
                CrossHeartPray does not replace Life Essentials, and it never
                writes or paraphrases the teaching itself. The cards simply
                help you discover Dr. Getz&apos;s work at the exact moment it
                connects to what you are reading, and every card leads to his
                official resources.
              </p>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/life-essentials"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-emerald-200/30 bg-emerald-300/10 px-6 text-sm font-black text-emerald-50 transition hover:bg-emerald-300/20"
              >
                Explore all 1,500 principles →
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-5 text-sm">
              {[
                { label: "Bible Principles", href: "https://bibleprinciples.org" },
                {
                  label: "Life Essentials App",
                  href: "https://bibleprinciples.org/life-essentials-app/",
                },
                {
                  label: "Life Essentials Study Bible",
                  href: "https://bibleprinciples.org/the-life-essentials-study-bible/",
                },
                {
                  label: "Official YouTube Channel",
                  href: "https://www.youtube.com/user/LifeEssentialsVideos",
                },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-emerald-200 underline decoration-white/20 underline-offset-4 hover:text-emerald-100"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* 6 — Foundation */}
        <section className="mx-auto mt-20 max-w-2xl text-center">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">
            Why this exists
          </h2>
          <p className="mt-5 text-pretty text-lg font-semibold leading-9 text-slate-200">
            CrossHeartPray exists for one reason: to help people spend more
            time reading Scripture. The name is the rhythm behind it —{" "}
            <span className="text-white">✝️ Cross</span>: come to Jesus.{" "}
            <span className="text-white">❤️ Heart</span>: receive God&apos;s
            love. <span className="text-white">🙏 Pray</span>: talk with God.
            Everything on this site points back to the Bible itself.
          </p>
        </section>

        {/* 7 — Credits */}
        <section className="mx-auto mt-16 max-w-2xl">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center sm:p-8">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">
              Credits
            </h2>
            <ul className="mx-auto mt-4 max-w-xl space-y-3 text-sm font-semibold leading-7 text-slate-300">
              <li>
                Life Essentials principles and videos are the work of Dr. Gene
                Getz, shared through his official{" "}
                <a
                  href="https://bibleprinciples.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-200 underline decoration-white/20 underline-offset-4 hover:text-emerald-100"
                >
                  Bible Principles
                </a>{" "}
                resources.
              </li>
              <li>
                52-Week Bible Reading Plan — ©1995–2009 Michael Coley,
                Bible-Reading.com. Used with permission.
              </li>
              <li>
                CrossHeartPray is built and cared for by its owner, and it is
                free to use.
              </li>
            </ul>
          </div>
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}
