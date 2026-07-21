// ─────────────────────────────────────────────────────────────────────────────
// About-page destination config — the one quiet lower-page area.
//
// CrossHeartPray is the Foundation and is never a funnel: this file may hold
// only calm, useful destinations for the bottom of the About page. Scripture,
// prayer, Daily Hope, and Bible Bingo never carry these links.
//
// A destination renders only when it is labelled, linked, and deliberately
// enabled — never add a guessed URL or an unconfirmed store.
// ─────────────────────────────────────────────────────────────────────────────

export type DestinationKind =
  | "project"
  | "resource"
  | "service"
  | "consulting"
  | "contact"
  | "store"
  | "merch"
  | "digital-product"
  | "etsy"
  | "amazon"
  | "download"
  | "subscription"
  | "share"
  | "other";

export type ProjectDestination = {
  label: string;
  href: string;
  kind: DestinationKind;
  description?: string;
  external?: boolean;
  /** default true — set false to keep a prepared destination unrendered */
  enabled?: boolean;
  status?: "available" | "preparing" | "limited" | "unavailable";
};

export function liveDestinations(
  list: ProjectDestination[],
): ProjectDestination[] {
  return list.filter(
    (d) =>
      d.enabled !== false &&
      d.label.trim().length > 0 &&
      d.href.trim().length > 0,
  );
}

export type ShareContent = {
  label: string;
  title: string;
  text: string;
  url: string;
};

export type DestinationCardContent = {
  eyebrow?: string;
  heading: string;
  body: string[];
  closing?: string;
  /** kept visually secondary; "owner", never a personal name */
  attribution?: string;
  /** one small decorative emoji, hidden from assistive technology */
  emblem?: string;
  destinations: ProjectDestination[];
  share?: ShareContent;
};

// The Be Prepared reminder — the owner's calm note, shared across the family.
// Keep it practical and quiet; never rewrite it into urgency or sales copy.
export const BE_PREPARED_CARD: DestinationCardContent = {
  eyebrow: "A small reminder",
  heading: "Be prepared. Nothing dramatic.",
  body: [
    "Keep your phone charged. Know who you would call. Have a little food, water, and the basic things your household may need.",
    "You do not have to expect the worst. A few simple plans can make an ordinary hard day easier.",
  ],
  closing: "Prepared is just another word for ready to help.",
  attribution: "A note from the owner of Open Mirror LLC",
  emblem: "🎒",
  destinations: [
    {
      label: "Visit PleaseBeReady.com",
      href: "https://pleasebeready.com",
      kind: "resource",
      external: true,
      enabled: true,
      status: "available",
    },
  ],
  share: {
    label: "Share this reminder",
    title: "Be prepared. Nothing dramatic.",
    text: "Keep your phone charged, know who you would call, and keep a few basic household supplies. Prepared is just another word for ready to help.",
    url: "https://pleasebeready.com",
  },
};
