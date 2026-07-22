"use client";

// The Life Essentials companion inside the Scripture reader — Dr. Gene Getz
// principle cards for the chapter on screen, with the official video playable
// in place. Extracted from the retired standalone reader overlay so the
// Reading Plan cell reader keeps the identical, verified behavior: matches
// come only from getGeneGetzPrinciplesForChapter (nothing fabricated),
// playback starts only on the explicit Watch tap, and every link is an
// official destination.

import { useEffect, useState } from "react";
import {
  GENE_GETZ_SOURCE_LABEL,
  formatPrincipleRange,
  getGeneGetzPrinciplesForChapter,
  type LifeEssentialsPrinciple,
} from "../../lib/geneGetzLifeEssentials";
import { track } from "../../lib/analytics";

function principleKey(principle: LifeEssentialsPrinciple) {
  return `${principle.code}-${principle.principleNumber}-${principle.startChapter}-${principle.startVerse}`;
}

type ReaderLifeEssentialsProps = {
  book: string;
  chapter: number;
};

export default function ReaderLifeEssentials({ book, chapter }: ReaderLifeEssentialsProps) {
  // Which principle's embedded player is revealed — playback starts only on
  // the explicit Watch tap, never when the reader opens.
  const [playingKey, setPlayingKey] = useState<string | null>(null);

  // Moving to another chapter closes any open player.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset is keyed to the chapter on screen
    setPlayingKey(null);
  }, [book, chapter]);

  const getzMatches = getGeneGetzPrinciplesForChapter(book, chapter);
  if (getzMatches.length === 0) return null;

  const watchPillClass =
    "inline-flex min-h-11 items-center justify-center rounded-full border border-emerald-200/30 bg-emerald-300/10 px-5 text-sm font-bold text-emerald-50 transition hover:bg-emerald-300/20";

  return (
    <section
      aria-label={GENE_GETZ_SOURCE_LABEL}
      className="mx-auto mt-6 max-w-[38rem] text-left"
    >
      <div className="rounded-2xl border border-emerald-200/25 bg-emerald-300/[0.07] p-4 sm:p-5">
        <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-emerald-100">
          {GENE_GETZ_SOURCE_LABEL}
        </p>

        {getzMatches.map((principle) => {
          const key = principleKey(principle);
          const playing = playingKey === key;
          return (
            <article
              key={key}
              className="mt-3 rounded-xl border border-white/10 bg-black/25 p-4"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100">
                Principle {principle.principleNumber} · {principle.book}{" "}
                {formatPrincipleRange(principle)}
              </p>
              <h4 className="mt-1 text-base font-bold leading-6 text-white">
                {principle.principleTitle}
              </h4>
              <p className="mt-1.5 text-xs leading-5 text-slate-300">
                {principle.shortPrincipleSummary}
              </p>

              {playing && principle.youtubeId ? (
                <>
                  {/* The same in-app player CrossHeartPray already uses
                      (YouTubeModal), embedded in the reader. It mounts only
                      on the explicit Watch tap. */}
                  <div className="-mx-4 mt-3 aspect-video overflow-hidden border-y border-white/10 bg-black sm:mx-0 sm:rounded-xl sm:border-x">
                    <iframe
                      className="h-full w-full"
                      src={`https://www.youtube-nocookie.com/embed/${principle.youtubeId}?autoplay=1&rel=0&controls=1&playsinline=1&fs=1`}
                      title={`Principle ${principle.principleNumber} · ${principle.principleTitle}`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  </div>
                  <p className="mt-2 text-[11px] font-semibold leading-4 text-slate-400">
                    Player not loading?{" "}
                    <a
                      href={principle.officialVideoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-100 underline decoration-white/25 underline-offset-2 hover:text-white"
                    >
                      Watch on the official player
                    </a>
                    .
                  </p>
                </>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                {principle.youtubeId ? (
                  <button
                    type="button"
                    aria-expanded={playing}
                    onClick={() => {
                      if (!playing) {
                        track("media_play", {
                          content_type: "getz_video",
                          content_title: principle.principleTitle,
                        });
                      }
                      setPlayingKey(playing ? null : key);
                    }}
                    className={watchPillClass}
                  >
                    {playing ? "Hide player" : "▶ Watch principle"}
                  </button>
                ) : (
                  <a
                    href={principle.officialVideoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={watchPillClass}
                  >
                    ▶ Watch principle
                  </a>
                )}
                <a
                  href={principle.officialVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-emerald-100/70 underline decoration-white/20 underline-offset-4 hover:text-emerald-50"
                >
                  Official page
                </a>
              </div>

              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                {principle.sourceLabel ?? GENE_GETZ_SOURCE_LABEL}
              </p>
            </article>
          );
        })}

        <a
          href="/life-essentials"
          className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 text-xs font-bold text-slate-200 transition hover:bg-white/10"
        >
          All Life Essentials →
        </a>
      </div>
    </section>
  );
}
