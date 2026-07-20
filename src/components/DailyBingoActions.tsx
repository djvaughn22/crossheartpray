"use client";

import { useEffect, useState } from "react";
import { track } from "../lib/analytics";
import { isShareCancel, SHARE_MESSAGES } from "../lib/sharePanel";

type DailyBingoActionsProps = {
  shareTitle: string;
  shareText: string;
  shareUrl: string;
  imagePath: string;
  imageFileName: string;
};

// Share / download controls for the Daily Bible Bingo pages.
export default function DailyBingoActions({
  shareTitle,
  shareText,
  shareUrl,
  imagePath,
  imageFileName,
}: DailyBingoActionsProps) {
  const [copied, setCopied] = useState(false);

  // GA: page view + delegated clicks for verse/board links rendered by the
  // server component around these actions.
  useEffect(() => {
    track("chp_today_viewed", { title: shareTitle });

    function onClick(event: MouseEvent) {
      const anchor = (event.target as HTMLElement).closest?.("a");
      const href = anchor?.getAttribute("href") ?? "";
      if (!href) return;
      if (href.includes("bible.com")) {
        track("chp_verse_opened", { href });
      } else if (href.startsWith("/bible-bingo/") || href.startsWith("/explorebible")) {
        track("chp_board_opened", { href });
      }
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function share() {
    track("chp_shared", { title: shareTitle });
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        return;
      } catch (error) {
        // Backing out of the native share sheet is a choice, not a failure —
        // don't surprise the user with a clipboard copy they didn't ask for.
        if (isShareCancel(error)) return;
        // Genuinely unsupported/failed — fall through to copy.
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — nothing else to do.
    }
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
      <span aria-live="polite" role="status" className="sr-only">
        {copied ? SHARE_MESSAGES.linkCopied : ""}
      </span>
      <button
        type="button"
        onClick={share}
        className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-7 py-3 font-semibold text-slate-100 transition hover:bg-white/15"
      >
        {copied ? SHARE_MESSAGES.linkCopied : "Share this page"}
      </button>

      <a
        href={imagePath}
        download={imageFileName}
        onClick={() => track("chp_card_downloaded", { file: imageFileName })}
        className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-7 py-3 font-semibold text-slate-200 transition hover:bg-white/10"
      >
        Download today’s card
      </a>
    </div>
  );
}
