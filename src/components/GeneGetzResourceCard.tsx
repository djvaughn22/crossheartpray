import {
  formatPrincipleRange,
  GENE_GETZ_SOURCE_LABEL,
  type LifeEssentialsPrinciple,
} from "../lib/geneGetzLifeEssentials";

// Compact, optional deeper-study card shown when a Bible verse falls inside a
// seeded Dr. Gene Getz Life Essentials principle range. Bible-first tone: the
// Scripture is the destination; this is an external study help.
export default function GeneGetzResourceCard({
  principles,
}: {
  principles: LifeEssentialsPrinciple[];
}) {
  if (!principles.length) return null;

  return (
    <div className="mt-6 w-full rounded-[1.5rem] border border-amber-200/25 bg-amber-300/[0.06] px-5 py-5 text-left">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-200">
        Life Essentials connection
      </p>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-200">
        This verse appears inside a Dr. Gene Getz Life Essentials principle
        range. Open the Bible first, then continue into the principle.
      </p>

      {principles.map((principle) => {
        const href = principle.officialVideoUrl;
        const isVideo = principle.verified && Boolean(principle.officialVideoUrl);
        return (
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
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center justify-center rounded-full border border-amber-200/30 bg-amber-300/12 px-5 py-2 text-sm font-bold text-amber-50 shadow-sm transition hover:bg-amber-300/20"
            >
              {isVideo
                ? "Watch official Gene Getz video"
                : "Open official Principle Finder"}
            </a>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
              {principle.sourceLabel ?? GENE_GETZ_SOURCE_LABEL}
            </p>
          </div>
        );
      })}
    </div>
  );
}
