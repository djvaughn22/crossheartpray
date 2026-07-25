import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import {
  bingoEmailBatchReadingIdsAt,
  bingoEmailCardForReadingId,
  bingoEmailJourneyOrder,
} from "../bingoEmail/journey";
import {
  renderBingoBatchEmail,
  renderBingoDailyEmail,
} from "../bingoEmail/template";

function weeklySample() {
  const order = bingoEmailJourneyOrder("sunday");
  const cards = bingoEmailBatchReadingIdsAt(order, 0, 7).map(
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

function dailySample() {
  const order = bingoEmailJourneyOrder("wednesday");
  const card = bingoEmailCardForReadingId(order[0])!;
  return {
    card,
    rendered: renderBingoDailyEmail({
      card,
      planCompletedCount: 18,
      planTotal: 364,
      readingUrl: `https://crossheartpray.com/bible-reading-plan?week=${card.week}&day=${card.daySlug}&bingoBatch=TESTTOKEN#${card.id}`,
      manageUrl: "https://crossheartpray.com/bible-bingo/manage?token=MANAGETOKEN",
      unsubscribeUrl:
        "https://crossheartpray.com/bible-bingo/manage?token=MANAGETOKEN&action=unsubscribe",
    }),
  };
}

describe("weekly email template", () => {
  it("renders all seven reading cards with references and plan context in HTML", () => {
    const { cards, rendered } = weeklySample();
    expect(cards).toHaveLength(7);
    expect((rendered.html.match(/Card \d ·/g) ?? [])).toHaveLength(7);
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
    const { cards, rendered } = weeklySample();
    for (const card of cards) {
      expect(rendered.text).toContain(card.reading);
    }
    expect(rendered.text).toContain("?batch=TESTTOKEN");
    expect(rendered.text).toContain("Unsubscribe:");
    expect(rendered.text).not.toContain("<");
  });
});

describe("daily email template", () => {
  it("renders exactly ONE reading card with the plan deep link", () => {
    const { card, rendered } = dailySample();
    expect(card.id).toBe("week-1-wednesday");
    expect(rendered.subject).toBe(`Today's Bible Reading — ${card.reading}`);
    expect(rendered.html).toContain("Today&#39;s Bible Reading");
    expect((rendered.html.match(/Week \d+ ·/g) ?? [])).toHaveLength(1);
    expect(rendered.html).toContain("Open Today&#39;s Reading");
    expect(rendered.html).toContain(
      "/bible-reading-plan?week=1&day=wednesday&bingoBatch=TESTTOKEN#week-1-wednesday",
    );
    expect(rendered.html).toContain("18 of 364 readings completed");
    expect(rendered.html).toContain("Manage email settings");
    expect(rendered.html).toContain("Unsubscribe");
  });

  it("renders a one-reading plain-text fallback", () => {
    const { card, rendered } = dailySample();
    expect(rendered.text).toContain(card.reading);
    expect(rendered.text).toContain("Open Today's Reading:");
    expect(rendered.text).toContain("18 of 364 readings completed");
    expect(rendered.text).not.toContain("<");
  });
});

describe("email safety and copy", () => {
  it("both templates are email-safe: no scripts, no external CSS, tables + inline styles", () => {
    for (const rendered of [weeklySample().rendered, dailySample().rendered]) {
      expect(rendered.html).not.toContain("<script");
      expect(rendered.html).not.toContain("<link");
      expect(rendered.html).not.toContain("class=");
      expect(rendered.html).toContain('<table role="presentation"');
    }
  });

  it("escapes card text", () => {
    const rendered = renderBingoDailyEmail({
      card: {
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
      planCompletedCount: 0,
      planTotal: 364,
      readingUrl: "https://example.com/r",
      manageUrl: "https://example.com/m",
      unsubscribeUrl: "https://example.com/u",
    });
    expect(rendered.html).toContain("Gen 1-3 &amp; Friends");
    expect(rendered.html).not.toContain("<script>");
  });

  const BANNED_PHRASES = [
    "streak",
    "crush",
    "unlock",
    "falling behind",
    "limited time",
    "don't miss",
    "challenge",
    "sprint",
    "seven readings every day",
    "seven each day",
    "seven cards each day",
    "52 days",
    "times faster",
    "catch up",
    "take them one at a time",
  ];

  it("keeps rendered email copy calm and accurate", () => {
    for (const rendered of [weeklySample().rendered, dailySample().rendered]) {
      const everything =
        `${rendered.subject} ${rendered.preheader} ${rendered.html} ${rendered.text}`.toLowerCase();
      for (const banned of BANNED_PHRASES) {
        expect(everything, `banned phrase present: ${banned}`).not.toContain(banned);
      }
    }
  });

  it("keeps signup, manage, and batch page copy free of the old seven-per-day wording", () => {
    const sources = [
      "src/components/BibleBingoEmailSignup.tsx",
      "src/components/BibleBingoEmailManage.tsx",
      "src/components/BibleBingoEmailBatch.tsx",
      "src/app/api/bingo-email/subscribe/route.ts",
      "src/lib/bingoEmail/template.ts",
    ];
    for (const source of sources) {
      const content = readFileSync(join(process.cwd(), source), "utf8").toLowerCase();
      for (const banned of BANNED_PHRASES) {
        expect(content, `${source} contains banned phrase: ${banned}`).not.toContain(
          banned,
        );
      }
    }
  });
});
