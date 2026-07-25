"use client";

// Email signup for Bible Bingo 7 — shared by the Bible Bingo 7 page and the
// Bible Reading Plan page. Weekly (recommended default) delivers all seven
// readings for the plan week together; Daily delivers one reading each day
// through the same 52-week plan. Calm copy only.

import { useId, useState } from "react";

type SignupState =
  | { phase: "idle" }
  | { phase: "sending" }
  | { phase: "done"; message: string }
  | { phase: "error"; message: string };

export default function BibleBingoEmailSignup() {
  const formId = useId();
  const [email, setEmail] = useState("");
  const [cadence, setCadence] = useState<"weekly" | "daily">("weekly");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<SignupState>({ phase: "idle" });

  const emailInputId = `${formId}-email`;
  const consentId = `${formId}-consent`;
  const errorId = `${formId}-error`;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!consent) {
      setState({
        phase: "error",
        message: "Please check the consent box so we know it's okay to email you.",
      });
      return;
    }

    setState({ phase: "sending" });

    try {
      const response = await fetch("/api/bingo-email/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, cadence, consent }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };

      if (response.ok && data.message) {
        setState({ phase: "done", message: data.message });
        return;
      }

      setState({
        phase: "error",
        message: data.error ?? "Something didn't work. Please try again.",
      });
    } catch {
      setState({
        phase: "error",
        message: "Something didn't work. Please try again.",
      });
    }
  }

  if (state.phase === "done") {
    return (
      <section
        aria-label="Bible Bingo 7 email signup"
        className="mt-8 rounded-[2rem] border border-emerald-200/25 bg-emerald-300/10 p-6 text-center sm:p-8"
      >
        <p className="text-2xl">✉️</p>
        <h2 className="mt-2 font-serif text-2xl font-black text-white">
          Get Your Bible Bingo 7
        </h2>
        <p role="status" className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-emerald-50">
          {state.message}
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="Bible Bingo 7 email signup"
      className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 sm:p-8"
    >
      <div className="text-center">
        <p className="text-2xl" aria-hidden="true">✉️</p>
        <h2 className="mt-2 font-serif text-2xl font-black text-white">
          Get Your Bible Bingo 7
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm font-semibold leading-6 text-slate-300">
          Follow the 52-week Bible Reading Plan by email. Choose one reading
          each day or receive all seven readings for the week together.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mx-auto mt-6 flex max-w-lg flex-col gap-4"
        aria-describedby={state.phase === "error" ? errorId : undefined}
      >
        <div>
          <label
            htmlFor={emailInputId}
            className="text-xs font-black uppercase tracking-[0.18em] text-emerald-100"
          >
            Email address
          </label>
          <input
            id={emailInputId}
            type="email"
            name="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/15 bg-black/20 px-4 py-3 text-base font-semibold text-white placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
            placeholder="you@example.com"
          />
        </div>

        <fieldset className="rounded-2xl border border-white/10 bg-black/10 p-4">
          <legend className="px-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-100">
            How often
          </legend>
          <div className="flex flex-col gap-3">
            <label className="flex min-h-11 cursor-pointer items-start gap-3">
              <input
                type="radio"
                name={`${formId}-cadence`}
                value="weekly"
                checked={cadence === "weekly"}
                onChange={() => setCadence("weekly")}
                className="mt-1 h-4 w-4 accent-emerald-400"
              />
              <span className="text-sm font-semibold leading-6 text-slate-200">
                <span className="font-black text-white">
                  Weekly — seven readings each week
                </span>
                <span className="ml-2 rounded-full border border-emerald-200/30 bg-emerald-300/10 px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-[0.14em] text-emerald-100">
                  Recommended
                </span>
                <br />
                Receive all seven readings for the week together.
              </span>
            </label>
            <label className="flex min-h-11 cursor-pointer items-start gap-3">
              <input
                type="radio"
                name={`${formId}-cadence`}
                value="daily"
                checked={cadence === "daily"}
                onChange={() => setCadence("daily")}
                className="mt-1 h-4 w-4 accent-emerald-400"
              />
              <span className="text-sm font-semibold leading-6 text-slate-200">
                <span className="font-black text-white">
                  Daily — one reading each day
                </span>
                <br />
                Start on any day of the week and receive the matching reading
                from Week 1. Continue one reading each day through the
                complete 52-week plan.
              </span>
            </label>
          </div>
        </fieldset>

        <label
          htmlFor={consentId}
          className="flex min-h-11 cursor-pointer items-start gap-3"
        >
          <input
            id={consentId}
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-1 h-4 w-4 accent-emerald-400"
          />
          <span className="text-sm font-semibold leading-6 text-slate-200">
            Send me my Bible Bingo 7 emails. I can unsubscribe at any time.
          </span>
        </label>

        {state.phase === "error" ? (
          <p
            id={errorId}
            role="alert"
            className="rounded-2xl border border-amber-200/25 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100"
          >
            {state.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={state.phase === "sending"}
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-emerald-200/25 bg-emerald-300/15 px-6 py-3 text-base font-black text-emerald-50 transition hover:bg-emerald-300/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state.phase === "sending" ? "Subscribing…" : "Subscribe"}
        </button>
      </form>
    </section>
  );
}
