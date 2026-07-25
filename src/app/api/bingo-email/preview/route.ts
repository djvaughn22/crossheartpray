// Development/owner preview of the Bible Bingo 7 email — renders the exact
// HTML (or plain text with ?format=text) from a deterministic sample batch
// WITHOUT sending anything or touching storage. Gated to local development
// or the SOCIAL_ADMIN_KEY, and never indexed.

import {
  bingoEmailBatchReadingIds,
  bingoEmailCardForReadingId,
  bingoEmailJourneyOrder,
  bingoEmailTotalBatches,
} from "../../../../lib/bingoEmail/journey";
import { renderBingoBatchEmail } from "../../../../lib/bingoEmail/template";
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

export async function GET(request: Request) {
  if (!authorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const requestedSet = Number(url.searchParams.get("set") ?? "1");

  const order = bingoEmailJourneyOrder("bingo-email-preview");
  const totalSets = bingoEmailTotalBatches(order.length);
  const setNumber =
    Number.isInteger(requestedSet) && requestedSet >= 1 && requestedSet <= totalSets
      ? requestedSet
      : 1;

  const cards = bingoEmailBatchReadingIds(order, setNumber - 1)
    .map((id) => bingoEmailCardForReadingId(id))
    .filter((card) => card !== null);

  const baseUrl = bingoEmailBaseUrl();
  const email = renderBingoBatchEmail({
    cards,
    setNumber,
    totalSets,
    planCompletedCount: (setNumber - 1) * 7,
    planTotal: order.length,
    batchUrl: `${baseUrl}/explorebible?batch=PREVIEW-TOKEN`,
    manageUrl: `${baseUrl}/bible-bingo/manage?token=PREVIEW-TOKEN`,
    unsubscribeUrl: `${baseUrl}/bible-bingo/manage?token=PREVIEW-TOKEN&action=unsubscribe`,
  });

  const asText = url.searchParams.get("format") === "text";

  return new Response(asText ? email.text : email.html, {
    headers: {
      "Content-Type": asText ? "text/plain; charset=utf-8" : "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
