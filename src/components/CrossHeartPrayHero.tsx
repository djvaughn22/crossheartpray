import type { ReactNode } from "react";

type CrossHeartPrayHeroProps = {
  children?: ReactNode;
  className?: string;
  compact?: boolean;
};

export default function CrossHeartPrayHero({
  children,
  className = "",
  compact = false,
}: CrossHeartPrayHeroProps) {
  return (
    <section
      className={`mx-auto max-w-5xl text-center ${compact ? "py-3" : "py-8 sm:py-10"} ${className}`}
    >
      {/* The wordmark is the page's one h1 — Tailwind preflight keeps it visually identical to the old div. */}
      <h1 className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-black uppercase tracking-[0.34em] text-white sm:text-base">
        <span className="inline-flex items-center gap-3">
          <span className="text-4xl tracking-normal">✝️</span>
          <span>Cross</span>
        </span>
        <span className="inline-flex items-center gap-3">
          <span className="text-4xl tracking-normal">❤️</span>
          <span>Heart</span>
        </span>
        <span className="inline-flex items-center gap-3">
          <span className="text-4xl tracking-normal">🙏</span>
          <span>Pray</span>
        </span>
      </h1>

      <p className="mt-4 text-center text-lg font-black uppercase tracking-[0.28em] text-emerald-100 sm:text-xl">BIBLE EVERY DAY</p>

      {children ? (
        <div className="mx-auto mt-7 max-w-3xl text-base font-semibold leading-8 text-slate-300 sm:text-lg">
          {children}
        </div>
      ) : null}
    </section>
  );
}
