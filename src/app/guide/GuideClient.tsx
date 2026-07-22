"use client";

// The guide experience. Everything a visitor sees here is deterministic:
// verified local Scripture, existing CrossHeartPray routes, and neutral
// owner-reviewed reflection prompts. The optional "Tell the guide" field only
// preselects the same buttons a visitor could tap — nothing on this page is
// model-generated. The prayer space is a local, private workspace: its text
// stays on this device and is never sent to any server, model, or analytics.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import PageNucleusHero from "../../components/PageNucleusHero";
import {
  buildGuideSession,
  buildGuideShareHref,
  GUIDE_NEEDS,
  GUIDE_TIMES,
  type GuideNeed,
  type GuideSession,
  type GuideTime,
} from "../../lib/guide/guideSession";
import {
  CRISIS_SUPPORT_MESSAGE,
  detectCrisisLanguage,
} from "../../lib/guide/guideSafety";
import type { GuideIntent } from "../../lib/guide/guideIntent";

const PRAYER_STORAGE_KEY = "chp-guide-prayer";
const MAX_TELL_CHARS = 300;

const RESOURCE_LINKS: Record<string, { label: string; href: string }> = {
  scripture: { label: "Look up any verse", href: "/" },
  reading_plan: { label: "Bible Reading Plan", href: "/bible-reading-plan" },
  daily_hope: { label: "Daily Hope", href: "/daily-hope" },
  bible_bingo: { label: "Bible Bingo 7", href: "/explorebible" },
};

const buttonBase =
  "inline-flex min-h-11 items-center justify-center rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60";

function choiceClasses(selected: boolean) {
  return `${buttonBase} ${
    selected
      ? "border-sky-300/60 bg-sky-300/15 text-sky-100"
      : "border-white/15 bg-white/[0.05] text-slate-200 hover:bg-white/[0.1]"
  }`;
}

type GuideClientProps = {
  aiEnabled: boolean;
  initial: { time: GuideTime; need: GuideNeed } | null;
  // Session for a shared /guide?time=…&need=… link, built on the server.
  initialSession: GuideSession | null;
};

export default function GuideClient({
  aiEnabled,
  initial,
  initialSession,
}: GuideClientProps) {
  const [time, setTime] = useState<GuideTime | null>(initial?.time ?? null);
  const [need, setNeed] = useState<GuideNeed | null>(initial?.need ?? null);
  const [session, setSession] = useState<GuideSession | null>(initialSession);
  const [extraResources, setExtraResources] = useState<string[]>([]);

  const [tellText, setTellText] = useState("");
  const [tellStatus, setTellStatus] = useState<"idle" | "sending">("idle");
  const [showSafety, setShowSafety] = useState(false);

  const [prayer, setPrayer] = useState("");
  const [prayerLoaded, setPrayerLoaded] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");

  const begin = useCallback((nextTime: GuideTime, nextNeed: GuideNeed) => {
    setTime(nextTime);
    setNeed(nextNeed);
    setSession(buildGuideSession({ time: nextTime, need: nextNeed }));
    setShareState("idle");
  }, []);

  // Private prayer workspace — local device storage only. Loaded after
  // hydration (deferred a tick) so the server and client render identically.
  useEffect(() => {
    const load = window.setTimeout(() => {
      try {
        setPrayer(window.localStorage.getItem(PRAYER_STORAGE_KEY) ?? "");
      } catch {
        // Storage unavailable (private browsing) — the field still works.
      }
      setPrayerLoaded(true);
    }, 0);
    return () => window.clearTimeout(load);
  }, []);

  useEffect(() => {
    if (!prayerLoaded) return;
    try {
      if (prayer) {
        window.localStorage.setItem(PRAYER_STORAGE_KEY, prayer);
      } else {
        window.localStorage.removeItem(PRAYER_STORAGE_KEY);
      }
    } catch {
      // Ignore storage failures — never block typing.
    }
  }, [prayer, prayerLoaded]);

  async function submitTellTheGuide() {
    const text = tellText.trim();
    if (!text || tellStatus === "sending") return;

    // Safety routing runs locally first — crisis text never leaves the page.
    if (detectCrisisLanguage(text)) {
      setShowSafety(true);
      return;
    }

    setShowSafety(false);
    setTellStatus("sending");

    let intent: GuideIntent | null = null;
    try {
      const response = await fetch("/api/guide/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userText: text }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data?.safety) {
          setShowSafety(true);
          setTellStatus("idle");
          return;
        }
        intent = data?.intent ?? null;
      }
    } catch {
      // Network or server trouble — the deterministic guide carries on.
    }

    const nextTime = (intent?.durationMinutes as GuideTime | undefined) ?? time ?? 10;
    const nextNeed = intent?.needs?.[0] ?? need ?? "begin";
    setExtraResources(intent?.preferredResource ?? []);
    begin(nextTime, nextNeed);
    setTellStatus("idle");
  }

  async function shareSession() {
    if (!session) return;
    // Only the public path with whitelisted choices — never any typed text.
    const url = `${window.location.origin}${buildGuideShareHref({
      time: session.time,
      need: session.need,
    })}`;
    const shareData = {
      title: "CrossHeartPray",
      text: "A place to start reading and praying on CrossHeartPray.",
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // Fall through to clipboard.
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 2000);
    } catch {
      // Clipboard unavailable — leave the button quiet.
    }
  }

  const needLabel = (value: GuideNeed) =>
    GUIDE_NEEDS.find((item) => item.need === value)?.label ?? value;

  return (
    <main className="chp-lively-dark-page min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <SiteHeader />

        <PageNucleusHero
          title="Not sure where to begin?"
          subhead="Find a place to start"
          body="Choose how much time you have and what you need help finding. CrossHeartPray will point you to verified Scripture and existing resources."
        />

        <section
          aria-label="Choose your time"
          className="mx-auto mt-10 max-w-3xl rounded-[2rem] border border-white/10 bg-[#141d2e] p-6 sm:p-8"
        >
          <h2 className="text-xs font-black uppercase tracking-[0.22em] text-sky-100">
            How much time do you have?
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {GUIDE_TIMES.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={time === value}
                onClick={() => setTime(value)}
                className={choiceClasses(time === value)}
              >
                {value} minutes
              </button>
            ))}
          </div>

          <h2 className="mt-8 text-xs font-black uppercase tracking-[0.22em] text-sky-100">
            What do you need help finding?
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {GUIDE_NEEDS.map((item) => (
              <button
                key={item.need}
                type="button"
                aria-pressed={need === item.need}
                onClick={() => setNeed(item.need)}
                className={choiceClasses(need === item.need)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-8">
            <button
              type="button"
              disabled={!time || !need}
              onClick={() => time && need && begin(time, need)}
              className={`${buttonBase} w-full border-emerald-300/40 bg-emerald-300/10 py-3 text-emerald-100 hover:bg-emerald-300/20 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-8`}
            >
              Show me a place to start
            </button>
          </div>

          {aiEnabled ? (
            <div className="mt-8 border-t border-white/10 pt-6">
              <label
                htmlFor="guide-tell"
                className="block text-xs font-black uppercase tracking-[0.22em] text-slate-300"
              >
                Or tell the guide what you are looking for
              </label>
              <p className="mt-2 text-xs font-semibold leading-6 text-slate-400">
                One short sentence, like “I’m worried about tomorrow and have
                five minutes.” It is used once to pick from the choices above,
                then discarded — it is never stored or shared.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  id="guide-tell"
                  type="text"
                  value={tellText}
                  maxLength={MAX_TELL_CHARS}
                  onChange={(event) => setTellText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") submitTellTheGuide();
                  }}
                  placeholder="Tell the guide what you are looking for"
                  className="min-h-11 flex-1 rounded-full border border-white/15 bg-white/[0.05] px-4 text-sm font-semibold text-slate-100 placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60"
                />
                <button
                  type="button"
                  onClick={submitTellTheGuide}
                  disabled={!tellText.trim() || tellStatus === "sending"}
                  className={`${buttonBase} border-white/20 bg-white/[0.06] text-slate-100 hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  {tellStatus === "sending" ? "One moment…" : "Ask the guide"}
                </button>
              </div>
            </div>
          ) : null}
        </section>

        {showSafety ? (
          <section
            role="alert"
            className="mx-auto mt-8 max-w-3xl rounded-[2rem] border border-sky-200/30 bg-sky-950/40 p-6 sm:p-8"
          >
            <h2 className="text-lg font-black text-white">
              {CRISIS_SUPPORT_MESSAGE.heading}
            </h2>
            <p className="mt-3 text-sm font-semibold leading-7 text-slate-200">
              {CRISIS_SUPPORT_MESSAGE.body}
            </p>
          </section>
        ) : null}

        {session ? (
          <section
            aria-label="Your place to start"
            className="mx-auto mt-8 max-w-3xl space-y-6"
          >
            <div className="rounded-[2rem] border border-emerald-200/20 bg-[#141d2e] p-6 sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-100">
                {session.time} minutes · {needLabel(session.need)}
              </p>
              <h2 className="mt-3 text-2xl font-black text-white">
                {session.scripture.title}
              </h2>
              <div className="mt-4 space-y-4">
                {session.scripture.passages.map((passage) => (
                  <blockquote key={passage.label}>
                    <p className="text-base font-semibold leading-8 text-slate-100">
                      {passage.text}
                    </p>
                    <cite className="mt-1 block text-xs font-black not-italic uppercase tracking-[0.16em] text-slate-400">
                      {passage.label} · WEB
                    </cite>
                  </blockquote>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <a
                  href={session.scripture.bibleComChapterHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${buttonBase} border-white/15 bg-white/[0.05] text-slate-200 hover:bg-white/[0.1]`}
                >
                  Read all of {session.scripture.chapterLabel} ↗
                </a>
                {session.scripture.readingPlan ? (
                  <Link
                    href={session.scripture.readingPlan.href}
                    className={`${buttonBase} border-white/15 bg-white/[0.05] text-slate-200 hover:bg-white/[0.1]`}
                  >
                    {session.scripture.readingPlan.label} →
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-[#141d2e] p-6 sm:p-8">
              <h3 className="text-xs font-black uppercase tracking-[0.22em] text-sky-100">
                Reflect
              </h3>
              <p className="mt-3 text-base font-semibold leading-8 text-slate-100">
                {session.reflection}
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-[#141d2e] p-6 sm:p-8">
              <h3 className="text-xs font-black uppercase tracking-[0.22em] text-sky-100">
                A private place to write a prayer
              </h3>
              <p className="mt-2 text-xs font-semibold leading-6 text-slate-400">
                Saved only on this device so it is here when you come back.
                Never sent anywhere, never shared, never included in links.
              </p>
              <label htmlFor="guide-prayer" className="sr-only">
                Write a private prayer
              </label>
              <textarea
                id="guide-prayer"
                value={prayer}
                onChange={(event) => setPrayer(event.target.value)}
                rows={5}
                placeholder="What would you like to bring to God in prayer?"
                className="mt-4 w-full rounded-2xl border border-white/15 bg-white/[0.04] p-4 text-sm font-semibold leading-7 text-slate-100 placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60"
              />
              {prayer ? (
                <button
                  type="button"
                  onClick={() => setPrayer("")}
                  className={`${buttonBase} mt-3 border-white/15 bg-white/[0.05] text-slate-300 hover:bg-white/[0.1]`}
                >
                  Clear this prayer
                </button>
              ) : null}
            </div>

            {session.dailyHope || session.bibleBingo || extraResources.length > 0 ? (
              <div className="rounded-[2rem] border border-white/10 bg-[#141d2e] p-6 sm:p-8">
                <h3 className="text-xs font-black uppercase tracking-[0.22em] text-sky-100">
                  Keep going
                </h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {session.dailyHope ? (
                    <Link
                      href={session.dailyHope.href}
                      className={`${buttonBase} border-white/15 bg-white/[0.05] text-slate-200 hover:bg-white/[0.1]`}
                    >
                      Daily Hope · {session.dailyHope.day} →
                    </Link>
                  ) : null}
                  {session.bibleBingo ? (
                    <Link
                      href={session.bibleBingo.href}
                      className={`${buttonBase} border-white/15 bg-white/[0.05] text-slate-200 hover:bg-white/[0.1]`}
                    >
                      {session.bibleBingo.label} →
                    </Link>
                  ) : null}
                  {extraResources.map((resource) => {
                    const link = RESOURCE_LINKS[resource];
                    if (!link) return null;
                    return (
                      <Link
                        key={resource}
                        href={link.href}
                        className={`${buttonBase} border-white/15 bg-white/[0.05] text-slate-200 hover:bg-white/[0.1]`}
                      >
                        {link.label} →
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={shareSession}
                className={`${buttonBase} border-white/20 bg-white/[0.06] text-slate-100 hover:bg-white/[0.12]`}
              >
                {shareState === "copied" ? "Link copied" : "Share this starting place"}
              </button>
              <p className="text-xs font-semibold text-slate-500">
                Shares only this page’s address and your two choices — nothing
                you typed.
              </p>
            </div>
          </section>
        ) : null}
      </div>

      <SiteFooter />
    </main>
  );
}
