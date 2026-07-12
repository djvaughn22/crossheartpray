// Daily Bible Bingo → Instagram publish endpoint.
//
// Called two ways:
//   • Vercel Cron (see vercel.json): sends "Authorization: Bearer $CRON_SECRET".
//     Publishes today's board when INSTAGRAM_AUTOPUBLISH_ENABLED=true. If
//     INSTAGRAM_PUBLISH_HOUR is set, cron calls outside that America/Chicago
//     hour are skipped (useful only with an hourly cron schedule).
//   • Admin (the /admin/social panel or curl): "x-admin-key" header or ?key=
//     matching SOCIAL_ADMIN_KEY. Supports ?date=YYYY-MM-DD, ?dryRun=1,
//     ?force=1 (ignore the autopublish pause switch), ?mode=status.
//
// Idempotent: publishing is refused when the account already has a post with
// this date's caption marker, so repeated cron or retry calls can never
// create duplicates. An Instagram failure never affects /today — this
// endpoint is fully separate from page rendering.

import { NextResponse } from "next/server";
import {
  chicagoDateKey,
  chicagoHour,
  DAILY_BIBLE_BINGO_START_DATE,
  isValidDateKey,
} from "../../../../../lib/dailyBibleBingo";
import {
  findPublishedMediaForDate,
  missingCredentials,
  publishDailyPost,
  readPublishConfig,
} from "../../../../../lib/instagramPublisher";

export const dynamic = "force-dynamic";
// Container polling can take a few seconds; give the publish room to finish.
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

  const url = new URL(request.url);
  const config = readPublishConfig();
  const today = chicagoDateKey();

  const requestedDate = url.searchParams.get("date");
  const dryRun = url.searchParams.get("dryRun") === "1";
  const force = caller === "admin" && url.searchParams.get("force") === "1";
  const mode = url.searchParams.get("mode");

  // Cron always publishes "today"; admins may target a past day for retries.
  // Future dates are allowed only for dry runs and status checks (tomorrow's
  // preview) — a real publish can never run ahead of the calendar.
  let dateKey = today;
  if (caller === "admin" && requestedDate) {
    if (!isValidDateKey(requestedDate)) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    if (requestedDate < DAILY_BIBLE_BINGO_START_DATE) {
      return NextResponse.json(
        { error: `date must be ${DAILY_BIBLE_BINGO_START_DATE} or later` },
        { status: 400 },
      );
    }
    if (requestedDate > today && !dryRun && mode !== "status") {
      return NextResponse.json(
        { error: `cannot publish a future date (today is ${today})` },
        { status: 400 },
      );
    }
    dateKey = requestedDate;
  }

  // Status check only — no publishing.
  if (mode === "status") {
    const missing = missingCredentials(config);
    if (missing.length) {
      return NextResponse.json({
        date: dateKey,
        configured: false,
        missing,
        autopublishEnabled: config.autopublishEnabled,
      });
    }

    try {
      const existing = await findPublishedMediaForDate(config, dateKey);
      return NextResponse.json({
        date: dateKey,
        configured: true,
        autopublishEnabled: config.autopublishEnabled,
        published: Boolean(existing),
        mediaId: existing?.id ?? null,
        publishedAt: existing?.timestamp ?? null,
      });
    } catch (error) {
      return NextResponse.json(
        {
          date: dateKey,
          configured: true,
          autopublishEnabled: config.autopublishEnabled,
          error: error instanceof Error ? error.message : "status check failed",
        },
        { status: 502 },
      );
    }
  }

  // Emergency pause switch — cron respects it always; admin can force past it.
  if (!config.autopublishEnabled && !force && !dryRun) {
    return NextResponse.json({
      date: dateKey,
      published: false,
      skippedReason:
        "autopublish is disabled (INSTAGRAM_AUTOPUBLISH_ENABLED is not 'true'); admins can retry with force=1",
    });
  }

  // Optional hour gate for hourly cron schedules.
  if (caller === "cron" && config.publishHour !== null) {
    const hourNow = chicagoHour();
    if (hourNow !== config.publishHour) {
      return NextResponse.json({
        date: dateKey,
        published: false,
        skippedReason: `outside publish hour (now ${hourNow}h, configured ${config.publishHour}h America/Chicago)`,
      });
    }
  }

  const result = await publishDailyPost({ dateKey, dryRun, config });

  // Full caption is available from /api/social/daily — keep responses lean
  // unless this was a dry run (where the caption is the point).
  if (!dryRun) {
    delete result.caption;
  }

  console.log(
    `[daily-bingo-publish] date=${result.date} caller=${caller} dryRun=${dryRun} ok=${result.ok} published=${result.published} mediaId=${result.mediaId ?? "-"} error=${result.error ? `${result.error.stage}: ${result.error.message}` : "-"}`,
  );

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
