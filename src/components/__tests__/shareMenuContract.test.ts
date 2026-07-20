// Source contract for the shared card-share UI. There is no DOM test runner in
// this repo, so these tests lock the load-bearing behaviors at the source
// level: viewport clamping must come from the shared lib, the panel must be a
// real dialog with focus behavior, only one panel may open at a time, and a
// canceled native share must never be treated as a failure.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const shareMenu = readFileSync(
  join(root, "components", "CrossHeartPrayShareMenu.tsx"),
  "utf8",
);
const dailyActions = readFileSync(
  join(root, "components", "DailyBingoActions.tsx"),
  "utf8",
);
const instagramCard = readFileSync(join(root, "lib", "instagramCard.ts"), "utf8");

describe("share menu placement cannot silently regress", () => {
  it("reads its geometry from the shared, unit-tested sharePanel lib", () => {
    expect(shareMenu).toContain("computeSharePopoverPlacement(");
    expect(shareMenu).toContain("sharePanelMode(");
    expect(shareMenu).toContain("shareSheetMaxHeight(");
  });

  it("does not position the panel with unclamped trigger coordinates", () => {
    // The original bug: right/left/center offsets taken straight from the
    // trigger rect with no viewport clamping.
    expect(shareMenu).not.toMatch(/right:\s*window\.innerWidth\s*-\s*rect\.right/);
    expect(shareMenu).not.toMatch(/translateX\(-50%\)/);
  });

  it("uses a full-width bottom sheet on narrow screens", () => {
    expect(shareMenu).toContain('"sheet"');
    expect(shareMenu).toContain("inset-x-0 bottom-0");
    expect(shareMenu).toContain("safe-area-inset-bottom");
  });
});

describe("share menu stays an accessible dialog", () => {
  it("is a labeled modal dialog", () => {
    expect(shareMenu).toContain('role="dialog"');
    expect(shareMenu).toContain('aria-modal="true"');
    expect(shareMenu).toContain("aria-label={dialogLabel}");
  });

  it("moves focus into the panel and back to the trigger", () => {
    expect(shareMenu).toContain("panelRef.current.focus()");
    expect(shareMenu).toContain("triggerRef.current?.focus()");
    expect(shareMenu).toMatch(/event\.key !== "Tab"/);
    expect(shareMenu).toMatch(/"Escape"/);
  });

  it("announces results politely", () => {
    expect(shareMenu).toContain('aria-live="polite"');
  });
});

describe("only one share panel can be open at a time", () => {
  it("keeps the module-level single-instance guard", () => {
    expect(shareMenu).toContain("closeActiveShareMenu?.()");
    expect(shareMenu).toMatch(/let closeActiveShareMenu/);
  });
});

describe("essential share actions stay visible and honest", () => {
  it("offers the standard action set in the standard order", () => {
    // Only look at the rendered panel, not the text-cleanup lists above it.
    const panelStart = shareMenu.indexOf("const panel = (");
    expect(panelStart).toBeGreaterThan(-1);
    const panelJsx = shareMenu.slice(panelStart);

    const order = ["Share using device", "Copy link", "Download card image", "Copy formatted email", "Email a link"];
    let cursor = -1;
    for (const label of order) {
      const index = panelJsx.indexOf(label);
      expect(index, `label "${label}" missing`).toBeGreaterThan(-1);
      expect(index, `label "${label}" out of order`).toBeGreaterThan(cursor);
      cursor = index;
    }
  });

  it("only shows native share when the browser supports it", () => {
    expect(shareMenu).toMatch(/canNativeShare\s*\?/);
    expect(shareMenu).toContain('typeof navigator.share === "function"');
  });

  it("guards image downloads against duplicate taps", () => {
    expect(shareMenu).toMatch(/if \(busy \|\| !instagramContent\) return;/);
    expect(shareMenu).toContain("SHARE_MESSAGES.preparingCard");
  });
});

describe("native-share cancellation is never fatal", () => {
  it("share menu maps cancel to the quiet canceled message", () => {
    expect(shareMenu).toContain("isShareCancel(error)");
    expect(shareMenu).toContain("SHARE_MESSAGES.shareCanceled");
  });

  it("daily bingo actions bail out quietly on cancel instead of copying", () => {
    expect(dailyActions).toContain("if (isShareCancel(error)) return;");
  });
});

describe("card image downloads report their outcome", () => {
  it("downloadInstagramCard resolves a success flag for busy/failure states", () => {
    expect(instagramCard).toContain("Promise<boolean>");
    expect(instagramCard).toMatch(/resolve\(false\)/);
    expect(instagramCard).toMatch(/resolve\(true\)/);
  });
});
