import { describe, expect, it } from "vitest";
import {
  bingoEmailBatchReadingIds,
  bingoEmailCardForReadingId,
  bingoEmailJourneyOrder,
} from "../bingoEmail/journey";
import { renderBingoBatchEmail } from "../bingoEmail/template";

function sampleEmail() {
  const order = bingoEmailJourneyOrder("template-test");
  const cards = bingoEmailBatchReadingIds(order, 0).map(
    (id) => bingoEmailCardForReadingId(id)!,
  );
  return {
    cards,
    rendered: renderBingoBatchEmail({
      cards,
      setNumber: 1,
      totalSets: 52,
      planCompletedCount: 0,
      planTotal: 364,
      batchUrl: "https://crossheartpray.com/explorebible?batch=TESTTOKEN",
      manageUrl: "https://crossheartpray.com/bible-bingo/manage?token=MANAGETOKEN",
      unsubscribeUrl:
        "https://crossheartpray.com/bible-bingo/manage?token=MANAGETOKEN&action=unsubscribe",
    }),
  };
}

describe("bingo email template", () => {
  it("renders all seven reading cards with references and plan context in HTML", () => {
    const { cards, rendered } = sampleEmail();
    expect(cards).toHaveLength(7);
    for (const card of cards) {
      expect(rendered.html).toContain(card.reading);
      expect(rendered.html).toContain(`Week ${card.week}`);
    }
    expect(rendered.subject).toBe("Your Bible Bingo 7 — Set 1 of 52");
    expect(rendered.html).toContain("Open My Bible Bingo 7");
    expect(rendered.html).toContain("?batch=TESTTOKEN");
    expect(rendered.html).toContain("Manage email settings");
    expect(rendered.html).toContain("Unsubscribe");
    expect(rendered.html).toContain("0 of 364 readings completed");
  });

  it("renders a plain-text fallback with the same readings and links", () => {
    const { cards, rendered } = sampleEmail();
    for (const card of cards) {
      expect(rendered.text).toContain(card.reading);
    }
    expect(rendered.text).toContain("?batch=TESTTOKEN");
    expect(rendered.text).toContain("Unsubscribe:");
    expect(rendered.text).not.toContain("<");
  });

  it("is email-safe: no scripts, no external CSS, tables + inline styles only", () => {
    const { rendered } = sampleEmail();
    expect(rendered.html).not.toContain("<script");
    expect(rendered.html).not.toContain("<link");
    expect(rendered.html).not.toContain("class=");
    expect(rendered.html).toContain('<table role="presentation"');
  });

  it("escapes card text and carries no verse/translation body text", () => {
    const rendered = renderBingoBatchEmail({
      cards: [
        {
          id: "week-1-monday",
          week: 1,
          daySlug: "monday",
          dayLabel: 'Mon<script>"&</script>',
          category: "The Law",
          reading: "Gen 1-3 & Friends",
          emoji: "📜",
          laneTitle: "Monday — Law",
          planHref: "/bible-reading-plan?week=1&day=monday#week-1-monday",
        },
      ],
      setNumber: 1,
      totalSets: 52,
      planCompletedCount: 0,
      planTotal: 364,
      batchUrl: "https://example.com/b?batch=T",
      manageUrl: "https://example.com/m?token=M",
      unsubscribeUrl: "https://example.com/m?token=M&action=unsubscribe",
    });
    expect(rendered.html).toContain("Gen 1-3 &amp; Friends");
    expect(rendered.html).not.toContain("<script>");
  });

  it("keeps the copy calm — no streaks, pressure, or hype", () => {
    const { rendered } = sampleEmail();
    const everything = `${rendered.subject} ${rendered.preheader} ${rendered.html} ${rendered.text}`.toLowerCase();
    for (const banned of [
      "streak",
      "crush",
      "unlock",
      "falling behind",
      "limited time",
      "don't miss",
      "challenge",
    ]) {
      expect(everything).not.toContain(banned);
    }
  });
});
