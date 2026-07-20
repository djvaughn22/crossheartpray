// Source contract for the reading-plan PDF action area. There is no DOM test
// runner in this repo, so these tests lock the load-bearing behaviors at the
// source level: Read must open a new tab (never replace the page), Download
// must be a button wired to the tested blob handler (never a same-tab PDF
// link), status must be announced politely, and a visible way back to
// CrossHeartPray must sit next to the controls.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const actions = readFileSync(
  join(root, "components", "ReadingPlanPdfActions.tsx"),
  "utf8",
);
const tracker = readFileSync(
  join(root, "components", "BibleReadingPlanTracker.tsx"),
  "utf8",
);

describe("Read the Plan never replaces the CrossHeartPray page", () => {
  it("opens the PDF in a new tab with safe rel attributes", () => {
    expect(actions).toContain('target="_blank"');
    expect(actions).toContain('rel="noopener noreferrer"');
  });

  it("tells assistive tech the link opens a new tab", () => {
    expect(actions).toContain(
      'aria-label="Read the 52-week Bible Reading Plan PDF in a new tab"',
    );
  });
});

describe("Download is a real handler, not a same-tab PDF navigation", () => {
  it("uses a button wired to the unit-tested blob download lib", () => {
    expect(actions).toContain('type="button"');
    expect(actions).toContain("downloadReadingPlanPdf()");
    // The old trap: a plain anchor with a download attribute that mobile
    // browsers turn into same-tab navigation.
    expect(actions).not.toMatch(/<a[^>]*\bdownload=/);
  });

  it("blocks duplicate taps with a ref guard, not the stale status closure", () => {
    // Rapid taps land before React re-renders disabled state; a status check
    // alone let a triple-tap start three downloads (caught in live testing).
    expect(actions).toContain("if (busyRef.current) return;");
    expect(actions).toContain("busyRef.current = true;");
    expect(actions).toContain('disabled={status === "preparing"}');
  });

  it("reports every outcome honestly, including the opened-in-tab fallback", () => {
    expect(actions).toContain("Preparing PDF…");
    expect(actions).toContain("PDF downloaded.");
    expect(actions).toContain("The PDF opened in a new tab so you can save it.");
    expect(actions).toContain("Couldn’t open the PDF. Try again.");
  });

  it("announces status changes with a polite live region", () => {
    expect(actions).toContain('role="status"');
    expect(actions).toContain('aria-live="polite"');
  });
});

describe("a visible return path sits next to the PDF controls", () => {
  it("links back to CrossHeartPray home", () => {
    expect(actions).toContain('href="/"');
    expect(actions).toContain("Back to CrossHeartPray");
  });

  it("keeps touch targets at least 44px tall", () => {
    expect(actions.match(/min-h-\[2\.75rem\]/g)?.length).toBeGreaterThanOrEqual(3);
  });
});

describe("the reading plan page uses the safe action area", () => {
  it("renders ReadingPlanPdfActions in the hero", () => {
    expect(tracker).toContain("<ReadingPlanPdfActions />");
  });
});
