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
    <div
      className={`mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-400 sm:text-sm ${className}`}
      aria-label="Current Central Time and Bible reading plan week"
    >
      <span>{parts.weekday}</span>
      <span aria-hidden="true">·</span>
      <span>
        {parts.month} {parts.day}, {parts.year}
      </span>
      <span aria-hidden="true">·</span>
      <span>
        {parts.hour}:{parts.minute} {parts.dayPeriod} Central Time
      </span>
      <span aria-hidden="true">·</span>
      <span>Week {parts.week}</span>
      {showReadingPlan ? (
        <>
          <span aria-hidden="true">·</span>
          <a
            href={READING_PLAN_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-300 underline decoration-white/20 underline-offset-4 transition hover:text-emerald-100 hover:decoration-emerald-100/60"
          >
            Bible reading plan
          </a>
        </>
      ) : null}
    </div>
  );
}
