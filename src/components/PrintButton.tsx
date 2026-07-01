"use client";

import {
  CHP_OFFICIAL_BIBLE_READING_PLAN_PDF,
  CHP_OFFICIAL_BIBLE_READING_PLAN_PDF_DOWNLOAD_NAME,
} from "@/lib/crossHeartPrayOfficialAssets";

export default function PrintButton() {
  function downloadOriginalPlan() {
    const link = document.createElement("a");
    link.href = CHP_OFFICIAL_BIBLE_READING_PLAN_PDF;
    link.download = CHP_OFFICIAL_BIBLE_READING_PLAN_PDF_DOWNLOAD_NAME;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <button
      type="button"
      onClick={downloadOriginalPlan}
      className="w-full max-w-sm rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-slate-100 transition hover:bg-white/15 sm:w-auto"
    >
      Download Reading Plan
    </button>
  );
}
