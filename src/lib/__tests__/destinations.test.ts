// The quiet About-page destination area. CrossHeartPray is the Foundation and
// never a funnel — these lock the reminder card to its calm copy, its one
// confirmed destination, and its place at the bottom of About only.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  BE_PREPARED_CARD,
  liveDestinations,
  type ProjectDestination,
} from "../destinations";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

describe("the Be Prepared reminder stays calm and correct", () => {
  it("keeps the locked destination URL and share content", () => {
    const live = liveDestinations(BE_PREPARED_CARD.destinations);
    expect(live[0]?.href).toBe("https://pleasebeready.com");
    expect(live[0]?.label).toBe("Visit PleaseBeReady.com");
    expect(BE_PREPARED_CARD.heading).toBe("Be prepared. Nothing dramatic.");
    expect(BE_PREPARED_CARD.share?.url).toBe("https://pleasebeready.com");
    expect(BE_PREPARED_CARD.share?.title).toBe("Be prepared. Nothing dramatic.");
    expect((BE_PREPARED_CARD.share?.text ?? "").trim().length).toBeGreaterThan(40);
    expect(BE_PREPARED_CARD.share?.label).toBe("Share this reminder");
  });

  it("never becomes fear or sales copy", () => {
    const copy = [
      ...BE_PREPARED_CARD.body,
      BE_PREPARED_CARD.closing ?? "",
      BE_PREPARED_CARD.share?.text ?? "",
    ].join(" ");
    expect(copy).not.toMatch(
      /disaster|too late|protect your family|survival|bunker|act now|buy|sale/i,
    );
  });

  it("hides disabled, unlabelled, and unlinked destinations", () => {
    const list: ProjectDestination[] = [
      { label: "Real", href: "https://pleasebeready.com", kind: "resource" },
      { label: "Off", href: "https://example.com", kind: "store", enabled: false },
      { label: "", href: "https://example.com", kind: "etsy" },
      { label: "No link", href: "", kind: "amazon" },
    ];
    expect(liveDestinations(list).map((d) => d.label)).toEqual(["Real"]);
  });
});

describe("the destination card stays quiet and in its place", () => {
  it("is generic — no destination-specific wording in the component", () => {
    const src = read("components/AboutDestinationCard.tsx");
    expect(src).not.toMatch(/PleaseBeReady|prepared|consulting|store/i);
    expect(src).toMatch(/rel(=|: )"noopener noreferrer"/);
    expect(src).toContain("isShareCancel");
    expect(src).toContain("aria-live");
  });

  it("renders only at the bottom of About — never in the header or nav", () => {
    const about = read("app/about/page.tsx");
    expect(about).toContain("AboutDestinationCard");
    expect(about.indexOf("AboutDestinationCard card=")).toBeGreaterThan(
      about.indexOf("RIP Travis"),
    );
    for (const rel of [
      "components/SiteHeader.tsx",
      "components/ChpProductNav.tsx",
      "components/SiteFooter.tsx",
    ]) {
      expect(read(rel)).not.toMatch(/pleasebeready|AboutDestinationCard/i);
    }
  });
});
