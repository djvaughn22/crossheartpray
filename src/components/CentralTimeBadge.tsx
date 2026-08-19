"use client";

import { useEffect, useState } from "react";

type CentralTimeBadgeProps = {
  className?: string;
  showReadingPlan?: boolean;
};

const READING_PLAN_HREF = "/bible-reading-plan";

type CentralParts = {
  weekday: string;
  month: string;
  day: number;
  year: number;
  hour: string;
  minute: string;
  dayPeriod: string;
  week: number;
};

function getCentralParts(): CentralParts {
  const now = new Date();

  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).formatToParts(now);

  const timeParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(now);

  const value = (parts: Intl.DateTimeFormatPart[], type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const year = Number(value(dateParts, "year"));
  const monthName = value(dateParts, "month");
  const day = Number(value(dateParts, "day"));

  const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
  const centralDate = new Date(Date.UTC(year, monthIndex, day));
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const dayOfYear =
    Math.floor((centralDate.getTime() - startOfYear.getTime()) / 86400000) + 1;
  const week = Math.min(52, Math.max(1, Math.ceil(dayOfYear / 7)));

  return {
    weekday: value(dateParts, "weekday"),
    month: monthName,
    day,
    year,
    hour: value(timeParts, "hour"),
    minute: value(timeParts, "minute"),
    dayPeriod: value(timeParts, "dayPeriod"),
    week,
  };
}

export default function CentralTimeBadge({
  className = "",
  showReadingPlan = true,
}: CentralTimeBadgeProps) {
  const [parts, setParts] = useState<CentralParts | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clock is client-only; first value must be read after mount to match SSR
    setParts(getCentralParts());

    const timer = window.setInterval(() => {
      setParts(getCentralParts());
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

  if (!parts) {
    return null;
  }

  return (
    <div className={`mx-auto flex max-w-3xl flex-col items-center gap-1 ${className}`}>
      <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm font-black text-slate-200 sm:text-base">
        <span>
          {parts.weekday}, {parts.month} {parts.day}
        </span>
        <span aria-hidden="true" className="text-slate-500">
          ·
        </span>
        <span>Week {parts.week}</span>
      </p>

      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-xs">
        {parts.hour}:{parts.minute} {parts.dayPeriod} Central Time
        {showReadingPlan ? (
          <>
            {" "}
            ·{" "}
            <a
              href={READING_PLAN_HREF}
              className="text-slate-400 underline decoration-white/20 underline-offset-4 transition hover:text-emerald-100 hover:decoration-emerald-100/60"
            >
              Bible reading plan
            </a>
          </>
        ) : null}
      </p>
    </div>
  );
}
