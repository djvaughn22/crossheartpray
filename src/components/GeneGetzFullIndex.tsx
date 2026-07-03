"use client";

import { useState } from "react";
import {
  formatPrincipleRange,
  type LifeEssentialsPrinciple,
} from "../lib/geneGetzLifeEssentials";
import YouTubeModal from "./YouTubeModal";

type Group = { book: string; items: LifeEssentialsPrinciple[] };

// Full 1,500-principle index, grouped by book (collapsible), with one shared
// in-app YouTube player. Each principle plays the official Dr. Gene Getz video.
export default function GeneGetzFullIndex({
  groups,
  principleFinderUrl,
}: {
  groups: Group[];
  principleFinderUrl: string;
}) {
  const [active, setActive] = useState<LifeEssentialsPrinciple | null>(null);

  return (
    <div className="mt-6 space-y-3">
      {groups.map((group) => (
        <details
          key={group.book}
          className="group rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <span className="text-base font-black text-white">{group.book}</span>
            <span className="rounded-full border border-amber-200/25 bg-amber-300/10 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.14em] text-amber-100">
              {group.items.length} principle{group.items.length === 1 ? "" : "s"}
            </span>
          </summary>

          <ul className="mt-4 space-y-2 border-t border-white/10 pt-4">
            {group.items.map((p) => (
              <li
                key={`${p.code}-${p.principleNumber}-${p.startChapter}-${p.startVerse}`}
                className="flex flex-col gap-1 rounded-xl border border-white/8 bg-black/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-100">
                    #{p.principleNumber} · {p.book} {formatPrincipleRange(p)}
                  </p>
                  <p className="text-sm font-bold leading-5 text-white">
                    {p.principleTitle}
                  </p>
                </div>
                {p.youtubeId ? (
                  <button
                    type="button"
                    onClick={() => setActive(p)}
                    className="mt-1 inline-flex shrink-0 items-center justify-center rounded-full border border-amber-200/30 bg-amber-300/12 px-4 py-1.5 text-xs font-bold text-amber-50 transition hover:bg-amber-300/20 sm:mt-0"
                  >
                    ▶ Watch
                  </button>
                ) : (
                  <a
                    href={p.officialVideoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex shrink-0 items-center justify-center rounded-full border border-amber-200/30 bg-amber-300/12 px-4 py-1.5 text-xs font-bold text-amber-50 transition hover:bg-amber-300/20 sm:mt-0"
                  >
                    Official page
                  </a>
                )}
              </li>
            ))}
          </ul>
        </details>
      ))}

      {active?.youtubeId ? (
        <YouTubeModal
          videoId={active.youtubeId}
          title={`Principle ${active.principleNumber} · ${active.principleTitle}`}
          onClose={() => setActive(null)}
        />
      ) : null}

      <a
        href={principleFinderUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-bold text-slate-100 transition hover:bg-white/10"
      >
        Open official Principle Finder →
      </a>
    </div>
  );
}
