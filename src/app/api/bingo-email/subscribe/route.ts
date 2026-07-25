// Signup endpoint for Bible Bingo 7 emails.
//
// Validation runs first (so bad input never touches storage), then the
// subscriber is created and the first batch is sent immediately through the
// same idempotent pipeline the cron uses. Fails closed with 503 when the
// deployment has no durable store or email provider. Addresses are never
// logged and never appear in responses.

import { NextResponse } from "next/server";
import {
  isBingoEmailCadence,
  normalizeBingoEmailAddress,
} from "../../../../lib/bingoEmail/service";
import {
  BINGO_EMAIL_PRIVATE_HEADERS,
  BINGO_EMAIL_UNAVAILABLE_MESSAGE,
  getBingoEmailServiceWithSender,
} from "../routeShared";

export const dynamic = "force-dynamic";

// Best-effort per-instance rate limit: 5 signup attempts / 10 min / IP.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;
const attempts = new Map<string, number[]>();

function rateLimited(ip: string) {
  const cutoff = Date.now() - RATE_WINDOW_MS;
  const recent = (attempts.get(ip) ?? []).filter((at) => at > cutoff);
  recent.push(Date.now());
  attempts.set(ip, recent);
  if (attempts.size > 5000) attempts.clear();
  return recent.length > RATE_MAX;
}

const ERROR_MESSAGES: Record<string, string> = {
  "invalid-email": "Please enter a valid email address.",
  "consent-required": "Please check the consent box so we know it's okay to email you.",
  "invalid-cadence": "Please choose Weekly or Daily.",
};

export async function POST(request: Request) {
  const respond = (body: object, status: number) =>
    NextResponse.json(body, { status, headers: BINGO_EMAIL_PRIVATE_HEADERS });

  let payload: { email?: unknown; cadence?: unknown; consent?: unknown };
  try {
    payload = await request.json();
  } catch {
    return respond({ error: "Please fill in the signup form." }, 400);
  }

  // Validate before any infrastructure checks so errors stay precise.
  if (payload.consent !== true) {
    return respond({ error: ERROR_MESSAGES["consent-required"] }, 400);
  }
  if (!normalizeBingoEmailAddress(payload.email)) {
    return respond({ error: ERROR_MESSAGES["invalid-email"] }, 400);
  }
  if (payload.cadence !== undefined && !isBingoEmailCadence(payload.cadence)) {
    return respond({ error: ERROR_MESSAGES["invalid-cadence"] }, 400);
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return respond({ error: "Too many attempts. Please try again in a few minutes." }, 429);
  }

  const service = await getBingoEmailServiceWithSender();
  if (!service) {
    return respond({ error: BINGO_EMAIL_UNAVAILABLE_MESSAGE }, 503);
  }

  const result = await service.subscribe({
    email: payload.email,
    cadence: payload.cadence,
    consent: payload.consent,
  });

  if (!result.ok) {
    return respond({ error: ERROR_MESSAGES[result.error] ?? "Please try again." }, 400);
  }

  if (result.outcome === "already-subscribed") {
    return respond(
      {
        message:
          "You're already subscribed. Your next seven readings will arrive on schedule — the manage link in any email can change your settings.",
      },
      200,
    );
  }

  // First batch goes out right away; a provider hiccup here is fine — the
  // subscriber stays due and the daily cron retries the same batch.
  try {
    await service.sendDueForSubscriber(result.subscriberId);
  } catch {
    // Subscription succeeded; delivery will be retried by the scheduler.
  }

  return respond(
    {
      message:
        result.outcome === "subscribed"
          ? "You're subscribed. Your first seven readings are on the way to your inbox."
          : "Welcome back. Your next seven readings are on the way to your inbox.",
    },
    200,
  );
}
