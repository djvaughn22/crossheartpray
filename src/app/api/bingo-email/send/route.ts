// Scheduled delivery for Bible Bingo 7 emails — ONE worker for both
// cadences (see vercel.json). Mirrors the Instagram publish route's caller
// model: Vercel Cron sends "Authorization: Bearer $CRON_SECRET"; the owner
// can also trigger or inspect it with the SOCIAL_ADMIN_KEY.
//
// Safe to run repeatedly: only due subscribers are processed, batches are
// idempotency-keyed, and an already-sent batch is never sent again. A
// failed send leaves the subscriber due, so the next run retries the SAME
// saved batch. Results carry ids only — never email addresses.

import { NextResponse } from "next/server";
import { getBingoEmailStore } from "../../../../lib/bingoEmail/store";
import { getBingoEmailSender } from "../../../../lib/bingoEmail/mailer";
import { getBingoEmailServiceWithSender } from "../routeShared";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Caller = "cron" | "admin" | null;

function identifyCaller(request: Request): Caller {
  const auth = request.headers.get("authorization") ?? "";
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (cronSecret && auth === `Bearer ${cronSecret}`) {
    return "cron";
  }

  const adminKey = process.env.SOCIAL_ADMIN_KEY?.trim();
  const url = new URL(request.url);
  const provided =
    request.headers.get("x-admin-key") ?? url.searchParams.get("key") ?? "";

  if (adminKey && provided === adminKey) {
    return "admin";
  }

  return null;
}

async function handle(request: Request) {
  const caller = identifyCaller(request);

  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = await getBingoEmailStore();
  const sender = getBingoEmailSender();

  if (!store || !sender) {
    // Not configured on this deployment — report and exit quietly so an
    // unconfigured cron never error-spams.
    return NextResponse.json({
      ok: true,
      skipped: "not-configured",
      storage: Boolean(store),
      provider: Boolean(sender),
    });
  }

  const url = new URL(request.url);
  if (url.searchParams.get("mode") === "status") {
    const due = await store.listDueSubscribers(new Date().toISOString());
    return NextResponse.json({ ok: true, due: due.length });
  }

  const service = await getBingoEmailServiceWithSender();
  const results = service ? await service.processDueSends() : [];
  const counts = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.outcome] = (acc[r.outcome] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({ ok: true, caller, processed: results.length, counts });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
