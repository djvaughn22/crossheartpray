import {
  CHP_OFFICIAL_BIBLE_READING_PLAN_PDF,
  CHP_OFFICIAL_BIBLE_READING_PLAN_PDF_DOWNLOAD_NAME,
} from "./crossHeartPrayOfficialAssets";

// How a download attempt actually ended, so the UI never claims a file was
// saved when the browser only opened it:
// - "downloaded": the file was handed to the browser's download manager.
// - "opened-in-tab": this browser can't download directly, so the PDF was
//   opened in a NEW tab (the reading-plan page stays put) for manual saving.
// - "failed": nothing happened the user can see — offline, missing file, or
//   the popup was blocked.
export type ReadingPlanPdfDownloadResult =
  | "downloaded"
  | "opened-in-tab"
  | "failed";

function canUseAnchorDownload(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof HTMLAnchorElement !== "undefined" &&
    "download" in HTMLAnchorElement.prototype
  );
}

// Opens the PDF in a new tab without giving it a handle back to this page.
// window.open with the "noopener" feature string returns null even on
// success, which would make popup-block detection impossible — so open
// plainly and sever the opener by hand.
function openReadingPlanPdfInNewTab(): boolean {
  const pdfWindow = window.open(CHP_OFFICIAL_BIBLE_READING_PLAN_PDF, "_blank");
  if (!pdfWindow) return false;
  pdfWindow.opener = null;
  return true;
}

// Downloads the reading-plan PDF while keeping the current page loaded.
// Same-tab navigation to the PDF is never used here: on mobile browsers that
// replaces CrossHeartPray with the native PDF viewer and strands the user.
export async function downloadReadingPlanPdf(): Promise<ReadingPlanPdfDownloadResult> {
  if (typeof window === "undefined") return "failed";

  if (!canUseAnchorDownload()) {
    return openReadingPlanPdfInNewTab() ? "opened-in-tab" : "failed";
  }

  try {
    const response = await fetch(CHP_OFFICIAL_BIBLE_READING_PLAN_PDF);
    if (!response.ok) return "failed";
    const blob = await response.blob();

    const url = URL.createObjectURL(blob);
    try {
      const link = document.createElement("a");
      link.href = url;
      link.download = CHP_OFFICIAL_BIBLE_READING_PLAN_PDF_DOWNLOAD_NAME;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } finally {
      // Safari can cancel a download if the blob URL is revoked in the same
      // tick as the click; one second is enough for every browser to have
      // taken its own reference to the blob.
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    return "downloaded";
  } catch {
    return "failed";
  }
}
