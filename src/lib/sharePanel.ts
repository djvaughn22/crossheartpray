// Shared geometry + UX rules for every card-share surface on CrossHeartPray.
// Pure functions only — the share menu component reads its placement from here
// so the "panel hangs off the left edge of a phone" class of bug stays fixed
// and unit-tested without a DOM.

export const SHARE_PANEL_MARGIN = 12; // safe gutter between the panel and the viewport edge
export const SHARE_PANEL_WIDTH = 288; // preferred popover width (Tailwind w-72)
export const SHARE_SHEET_BREAKPOINT = 640; // below this viewport width, use the bottom sheet

export type SharePanelMode = "sheet" | "popover";

export type ShareTriggerRect = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type ShareViewport = {
  width: number;
  height: number;
};

export type SharePopoverPlacement = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

// Narrow screens (phone portrait, zoomed browsers) get a bottom sheet: full
// width, thumb-reachable, nothing to clip. Wider screens keep a popover.
export function sharePanelMode(viewport: ShareViewport): SharePanelMode {
  return viewport.width < SHARE_SHEET_BREAKPOINT ? "sheet" : "popover";
}

// Popover placement, clamped on BOTH axes. The old menu only clamped
// vertically; a trigger sitting mid-screen pushed the panel's left edge off
// the viewport. Every value returned here keeps the panel fully visible.
export function computeSharePopoverPlacement(
  trigger: ShareTriggerRect,
  viewport: ShareViewport,
): SharePopoverPlacement {
  const margin = SHARE_PANEL_MARGIN;
  const width = Math.min(SHARE_PANEL_WIDTH, Math.max(160, viewport.width - margin * 2));

  // Prefer right-aligning the panel to the trigger, then clamp inside the viewport.
  let left = trigger.right - width;
  left = Math.min(left, viewport.width - margin - width);
  left = Math.max(left, margin);

  const cap = Math.min(Math.round(viewport.height * 0.75), 640);
  let top = trigger.bottom + 8;
  if (top + Math.min(cap, 360) > viewport.height - margin) {
    top = Math.max(margin, viewport.height - cap - margin);
  }
  const maxHeight = Math.max(160, Math.min(cap, viewport.height - top - margin));

  return { top, left, width, maxHeight };
}

// Bottom-sheet height cap: the sheet scrolls internally past this, and always
// leaves a strip of page visible above it (even in short landscape viewports).
export function shareSheetMaxHeight(viewport: ShareViewport): number {
  return Math.max(180, Math.round(viewport.height * 0.85));
}

// A user backing out of the native share sheet is not an error.
export function isShareCancel(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = (error as { name?: unknown }).name;
  return name === "AbortError" || name === "NotAllowedError";
}

// One voice for every share surface — short, human, no stack traces.
export const SHARE_MESSAGES = {
  linkCopied: "Link copied.",
  copyBlocked: "Couldn't copy. Try another option.",
  emailCopied: "Formatted email copied. Paste it into your email app.",
  preparingCard: "Preparing card…",
  cardDownloaded: "Card downloaded.",
  cardFailed: "Couldn't prepare the card. Try again.",
  shareCanceled: "Sharing was canceled.",
  shareFailed: "Couldn't share. Try another option.",
} as const;
