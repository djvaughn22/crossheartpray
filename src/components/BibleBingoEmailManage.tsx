"use client";

import Link from "next/link";

// Manage panel for Bible Bingo 7 emails — passwordless, driven by the
// secure manage token from the email links. Cadence changes never reset or
// reshuffle the journey; that guarantee lives server-side.

import { useCallback, useEffect, useState } from "react";

type ManageView = {
  status: "active" | "paused" | "unsubscribed";
  cadence: "weekly" | "daily";
  setsSent: number;
  totalSets: number;
  planCompletedCount: number;
  planTotal: number;
  allSetsSent: boolean;
  planFullyCompleted: boolean;
  latestBatchToken: string | null;
};

type ManageAction =
  | { action: "cadence"; cadence: "weekly" | "daily" }
  | { action: "pause" }
  | { action: "resume" }
  | { action: "unsubscribe" }
  | { action: "restart" };

const STATUS_LINES: Record<ManageView["status"], string> = {
  active: "Your Bible Bingo 7 emails are on.",
  paused: "Your emails are paused. Your progress is saved.",
  unsubscribed: "You're unsubscribed. Your progress is saved if you return.",
};

type BibleBingoEmailManageProps = {
  token: string;
  /** "unsubscribe" pre-focuses that action (from the email's link). */
  intent: string | null;
};

export default function BibleBingoEmailManage({
  token,
  intent,
}: BibleBingoEmailManageProps) {
  const [view, setView] = useState<ManageView | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "missing">(
    "loading",
  );
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmingUnsubscribe, setConfirmingUnsubscribe] = useState(
    intent === "unsubscribe",
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(
          `/api/bingo-email/manage/${encodeURIComponent(token)}`,
          { cache: "no-store" },
        );
        if (cancelled) return;
        if (!response.ok) {
          setLoadState("missing");
          return;
        }
        setView((await response.json()) as ManageView);
        setLoadState("ready");
      } catch {
        if (!cancelled) setLoadState("missing");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const apply = useCallback(
    async (action: ManageAction, doneNotice: string) => {
      setBusy(true);
      setNotice(null);
      try {
        const response = await fetch(
          `/api/bingo-email/manage/${encodeURIComponent(token)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(action),
          },
        );
        if (response.ok) {
          setView((await response.json()) as ManageView);
          setNotice(doneNotice);
        } else {
          setNotice("That change couldn't be made. Please try again.");
        }
      } catch {
        setNotice("That change couldn't be made. Please try again.");
      } finally {
        setBusy(false);
        setConfirmingUnsubscribe(false);
      }
    },
    [token],
  );

  if (loadState === "loading") {
    return (
      <p className="py-16 text-center text-sm font-semibold text-slate-400" role="status">
        Loading your email settings…
      </p>
    );
  }

  if (loadState === "missing" || !view) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h2 className="font-serif text-2xl font-black text-white">
          This manage link isn&apos;t available
        </h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
          Open the “Manage email settings” link at the bottom of any of your
          Bible Bingo 7 emails to reach this page.
        </p>
      </div>
    );
  }

  const buttonClass =
    "inline-flex min-h-11 items-center justify-center rounded-full border px-5 py-2 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:opacity-60";

  return (
    <div className="mx-auto max-w-xl">
      <p role="status" className="text-center text-sm font-bold text-emerald-100">
        {STATUS_LINES[view.status]}
      </p>

      {notice ? (
        <p
          role="status"
          className="mt-4 rounded-2xl border border-emerald-200/25 bg-emerald-300/10 px-4 py-3 text-center text-sm font-semibold text-emerald-50"
        >
          {notice}
        </p>
      ) : null}

      <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6 text-center">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-100">
          Your progress
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-200">
          {view.setsSent} of {view.totalSets} sets of seven delivered ·{" "}
          {view.planCompletedCount} of {view.planTotal} readings completed
        </p>
        {view.planFullyCompleted ? (
          <p className="mt-3 text-sm font-bold text-emerald-50">
            You completed the full Bible Reading Plan.
          </p>
        ) : null}
        {view.latestBatchToken ? (
          <Link
            href={`/explorebible?batch=${encodeURIComponent(view.latestBatchToken)}`}
            className={`${buttonClass} mt-4 border-emerald-200/25 bg-emerald-300/10 text-emerald-50 hover:bg-emerald-300/20`}
          >
            Open my latest Bible Bingo 7
          </Link>
        ) : null}
      </div>

      {view.status !== "unsubscribed" ? (
        <fieldset className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6">
          <legend className="px-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-100">
            How often
          </legend>
          <p className="text-xs font-semibold leading-5 text-slate-400">
            Switching keeps your place — the same journey, at a different pace.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {(["weekly", "daily"] as const).map((option) => (
              <button
                key={option}
                type="button"
                disabled={busy || view.cadence === option}
                aria-pressed={view.cadence === option}
                onClick={() =>
                  apply(
                    { action: "cadence", cadence: option },
                    option === "weekly"
                      ? "You'll now receive seven readings once per week."
                      : "You'll now receive seven readings every day.",
                  )
                }
                className={`${buttonClass} ${
                  view.cadence === option
                    ? "border-emerald-200/40 bg-emerald-300/25 text-white"
                    : "border-white/15 bg-black/20 text-slate-200 hover:bg-black/30"
                }`}
              >
                {option === "weekly" ? "Weekly" : "Daily"}
                {view.cadence === option ? " · current" : ""}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="mt-6 flex flex-col items-center gap-3">
        {view.status === "active" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              apply({ action: "pause" }, "Emails paused. Resume any time.")
            }
            className={`${buttonClass} border-white/15 bg-black/20 text-slate-200 hover:bg-black/30`}
          >
            Pause emails
          </button>
        ) : null}

        {view.status === "paused" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              apply({ action: "resume" }, "Emails resumed. Welcome back.")
            }
            className={`${buttonClass} border-emerald-200/25 bg-emerald-300/10 text-emerald-50 hover:bg-emerald-300/20`}
          >
            Resume emails
          </button>
        ) : null}

        {view.status === "active" && view.allSetsSent ? (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              apply(
                { action: "restart" },
                "A fresh journey through the plan has begun.",
              )
            }
            className={`${buttonClass} border-emerald-200/25 bg-emerald-300/10 text-emerald-50 hover:bg-emerald-300/20`}
          >
            Begin a fresh journey
          </button>
        ) : null}

        {view.status !== "unsubscribed" ? (
          confirmingUnsubscribe ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-amber-200/25 bg-amber-300/10 p-4">
              <p className="text-sm font-semibold text-amber-100">
                Unsubscribe from Bible Bingo 7 emails?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    apply(
                      { action: "unsubscribe" },
                      "You're unsubscribed. Thank you for reading with us.",
                    )
                  }
                  className={`${buttonClass} border-amber-200/40 bg-amber-300/20 text-amber-50 hover:bg-amber-300/30`}
                >
                  Yes, unsubscribe
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmingUnsubscribe(false)}
                  className={`${buttonClass} border-white/15 bg-black/20 text-slate-200 hover:bg-black/30`}
                >
                  Keep my emails
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmingUnsubscribe(true)}
              className={`${buttonClass} border-white/15 bg-black/20 text-slate-400 hover:text-slate-200`}
            >
              Unsubscribe
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}
