import {
  CHP_OFFICIAL_BIBLE_READING_PLAN_PDF,
  CHP_OFFICIAL_BIBLE_READING_PLAN_PDF_DOWNLOAD_NAME,
} from "@/lib/crossHeartPrayOfficialAssets";

// Reading in the browser is the primary path (new tab, so the tracker page
// and its progress stay put); downloading is the quiet secondary. Both say
// "PDF" so nobody is surprised by what opens.
export default function PrintButton() {
  return (
    <span className="flex w-full max-w-sm flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
      <a
        href={CHP_OFFICIAL_BIBLE_READING_PLAN_PDF}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full border border-white/15 bg-white/10 px-6 py-3 text-center text-sm font-black uppercase tracking-[0.18em] text-slate-100 transition hover:bg-white/15"
      >
        Read the Plan (PDF)
      </a>
      <a
        href={CHP_OFFICIAL_BIBLE_READING_PLAN_PDF}
        download={CHP_OFFICIAL_BIBLE_READING_PLAN_PDF_DOWNLOAD_NAME}
        className="rounded-full px-6 py-3 text-center text-sm font-bold text-slate-300 underline-offset-4 transition hover:text-white hover:underline"
      >
        Download PDF
      </a>
    </span>
  );
}
