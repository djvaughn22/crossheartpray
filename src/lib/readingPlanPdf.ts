import {
  CHP_OFFICIAL_BIBLE_READING_PLAN_104_PDF,
  CHP_OFFICIAL_BIBLE_READING_PLAN_104_PDF_DOWNLOAD_NAME,
  CHP_OFFICIAL_BIBLE_READING_PLAN_PDF,
  CHP_OFFICIAL_BIBLE_READING_PLAN_PDF_DOWNLOAD_NAME,
} from "./crossHeartPrayOfficialAssets";
import {
  DEFAULT_READING_PLAN_DURATION,
  type ReadingPlanDuration,
} from "./readingPlanDuration";

// The active pace decides which file the buttons act on. 52 stays the default
// everywhere, so a caller that passes nothing gets the original PDF.
export function readingPlanPdfAsset(
  duration: ReadingPlanDuration = DEFAULT_READING_PLAN_DURATION,
) {
  return duration === 104
    ? {
        href: CHP_OFFICIAL_BIBLE_READING_PLAN_104_PDF,
        downloadName: CHP_OFFICIAL_BIBLE_READING_PLAN_104_PDF_DOWNLOAD_NAME,
      }
    : {
        href: CHP_OFFICIAL_BIBLE_READING_PLAN_PDF,
        downloadName: CHP_OFFICIAL_BIBLE_READING_PLAN_PDF_DOWNLOAD_NAME,
      };
}

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
function openReadingPlanPdfInNewTab(href: string): boolean {
  const pdfWindow = window.open(href, "_blank");
  if (!pdfWindow) return false;
  pdfWindow.opener = null;
  return true;
}

// Downloads the reading-plan PDF while keeping the current page loaded.
// Same-tab navigation to the PDF is never used here: on mobile browsers that
// replaces CrossHeartPray with the native PDF viewer and strands the user.
export async function downloadReadingPlanPdf(
  duration: ReadingPlanDuration = DEFAULT_READING_PLAN_DURATION,
): Promise<ReadingPlanPdfDownloadResult> {
  if (typeof window === "undefined") return "failed";

  const { href, downloadName } = readingPlanPdfAsset(duration);

  if (!canUseAnchorDownload()) {
    return openReadingPlanPdfInNewTab(href) ? "opened-in-tab" : "failed";
  }

  try {
    const response = await fetch(href);
    if (!response.ok) return "failed";
    const blob = await response.blob();

    const url = URL.createObjectURL(blob);
    try {
      const link = document.createElement("a");
      link.href = url;
      link.download = downloadName;
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
