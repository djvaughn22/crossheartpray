import Link from "next/link";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import DailyBingoActions from "./DailyBingoActions";
import {
  absoluteSiteUrl,
  type DailyBibleBingoPost,
} from "../lib/dailyBibleBingo";

const CARD_TONES = [
  "border-emerald-200/15 bg-emerald-300/10",
  "border-yellow-200/15 bg-yellow-200/10",
  "border-red-200/15 bg-red-300/10",
  "border-sky-200/15 bg-sky-300/10",
  "border-lime-200/15 bg-lime-300/10",
  "border-orange-200/15 bg-orange-300/10",
  "border-violet-200/15 bg-violet-300/10",
];

type DailyBibleBingoPostViewProps = {
  post: DailyBibleBingoPost;
  isArchive: boolean;
};

// The daily post page body — used by /today (live) and /today/[date]
// (permanent archive). Everything shown here comes from the one
// authoritative DailyBibleBingoPost object.
export default function DailyBibleBingoPostView({
  post,
  isArchive,
}: DailyBibleBingoPostViewProps) {
  const featured = post.lanes[post.featuredLaneIndex];
  const shareUrl = absoluteSiteUrl(isArchive ? post.pagePath : "/today");

  return (
    <main className="chp-lively-dark-page min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <SiteHeader />

        <header className="text-center">
          <div className="flex justify-center gap-3 text-3xl" aria-hidden="true">
            <span>✝️</span>
            <span>❤️</span>
            <span>🙏</span>
          </div>

          <p className="mt-5 text-xs font-black uppercase tracking-[0.24em] text-emerald-100">
            Daily Bible Bingo
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
            {post.fullDate}
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold leading-6 text-slate-300">
            Every day, Cross Heart Pray deals the same seven Scripture cards for
            everyone — one from each lane of the week. This page is{" "}
            {isArchive
              ? "the board from that day’s Instagram post"
              : "today’s board from the Instagram post"}
            . Tap any passage to read it.
          </p>

          {isArchive ? (
            <p className="mt-4">
              <Link
                href="/today"
                className="inline-flex items-center justify-center rounded-full border border-emerald-200/25 bg-emerald-300/10 px-5 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/15"
              >
                See today’s board →
              </Link>
            </p>
          ) : null}
        </header>

        {/* Featured card — today's lane of the week. */}
        <section
          className={`mx-auto mt-8 max-w-3xl rounded-[1.35rem] border p-5 text-center shadow-2xl shadow-black/30 sm:rounded-[2rem] sm:p-8 ${CARD_TONES[featured.index]}`}
        >
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-300">
            Featured lane · <span className="text-emerald-100">{featured.dayLabel}</span>
          </p>

          <div className="mt-4 text-4xl" aria-hidden="true">
            {featured.section.emoji}
          </div>

          <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
            {featured.laneTitle}
          </h2>

          <p className="mt-3 text-2xl font-black text-white">{featured.reference}</p>

          <div className="mt-4 w-full rounded-[1.5rem] border border-white/10 bg-black/25 px-5 py-5 text-lg font-bold leading-8 text-slate-100">
            {featured.passage.text}
          </div>

          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            <a
              href={featured.verseUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-emerald-200/25 bg-emerald-300/10 px-5 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/15"
            >
              Read the verse
            </a>
            <a
              href={featured.chapterUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              Read the chapter
            </a>
          </div>
        </section>

        {/* All 7 lanes. */}
        <section className="mt-8">
          <p className="text-center text-xs font-black uppercase tracking-[0.22em] text-slate-400">
            {isArchive ? "The full board" : "Today’s full board"}
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {post.lanes.map((lane) => (
              <article
                key={lane.section.title}
                className={`rounded-[1.15rem] border p-4 text-center ${CARD_TONES[lane.index]} ${
                  lane.isFeatured ? "ring-2 ring-white/25" : ""
                }`}
              >
                <p className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-emerald-100">
                  {lane.dayLabel}
                </p>
                <div className="mt-2 text-2xl" aria-hidden="true">
                  {lane.section.emoji}
                </div>
                <h3 className="mt-1 text-sm font-black text-white">{lane.laneTitle}</h3>
                <p className="mt-2 text-base font-black text-white">{lane.reference}</p>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-100/85">
                  {lane.passage.text}
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <a
                    href={lane.verseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-emerald-200/25 bg-emerald-300/10 px-3 py-1.5 text-xs font-black text-emerald-100 transition hover:bg-emerald-300/15"
                  >
                    Verse
                  </a>
                  <a
                    href={lane.chapterUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-black text-slate-200 transition hover:bg-white/10"
                  >
                    Chapter
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Actions. */}
        <section className="mt-10 flex flex-col items-center gap-3">
          <a
            href="/explorebible"
            className="inline-flex items-center justify-center rounded-full border border-emerald-200/25 bg-emerald-300/10 px-7 py-3 font-semibold text-emerald-100 transition hover:bg-emerald-300/15"
          >
            Play the full Bible Bingo board
          </a>

          <a
            href={post.boardPath}
            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-7 py-3 font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Open this exact board
          </a>

          <DailyBingoActions
            shareTitle={post.title}
            shareText={`${post.title}\nSeven Scripture cards — one for each lane of the week.`}
            shareUrl={shareUrl}
            imagePath={post.imagePath}
            imageFileName={post.imageFileName}
          />

          <p className="mt-2 max-w-xl text-center text-xs font-semibold leading-5 text-slate-400">
            New here? Bible Bingo deals one passage from each of seven Scripture
            lanes — Epistles, Law, History, Psalms, Poetry, Prophecy, and
            Gospels. The board changes every day at midnight Central Time, and
            this page always shows the same card as the day’s Instagram post.
          </p>
        </section>

        <div className="mt-12">
          <SiteFooter />
        </div>
      </div>
    </main>
  );
}
