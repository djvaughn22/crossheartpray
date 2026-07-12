// JSON view of the authoritative daily object — used by the admin preview
// and for verifying that the live Instagram post matches /today.
//
// GET /api/social/daily/2026-07-12

import { NextResponse } from "next/server";
import {
  buildDailyBibleBingoPost,
  chicagoDateKey,
  DAILY_BIBLE_BINGO_START_DATE,
  isValidDateKey,
} from "../../../../../lib/dailyBibleBingo";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ date: string }> },
) {
  const { date } = await params;
  const dateKey = date === "today" ? chicagoDateKey() : date;

  if (!isValidDateKey(dateKey) || dateKey < DAILY_BIBLE_BINGO_START_DATE) {
    return NextResponse.json({ error: "Unknown date" }, { status: 404 });
  }

  return NextResponse.json(buildDailyBibleBingoPost(dateKey));
}
