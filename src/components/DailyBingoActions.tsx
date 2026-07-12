"use client";

import { useState } from "react";

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

  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        return;
      } catch {
        // Cancelled or unsupported — fall through to copy.
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
      <button
        type="button"
        onClick={share}
        className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-7 py-3 font-semibold text-slate-100 transition hover:bg-white/15"
      >
        {copied ? "Link copied" : "Share this page"}
      </button>

      <a
        href={imagePath}
        download={imageFileName}
        className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-7 py-3 font-semibold text-slate-200 transition hover:bg-white/10"
      >
        Download today’s card
      </a>
    </div>
  );
}
