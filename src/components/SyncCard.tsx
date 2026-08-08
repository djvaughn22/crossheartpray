"use client";

// The one public surface for Save on Any Device.
//
// CrossHeartPray itself is free and stays free: Scripture, the Reading Plan,
// Daily Hope, Bible Bingo 7, and Deep Dive never depend on an account. This
// card only offers cross-device persistence, and it is deliberately a quiet
// utility rather than a pitch — no hero, no banner, no interruption.
//
// Access is temporary owner-decision scaffolding, not the product: email +
// the one shared beta password admits immediately (POST /api/sync/auth/beta).
// A paid subscription will replace the shared password as the source of the
// Sync entitlement later without changing anything below this card — the
// account, session, and merge engine stay the same either way.

import { useCallback, useEffect, useState } from "react";
import {
  clearSyncShadow,
  fetchSyncAccount,
  syncProgressNow,
  type SyncAccount,
} from "../lib/syncClient";

const fieldClass =
  "w-full rounded-2xl border border-white/15 bg-slate-900/70 px-4 py-3 text-sm font-semibold text-slate-100 placeholder:text-slate-500 focus:border-emerald-200/50 focus:outline-none";
const primaryClass =
  "inline-flex items-center justify-center rounded-full border border-emerald-200/30 bg-emerald-200/15 px-5 py-2.5 text-sm font-black text-emerald-50 transition hover:bg-emerald-200/25 disabled:opacity-50";
const quietClass =
  "inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-50";

export default function SyncCard() {
  const [account, setAccount] = useState<SyncAccount | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchSyncAccount().then((value) => {
      if (!active) return;
      setAccount(value);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const runSync = useCallback(async (userId: string) => {
    const result = await syncProgressNow(userId);

    if (result.ok) {
      setNotice(
        result.changed
          ? "Your reading progress is up to date on this device."
          : "Everything is already up to date.",
      );
      return;
    }

    setError(result.error);
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/sync/auth/beta", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        account?: SyncAccount;
        error?: string;
      };

      if (!response.ok || !body.account) {
        setError(body.error ?? "Sync is temporarily unavailable.");
        return;
      }

      setAccount(body.account);
      setPassword("");
      await runSync(body.account.id);
    } catch {
      setError(
        "Could not reach CrossHeartPray Sync. Your reading progress is still saved on this device.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      await fetch("/api/sync/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {
      // Even if the network call fails, drop this browser back to local-only.
    }

    clearSyncShadow();
    setAccount(null);
    setEmail("");
    setNotice(
      "Signed out. CrossHeartPray keeps working on this device, and your saved progress is still on your account.",
    );
    setBusy(false);
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-left">
      <h2 className="text-lg font-black text-white">Save on any device</h2>

      <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
        CrossHeartPray is free on this device and stays free. An optional
        subscription will keep your reading progress with you when you move
        between your phone, tablet, and computer.
      </p>

      {!loaded ? null : account ? (
        <div className="mt-5">
          <p className="text-sm font-semibold text-slate-300">
            Signed in as{" "}
            <span className="font-black text-white">{account.email}</span>.{" "}
            {account.syncActive
              ? "Save on any device is on for this account."
              : "Save on any device is not active on this account."}
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            {account.syncActive ? (
              <button
                type="button"
                className={primaryClass}
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  setError(null);
                  setNotice(null);
                  runSync(account.id).finally(() => setBusy(false));
                }}
              >
                {busy ? "Syncing…" : "Sync now"}
              </button>
            ) : null}
            <button
              type="button"
              className={quietClass}
              disabled={busy}
              onClick={signOut}
            >
              Sign out
            </button>
          </div>
        </div>
      ) : (
        <form className="mt-5 space-y-3" onSubmit={submit}>
          <label
            className="block text-xs font-black uppercase tracking-[0.18em] text-slate-400"
            htmlFor="chp-sync-email"
          >
            Email
          </label>
          <input
            id="chp-sync-email"
            className={fieldClass}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />

          <label
            className="block text-xs font-black uppercase tracking-[0.18em] text-slate-400"
            htmlFor="chp-sync-password"
          >
            Password
          </label>
          <input
            id="chp-sync-password"
            className={fieldClass}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />

          <button type="submit" className={primaryClass} disabled={busy}>
            {busy ? "Working…" : "Save on any device"}
          </button>
        </form>
      )}

      {error ? (
        <p className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100">
          {error}
        </p>
      ) : null}

      {notice ? (
        <p className="mt-4 rounded-2xl border border-emerald-200/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-50">
          {notice}
        </p>
      ) : null}
    </section>
  );
}
