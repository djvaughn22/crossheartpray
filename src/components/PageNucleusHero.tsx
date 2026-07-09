"use client";

import { type ReactNode } from "react";

type PageNucleusHeroProps = {
  title: string;
  subhead: string;
  body?: string;
  children?: ReactNode;
  actionsInline?: boolean;
};

export default function PageNucleusHero({
  title,
  subhead,
  body,
  children,
  actionsInline = false,
}: PageNucleusHeroProps) {
  if (actionsInline) {
    return (
      <section className="text-center">
        <div>
          <div className="min-w-0">
            <div
              className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[0.58rem] font-black uppercase tracking-[0.18em] text-white sm:text-[0.66rem]"
              aria-hidden="true"
            >
              <span className="inline-flex items-center gap-1">
                <span className="text-lg tracking-normal sm:text-xl">✝️</span>
                <span>Cross</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="text-lg tracking-normal sm:text-xl">❤️</span>
                <span>Heart</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="text-lg tracking-normal sm:text-xl">🙏</span>
                <span>Pray</span>
              </span>
            </div>

            <h1 className="mx-auto mt-1 max-w-3xl text-2xl font-black leading-none tracking-tight text-white print:text-black sm:text-3xl">
              {title}
            </h1>

            <p className="mx-auto mt-1 max-w-3xl text-xs font-black leading-snug text-emerald-100 print:text-black sm:text-sm">
              {subhead}
            </p>

            {body ? (
              <p className="mx-auto mt-1 max-w-3xl text-[0.72rem] font-semibold leading-4 text-slate-300 print:text-black sm:text-xs">
                {body}
              </p>
            ) : null}
          </div>

          {children ? (
            <div className="mt-3 flex justify-center print:hidden">
              {children}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="text-center">
      <div>
        <div
          className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[0.68rem] font-black uppercase tracking-[0.22em] text-white sm:text-xs"
          aria-hidden="true"
        >
          <span className="inline-flex items-center gap-1.5">
            <span className="text-xl tracking-normal sm:text-2xl">✝️</span>
            <span>Cross</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="text-xl tracking-normal sm:text-2xl">❤️</span>
            <span>Heart</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="text-xl tracking-normal sm:text-2xl">🙏</span>
            <span>Pray</span>
          </span>
        </div>

        <h1 className="mx-auto mt-2 max-w-3xl text-3xl font-black leading-none tracking-tight text-white print:text-black sm:text-4xl">
          {title}
        </h1>

        <p className="mx-auto mt-1.5 max-w-2xl text-sm font-black leading-snug text-emerald-100 print:text-black sm:text-base">
          {subhead}
        </p>

        {body ? (
          <p className="mx-auto mt-1.5 max-w-2xl text-xs font-semibold leading-5 text-slate-300 print:text-black sm:text-sm">
            {body}
          </p>
        ) : null}

        {children ? <div className="mt-2 flex justify-center print:hidden">{children}</div> : null}
      </div>
    </section>
  );
}
