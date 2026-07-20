// The download handler must never navigate the current page: it either hands
// the browser a real file (blob + temporary anchor), opens a NEW tab as a
// fallback, or reports failure honestly. These tests drive the real handler
// against stubbed browser globals to lock each path.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  downloadReadingPlanPdf,
  type ReadingPlanPdfDownloadResult,
} from "../readingPlanPdf";
import {
  CHP_OFFICIAL_BIBLE_READING_PLAN_PDF,
  CHP_OFFICIAL_BIBLE_READING_PLAN_PDF_DOWNLOAD_NAME,
} from "../crossHeartPrayOfficialAssets";

type StubAnchor = {
  href: string;
  download: string;
  click: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
};

function stubBrowser({ anchorDownloadSupported = true } = {}) {
  const anchors: StubAnchor[] = [];
  const appendChild = vi.fn();
  const createObjectURL = vi.fn(() => "blob:reading-plan");
  const revokeObjectURL = vi.fn();
  const windowOpen = vi.fn();
  const timeouts: Array<() => void> = [];

  vi.stubGlobal("document", {
    createElement: vi.fn(() => {
      const anchor: StubAnchor = {
        href: "",
        download: "",
        click: vi.fn(),
        remove: vi.fn(),
      };
      anchors.push(anchor);
      return anchor;
    }),
    body: { appendChild },
  });
  vi.stubGlobal("HTMLAnchorElement", {
    prototype: anchorDownloadSupported ? { download: "" } : {},
  });
  vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
  vi.stubGlobal("window", {
    open: windowOpen,
    setTimeout: vi.fn((fn: () => void) => {
      timeouts.push(fn);
      return timeouts.length;
    }),
  });

  return {
    anchors,
    appendChild,
    createObjectURL,
    revokeObjectURL,
    windowOpen,
    runTimeouts: () => timeouts.splice(0).forEach((fn) => fn()),
  };
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      blob: async () => ({ size: 3, type: "application/pdf" }),
    })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("downloadReadingPlanPdf: blob download path", () => {
  it("fetches the PDF, clicks a temporary named anchor, and reports downloaded", async () => {
    const browser = stubBrowser();

    const result: ReadingPlanPdfDownloadResult = await downloadReadingPlanPdf();

    expect(result).toBe("downloaded");
    expect(fetch).toHaveBeenCalledWith(CHP_OFFICIAL_BIBLE_READING_PLAN_PDF);
    expect(browser.anchors).toHaveLength(1);
    const anchor = browser.anchors[0];
    expect(anchor.href).toBe("blob:reading-plan");
    expect(anchor.download).toBe(CHP_OFFICIAL_BIBLE_READING_PLAN_PDF_DOWNLOAD_NAME);
    expect(browser.appendChild).toHaveBeenCalledWith(anchor);
    expect(anchor.click).toHaveBeenCalledTimes(1);
    expect(anchor.remove).toHaveBeenCalledTimes(1);
    // The current page is never touched.
    expect(browser.windowOpen).not.toHaveBeenCalled();
  });

  it("revokes the blob URL after the browser has taken the download", async () => {
    const browser = stubBrowser();

    await downloadReadingPlanPdf();

    expect(browser.revokeObjectURL).not.toHaveBeenCalled();
    browser.runTimeouts();
    expect(browser.revokeObjectURL).toHaveBeenCalledWith("blob:reading-plan");
  });

  it("reports failed on a non-OK response instead of claiming a download", async () => {
    const browser = stubBrowser();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })));

    expect(await downloadReadingPlanPdf()).toBe("failed");
    expect(browser.createObjectURL).not.toHaveBeenCalled();
  });

  it("reports failed when the fetch itself rejects (offline)", async () => {
    stubBrowser();
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));

    expect(await downloadReadingPlanPdf()).toBe("failed");
  });
});

describe("downloadReadingPlanPdf: no-download-attribute fallback", () => {
  it("opens the PDF in a new tab, severs opener, and says opened-in-tab", async () => {
    const browser = stubBrowser({ anchorDownloadSupported: false });
    const pdfWindow = { opener: {} as unknown };
    browser.windowOpen.mockReturnValue(pdfWindow);

    expect(await downloadReadingPlanPdf()).toBe("opened-in-tab");
    expect(browser.windowOpen).toHaveBeenCalledWith(
      CHP_OFFICIAL_BIBLE_READING_PLAN_PDF,
      "_blank",
    );
    expect(pdfWindow.opener).toBeNull();
    // Never a same-tab navigation, never a fake "downloaded".
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reports failed when the popup is blocked", async () => {
    const browser = stubBrowser({ anchorDownloadSupported: false });
    browser.windowOpen.mockReturnValue(null);

    expect(await downloadReadingPlanPdf()).toBe("failed");
  });
});
