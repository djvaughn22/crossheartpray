"use client";

import { useState } from "react";
import {
  formatPrincipleRange,
  GENE_GETZ_SOURCE_LABEL,
  getAdjacentPlayablePrinciple,
  type LifeEssentialsPrinciple,
} from "../lib/geneGetzLifeEssentials";
import YouTubeModal from "./YouTubeModal";

// Compact, optional deeper-study card shown when a Bible verse falls inside a
// Dr. Gene Getz Life Essentials principle range. Bible-first tone: the Scripture
// is the destination; this is an external study help that plays in-app.
export default function GeneGetzResourceCard({
  principles,
}: {
  principles: LifeEssentialsPrinciple[];
}) {
  const [active, setActive] = useState<LifeEssentialsPrinciple | null>(null);
  if (!principles.length) return null;

  return (
    <div className="mt-6 w-full rounded-[1.5rem] border border-amber-200/25 bg-amber-300/[0.06] px-5 py-5 text-left">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-200">
        Life Essentials connection · Dr. Gene Getz
      </p>

      {principles.map((principle) => (
        <div
          key={`${principle.book}-${principle.principleNumber}-${principle.startChapter}-${principle.startVerse}`}
          className="mt-4 rounded-2xl border border-white/10 bg-black/25 px-4 py-4"
        >
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-100">
            Principle {principle.principleNumber} · {principle.book}{" "}
            {formatPrincipleRange(principle)}
          </p>
          <p className="mt-1 text-base font-bold leading-6 text-white">
            {principle.principleTitle}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-300">
            {principle.shortPrincipleSummary}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {principle.youtubeId ? (
              <button
                type="button"
                onClick={() => setActive(principle)}
                className="inline-flex items-center justify-center rounded-full border border-amber-200/30 bg-amber-300/12 px-5 py-2 text-sm font-bold text-amber-50 shadow-sm transition hover:bg-amber-300/20"
              >
                ▶ Watch Gene Getz video
              </button>
            ) : (
              <a
                href={principle.officialVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-amber-200/30 bg-amber-300/12 px-5 py-2 text-sm font-bold text-amber-50 shadow-sm transition hover:bg-amber-300/20"
              >
                Open official Principle Finder
              </a>
            )}
            <a
              href={principle.officialVideoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-amber-100/70 underline decoration-white/20 underline-offset-4 hover:text-amber-50"
            >
              Official page
            </a>
          </div>

          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
            {principle.sourceLabel ?? GENE_GETZ_SOURCE_LABEL}
          </p>
        </div>
      ))}

      {active?.youtubeId ? (
        <YouTubeModal
          videoId={active.youtubeId}
          title={`Principle ${active.principleNumber} · ${active.principleTitle}`}
          onClose={() => setActive(null)}
          onPrev={() => setActive(getAdjacentPlayablePrinciple(active, -1))}
          onNext={() => setActive(getAdjacentPlayablePrinciple(active, 1))}
        />
      ) : null}
    </div>
  );
}
