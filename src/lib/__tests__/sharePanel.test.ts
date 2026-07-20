import { describe, expect, it } from "vitest";
import {
  computeSharePopoverPlacement,
  isShareCancel,
  SHARE_MESSAGES,
  SHARE_PANEL_MARGIN,
  sharePanelMode,
  shareSheetMaxHeight,
  type ShareTriggerRect,
  type ShareViewport,
} from "../sharePanel";

// The exact viewports the share UI must work on.
const VIEWPORTS: Record<string, ShareViewport> = {
  "320x568 portrait": { width: 320, height: 568 },
  "360x640 portrait": { width: 360, height: 640 },
  "390x844 portrait": { width: 390, height: 844 },
  "844x390 landscape": { width: 844, height: 390 },
  "768x1024 tablet": { width: 768, height: 1024 },
  "1280x800 desktop": { width: 1280, height: 800 },
};

// Trigger positions that broke the old menu: centered hero button, icon button
// near the left edge, button at the far right, button at the bottom of the page.
function triggerPositions(viewport: ShareViewport): ShareTriggerRect[] {
  const midX = viewport.width / 2;
  return [
    { top: 80, bottom: 116, left: midX - 60, right: midX + 60 }, // centered hero Share
    { top: 200, bottom: 236, left: 8, right: 44 }, // icon button near left edge
    { top: 200, bottom: 236, left: viewport.width - 44, right: viewport.width - 8 }, // far right
    { top: viewport.height - 60, bottom: viewport.height - 24, left: midX - 40, right: midX + 40 }, // near bottom
  ];
}

describe("sharePanelMode picks a phone-friendly presentation", () => {
  it("uses the bottom sheet on narrow portrait phones", () => {
    expect(sharePanelMode(VIEWPORTS["320x568 portrait"])).toBe("sheet");
    expect(sharePanelMode(VIEWPORTS["360x640 portrait"])).toBe("sheet");
    expect(sharePanelMode(VIEWPORTS["390x844 portrait"])).toBe("sheet");
  });

  it("uses the popover on landscape phones, tablets, and desktop", () => {
    expect(sharePanelMode(VIEWPORTS["844x390 landscape"])).toBe("popover");
    expect(sharePanelMode(VIEWPORTS["768x1024 tablet"])).toBe("popover");
    expect(sharePanelMode(VIEWPORTS["1280x800 desktop"])).toBe("popover");
  });

  it("treats a 200%-zoom desktop like a narrow phone", () => {
    expect(sharePanelMode({ width: 640 / 2, height: 400 })).toBe("sheet");
  });
});

describe("popover placement never leaves the viewport", () => {
  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    it(`stays fully visible at ${name} for every trigger position`, () => {
      for (const trigger of triggerPositions(viewport)) {
        const p = computeSharePopoverPlacement(trigger, viewport);

        // Left edge must never be clipped — this was the original bug.
        expect(p.left).toBeGreaterThanOrEqual(SHARE_PANEL_MARGIN);
        // Right edge stays inside the viewport.
        expect(p.left + p.width).toBeLessThanOrEqual(viewport.width - SHARE_PANEL_MARGIN);
        // Panel is never wider than the viewport.
        expect(p.width).toBeLessThanOrEqual(viewport.width - SHARE_PANEL_MARGIN * 2);
        // Vertical bounds hold, even for triggers near the bottom.
        expect(p.top).toBeGreaterThanOrEqual(SHARE_PANEL_MARGIN);
        expect(p.top + p.maxHeight).toBeLessThanOrEqual(viewport.height - SHARE_PANEL_MARGIN + 1);
        // Enough room to actually use the menu.
        expect(p.maxHeight).toBeGreaterThanOrEqual(160);
      }
    });
  }

  it("regression: centered trigger on a 390px phone no longer pushes the panel offscreen left", () => {
    // Old behavior: right-align a 288px panel to a centered trigger → left ≈ -33.
    const trigger = { top: 100, bottom: 136, left: 135, right: 255 };
    const p = computeSharePopoverPlacement(trigger, { width: 390, height: 844 });
    expect(p.left).toBeGreaterThanOrEqual(SHARE_PANEL_MARGIN);
  });
});

describe("bottom sheet respects short viewports", () => {
  it("always leaves page visible above the sheet", () => {
    for (const viewport of Object.values(VIEWPORTS)) {
      const maxH = shareSheetMaxHeight(viewport);
      expect(maxH).toBeLessThan(viewport.height);
      expect(maxH).toBeGreaterThanOrEqual(180);
    }
  });
});

describe("native-share cancellation is not an error", () => {
  it("recognizes AbortError and NotAllowedError as user cancellation", () => {
    expect(isShareCancel({ name: "AbortError" })).toBe(true);
    expect(isShareCancel({ name: "NotAllowedError" })).toBe(true);
  });

  it("treats real failures and junk values as failures", () => {
    expect(isShareCancel(new Error("boom"))).toBe(false);
    expect(isShareCancel({ name: "TypeError" })).toBe(false);
    expect(isShareCancel(null)).toBe(false);
    expect(isShareCancel("AbortError")).toBe(false);
  });
});

describe("share messages stay short and human", () => {
  it("has the standard wording", () => {
    expect(SHARE_MESSAGES.linkCopied).toBe("Link copied.");
    expect(SHARE_MESSAGES.cardDownloaded).toBe("Card downloaded.");
    expect(SHARE_MESSAGES.shareCanceled).toBe("Sharing was canceled.");
    expect(SHARE_MESSAGES.cardFailed).toBe("Couldn't prepare the card. Try again.");
  });

  it("never leaks technical jargon", () => {
    for (const message of Object.values(SHARE_MESSAGES)) {
      expect(message).not.toMatch(/error|exception|undefined|null|stack|failed:/i);
      expect(message.length).toBeLessThan(70);
    }
  });
});
