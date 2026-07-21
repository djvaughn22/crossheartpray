"use client";

import { useState } from "react";
import { isShareCancel, SHARE_MESSAGES } from "../lib/sharePanel";
import {
  liveDestinations,
  type DestinationCardContent,
  type ProjectDestination,
} from "../lib/destinations";

// ─────────────────────────────────────────────────────────────────────────────
// AboutDestinationCard — the one quiet destination container for the bottom
// of the About page. Generic by design: it renders whatever configured
// content it is given, and nothing site- or product-specific may be
// hard-coded here (configuration lives in src/lib/destinations.ts).
//
// Share behavior matches the site's share surfaces: native Web Share first,
// a canceled share stays quiet (isShareCancel from the shared lib), the
// fallback copies the message and link, and results are announced through
// an aria-live region.
// ─────────────────────────────────────────────────────────────────────────────

function DestinationLink({
  destination,
  primary,
}: {
  destination: ProjectDestination;
  primary: boolean;
}) {
  const cls = primary
    ? "inline-flex min-h-11 items-center rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/15"
    : "inline-flex min-h-11 items-center px-1 text-sm font-semibold text-emerald-200 underline decoration-white/20 underline-offset-4 transition hover:text-emerald-100";
  return (
    <a
      href={destination.href}
      {...(destination.external
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
      className={cls}
    >
      <span className="min-w-0 break-words">{destination.label}</span>
    </a>
  );
}

export default function AboutDestinationCard({
  card,
}: {
  card: DestinationCardContent;
}) {
  const [status, setStatus] = useState("");
  const destinations = liveDestinations(card.destinations);
  if (destinations.length === 0) return null;
  const [primary, ...secondary] = destinations;

  async function onShare() {
    const share = card.share;
    if (!share) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: share.title,
          text: share.text,
          url: share.url,
        });
        setStatus("");
        return;
      } catch (error) {
        // Backing out of the native share sheet is a choice, not a failure.
        if (isShareCancel(error)) return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${share.text}\n${share.url}`);
      setStatus(SHARE_MESSAGES.linkCopied);
    } catch {
      setStatus(`${SHARE_MESSAGES.copyBlocked} The address is ${share.url}`);
    }
  }

  return (
    <section
      aria-label={card.heading}
      className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-left"
    >
      {card.eyebrow && (
        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-100">
          {card.emblem && (
            <span aria-hidden className="mr-2">
              {card.emblem}
            </span>
          )}
          {card.eyebrow}
        </p>
      )}
      <h2 className="mt-3 text-2xl font-black text-white">{card.heading}</h2>
      {card.body.map((line) => (
        <p
          key={line}
          className="mt-3 text-pretty text-base font-semibold leading-8 text-slate-300"
        >
          {line}
        </p>
      ))}
      {card.closing && (
        <p className="mt-3 text-base font-black leading-8 text-emerald-100">
          {card.closing}
        </p>
      )}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <DestinationLink destination={primary} primary />
        {card.share && (
          <button
            type="button"
            onClick={onShare}
            className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-black/20 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
          >
            {card.share.label}
          </button>
        )}
        {secondary.map((d) => (
          <DestinationLink key={d.href} destination={d} primary={false} />
        ))}
      </div>
      <p
        aria-live="polite"
        role="status"
        className="mt-3 min-h-5 text-sm font-semibold text-slate-300"
      >
        {status}
      </p>
      {card.attribution && (
        <p className="mt-1 text-xs font-semibold text-slate-400">
          {card.attribution}
        </p>
      )}
    </section>
  );
}
