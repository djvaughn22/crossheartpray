// Development/owner preview of the Bible Bingo email — renders the exact
// HTML (or plain text with ?format=text) from the canonical plan order
// WITHOUT sending anything or touching storage. Gated to local development
// or the SOCIAL_ADMIN_KEY, and never indexed.
//
// Params: ?cadence=daily&day=N previews the one-card daily email for the
// Nth daily send; ?set=N previews the Nth weekly seven-card email;
// ?start=wednesday anchors the weekday rotation (default sunday);
// ?format=text renders the plain-text part.

import {
  BINGO_EMAIL_WEEKDAY_SLUGS,
  bingoEmailBatchReadingIdsAt,
  bingoEmailCardForReadingId,
  bingoEmailJourneyOrder,
  bingoEmailTotalBatches,
} from "../../../../lib/bingoEmail/journey";
import {
  renderBingoBatchEmail,
  renderBingoDailyEmail,
} from "../../../../lib/bingoEmail/template";
import { bingoEmailBaseUrl } from "../routeShared";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  if (process.env.NODE_ENV === "development") return true;
  const adminKey = process.env.SOCIAL_ADMIN_KEY?.trim();
  const url = new URL(request.url);
  const provided =
    request.headers.get("x-admin-key") ?? url.searchParams.get("key") ?? "";
  return Boolean(adminKey && provided === adminKey);
}

function clampInt(raw: string | null, min: number, max: number, fallback: number) {
  const value = Number(raw ?? "");
  return Number.isInteger(value) && value >= min && value <= max
    ? value
    : fallback;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const startParam = url.searchParams.get("start") ?? "sunday";
  const startDaySlug = BINGO_EMAIL_WEEKDAY_SLUGS.includes(startParam)
    ? startParam
    : "sunday";

  const order = bingoEmailJourneyOrder(startDaySlug);
  const totalSets = bingoEmailTotalBatches(order.length);
  const baseUrl = bingoEmailBaseUrl();
  const manageUrl = `${baseUrl}/bible-bingo/manage?token=PREVIEW-TOKEN`;
  const unsubscribeUrl = `${manageUrl}&action=unsubscribe`;

  const isDaily = url.searchParams.get("cadence") === "daily";

  const email = isDaily
    ? (() => {
        const dayNumber = clampInt(url.searchParams.get("day"), 1, order.length, 1);
        const card = bingoEmailCardForReadingId(order[dayNumber - 1])!;
        return renderBingoDailyEmail({
          card,
          planCompletedCount: dayNumber - 1,
          planTotal: order.length,
          readingUrl: `${baseUrl}/bible-reading-plan?week=${card.week}&day=${card.daySlug}&bingoBatch=PREVIEW-TOKEN#${card.id}`,
          manageUrl,
          unsubscribeUrl,
        });
      })()
    : (() => {
        const setNumber = clampInt(url.searchParams.get("set"), 1, totalSets, 1);
        const cards = bingoEmailBatchReadingIdsAt(order, (setNumber - 1) * 7, 7)
          .map((id) => bingoEmailCardForReadingId(id))
          .filter((card) => card !== null);
        return renderBingoBatchEmail({
          cards,
          setNumber,
          totalSets,
          planCompletedCount: (setNumber - 1) * 7,
          planTotal: order.length,
          batchUrl: `${baseUrl}/explorebible?batch=PREVIEW-TOKEN`,
          manageUrl,
          unsubscribeUrl,
        });
      })();

  const asText = url.searchParams.get("format") === "text";

  return new Response(asText ? email.text : email.html, {
    headers: {
      "Content-Type": asText ? "text/plain; charset=utf-8" : "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
