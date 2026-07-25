// Email-safe HTML + plain-text rendering for one Bible Bingo 7 batch.
//
// Pure functions — the send pipeline, the dev preview route, and the tests
// all render from the same saved batch data, which is what guarantees the
// email cards always match the cards the website shows for that token.
//
// Copy stays calm and direct (no streaks, pressure, or performance talk).
// Cards carry passage references and plan labels only — no translation
// text — so nothing copyrighted rides along in the email.

import type { BingoEmailReadingCard } from "./journey";

export type BingoEmailBatchEmailInput = {
  cards: BingoEmailReadingCard[];
  /** 1-based set number shown to the reader. */
  setNumber: number;
  totalSets: number;
  planCompletedCount: number;
  planTotal: number;
  batchUrl: string;
  manageUrl: string;
  unsubscribeUrl: string;
};

export type BingoEmailRenderedEmail = {
  subject: string;
  preheader: string;
  html: string;
  text: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderBingoBatchEmail(
  input: BingoEmailBatchEmailInput,
): BingoEmailRenderedEmail {
  const {
    cards,
    setNumber,
    totalSets,
    planCompletedCount,
    planTotal,
    batchUrl,
    manageUrl,
    unsubscribeUrl,
  } = input;

  const subject = `Your Bible Bingo 7 — Set ${setNumber} of ${totalSets}`;
  const preheader = "Your next seven readings are ready.";

  const cardsHtml = cards
    .map(
      (card, index) => `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;">
          <tr>
            <td style="border:1px solid #dbe3ee; border-radius:18px; padding:18px 20px; background:#ffffff;">
              <div style="font-size:26px; text-align:center; margin:0 0 6px;">${card.emoji}</div>
              <div style="text-align:center; font-size:11px; line-height:1.4; letter-spacing:0.16em; text-transform:uppercase; color:#047857; font-weight:800; margin:0 0 6px;">
                Card ${index + 1} · ${escapeHtml(card.laneTitle)}
              </div>
              <div style="font-family: Georgia, 'Times New Roman', serif; text-align:center; color:#0f172a; font-weight:bold; font-size:24px; line-height:1.25; margin:4px 0 6px;">
                ${escapeHtml(card.reading)}
              </div>
              <div style="text-align:center; color:#64748b; font-size:13px; font-weight:600; margin:0 0 12px;">
                Week ${card.week} · ${escapeHtml(card.dayLabel)} · ${escapeHtml(card.category)}
              </div>
              <div style="text-align:center;">
                <a href="${batchUrl}&card=${index + 1}" style="color:#065f46; font-weight:800; text-decoration:none;">Open this reading</a>
              </div>
            </td>
          </tr>
        </table>`,
    )
    .join("");

  const html = `
  <div style="margin:0; padding:0; background:#eef2f7;">
    <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;">
      <tr>
        <td align="center" style="padding:28px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; font-family: Arial, Helvetica, sans-serif; color:#0f172a;">
            <tr>
              <td align="center" style="padding:0 0 20px;">
                <div style="font-size:32px; line-height:1; margin-bottom:10px;">✝️ ❤️ 🙏</div>
                <div style="font-size:12px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:#047857; margin-bottom:8px;">Cross Heart Pray</div>
                <h1 style="font-family: Georgia, 'Times New Roman', serif; margin:0; font-size:32px; line-height:1.15; color:#0f172a;">Your Bible Bingo 7</h1>
                <p style="margin:12px auto 0; max-width:480px; color:#475569; font-size:15px; line-height:1.6; font-weight:600;">
                  Your next seven readings are ready. Take them one at a time or throughout the week.
                </p>
                <p style="margin:20px 0 0;">
                  <a href="${batchUrl}" style="display:inline-block; background:#047857; color:#ffffff; padding:13px 24px; border-radius:999px; text-decoration:none; font-weight:800; font-size:15px;">
                    Open My Bible Bingo 7
                  </a>
                </p>
                <p style="margin:14px 0 0; color:#64748b; font-size:13px; font-weight:600;">
                  Set ${setNumber} of ${totalSets} · ${planCompletedCount} of ${planTotal} readings completed
                </p>
              </td>
            </tr>
            <tr>
              <td>${cardsHtml}</td>
            </tr>
            <tr>
              <td align="center" style="padding:16px 0 0;">
                <p style="color:#64748b; font-size:13px; line-height:1.7; margin:0;">
                  These readings come from the 52-week Bible Reading Plan.<br/>
                  <a href="${manageUrl}" style="color:#065f46; font-weight:700;">Manage email settings</a>
                  &nbsp;·&nbsp;
                  <a href="${unsubscribeUrl}" style="color:#065f46; font-weight:700;">Unsubscribe</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>`;

  const textCards = cards
    .map(
      (card, index) =>
        `${index + 1}. ${card.reading} — Week ${card.week}, ${card.dayLabel} (${card.category})`,
    )
    .join("\n");

  const text = [
    "Cross Heart Pray — Your Bible Bingo 7",
    "",
    "Your next seven readings are ready. Take them one at a time or throughout the week.",
    "",
    textCards,
    "",
    `Open My Bible Bingo 7: ${batchUrl}`,
    "",
    `Set ${setNumber} of ${totalSets} · ${planCompletedCount} of ${planTotal} readings completed`,
    "",
    `Manage email settings: ${manageUrl}`,
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join("\n");

  return { subject, preheader, html, text };
}
