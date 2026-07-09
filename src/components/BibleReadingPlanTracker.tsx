import { CHP_OFFICIAL_BIBLE_READING_PLAN_PDF, CHP_OFFICIAL_BIBLE_READING_PLAN_PDF_DOWNLOAD_NAME } from "@/lib/crossHeartPrayOfficialAssets";
import { type BibleReadingPlanWeek } from "../lib/bibleReadingPlan";
import BibleReadingPlanProgress from "./BibleReadingPlanProgress";
import PrintButton from "./PrintButton";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";
import PageNucleusHero from "./PageNucleusHero";

const BIBLE_READING_PLAN_EXPORT_ASSET = CHP_OFFICIAL_BIBLE_READING_PLAN_PDF;

type BibleReadingPlanTrackerProps = {
  weeks: BibleReadingPlanWeek[];
};

const READING_PLAN_LANES = [
  { day: "Sunday", lane: "Epistles", note: "Letters for faith and life in Christ." },
  { day: "Monday", lane: "Law", note: "Beginnings, covenant, and God’s way." },
  { day: "Tuesday", lane: "History", note: "Real stories of God with His people." },
  { day: "Wednesday", lane: "Psalms", note: "Prayer, praise, and honest worship." },
  { day: "Thursday", lane: "Poetry", note: "Wisdom, wonder, and the heart." },
  { day: "Friday", lane: "Prophecy", note: "Warnings, promises, and hope." },
  { day: "Saturday", lane: "Gospels", note: "Jesus—His words, works, and way." },
];

export default function BibleReadingPlanTracker({ weeks }: BibleReadingPlanTrackerProps) {
  return (
    <main className="chp-lively-dark-page min-h-screen bg-slate-950 text-slate-100 print:bg-white print:text-black">
      <section className="mx-auto max-w-[82rem] px-4 py-8 print:max-w-none print:px-0 print:py-0 sm:px-6 sm:py-8">
        <SiteHeader className="mb-10 sm:mb-12 print:hidden" />

        <div className="chp-reading-print-brand hidden items-center gap-2 pb-2 text-xs font-black uppercase tracking-[0.16em] text-black print:flex">
          <span className="text-base">✝️ ❤️ 🙏</span>
          <span>Cross Heart Pray</span>
        </div>

        <div className="print:hidden">
          <PageNucleusHero
            title="Bible Reading Plan"
            subhead="Start with one day. Keep the rhythm."
          >
            <PrintButton />
          </PageNucleusHero>
        </div>

        <details className="chp-lane-guide-details mt-4 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 print:hidden">
          <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.18em] text-emerald-100">
            52-week plan details
          </summary>
          <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-sm font-black uppercase tracking-[0.22em] text-emerald-100">
              52-week lanes
            </h2>
            <p className="text-xs font-semibold text-slate-400">
              Same weekly flow across all 52 weeks
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
            {READING_PLAN_LANES.map((lane) => (
              <article
                key={lane.day}
                className="rounded-[0.95rem] border border-white/10 bg-white/[0.04] p-3 shadow-sm shadow-black/10"
              >
                <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-emerald-100">
                  {lane.day}
                </p>
                <h3 className="mt-1 text-base font-black text-white">
                  {lane.lane}
                </h3>
                <p className="mt-1 text-[0.72rem] font-semibold leading-4 text-slate-300">
                  {lane.note}
                </p>
              </article>
            ))}
          </div>
          </div>
        </details>

        <div id="reading-plan-board" className="chp-reading-progress-shell mt-4 scroll-mt-6">
          <BibleReadingPlanProgress weeks={weeks} />
        </div>

        <SiteFooter />
      </section>
    </main>
  );
}
