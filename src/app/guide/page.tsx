// Server gate for the guide. The access mode is read here, on the server —
// client state is never treated as authorization. With
// CROSSHEARTPRAY_GUIDE_ACCESS_MODE=off this route 404s and the homepage
// entry point disappears, leaving the rest of CrossHeartPray untouched.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import GuideClient from "./GuideClient";
import {
  canAccessFeature,
  getCurrentAccessMode,
  isAiEnabled,
} from "../../lib/guide/featureAccess";
import { buildGuideSession, parseGuideParams } from "../../lib/guide/guideSession";

export const metadata: Metadata = {
  title: "Find a place to start",
  description:
    "Choose how much time you have and what you need help finding. CrossHeartPray points you to verified Scripture and existing resources.",
  robots: {
    index: false,
    follow: false,
  },
};

// Restrained access-state page for subscriber mode. No plan details and no
// promotional treatment — account management lives outside CrossHeartPray.
function GuideAccessState() {
  const accountUrl = process.env.OPEN_MIRROR_ACCOUNT_URL;
  return (
    <main className="chp-lively-dark-page min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <SiteHeader />
        <section className="mx-auto mt-12 max-w-xl rounded-[2rem] border border-white/10 bg-[#141d2e] p-8 text-center">
          <h1 className="text-2xl font-black text-white">
            This page is not open right now
          </h1>
          <p className="mt-4 text-sm font-semibold leading-7 text-slate-300">
            The guided start is currently limited to Open Mirror accounts.
            Everything else on CrossHeartPray remains free and open.
          </p>
          {accountUrl ? (
            <a
              href={accountUrl}
              className="mt-6 inline-flex rounded-full border border-white/20 bg-white/[0.06] px-5 py-2.5 text-xs font-black uppercase tracking-[0.16em] text-slate-100 transition hover:bg-white/[0.12]"
            >
              Manage your Open Mirror account →
            </a>
          ) : null}
          <p className="mt-6 text-sm font-semibold text-slate-400">
            <Link href="/" className="underline decoration-slate-500 underline-offset-4 hover:text-slate-200">
              Back to CrossHeartPray
            </Link>
          </p>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}

export default async function GuidePage({
  searchParams,
}: {
  searchParams: Promise<{ time?: string; need?: string }>;
}) {
  if (getCurrentAccessMode("crossheartpray_guide") === "off") notFound();

  const access = await canAccessFeature({ featureKey: "crossheartpray_guide" });
  if (!access.allowed) return <GuideAccessState />;

  const aiEnabled =
    isAiEnabled("crossheartpray_guide") && Boolean(process.env.OPENAI_API_KEY);
  // A shared /guide?time=…&need=… link opens straight into its session. The
  // session is built here so the client receives it ready-made.
  const initial = parseGuideParams(await searchParams);
  const initialSession = initial ? buildGuideSession(initial) : null;

  return (
    <GuideClient
      aiEnabled={aiEnabled}
      initial={initial}
      initialSession={initialSession}
    />
  );
}
