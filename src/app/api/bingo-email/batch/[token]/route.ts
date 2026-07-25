// Saved-batch state for the Bible Bingo 7 page (?batch=TOKEN).
//
// GET  → the exact seven emailed cards + completion/progress state.
// POST → mark one of the batch's readings complete / not complete.
//
// The token is the only credential: high-entropy, stored server-side, and
// scoped to this one batch. Responses never include an email address or
// the manage token, so a shared batch link can't expose or change the
// subscription itself.

import { NextResponse } from "next/server";
import { isPlausibleBingoEmailToken } from "../../../../../lib/bingoEmail/tokens";
import {
  BINGO_EMAIL_PRIVATE_HEADERS,
  getBingoEmailServiceReadOnly,
} from "../../routeShared";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ token: string }> };

async function loadService(token: string) {
  if (!isPlausibleBingoEmailToken(token)) return null;
  return getBingoEmailServiceReadOnly();
}

export async function GET(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const service = await loadService(token);
  const view = service ? await service.batchView(token) : null;

  if (!view) {
    return NextResponse.json(
      { error: "This Bible Bingo 7 link isn't available." },
      { status: 404, headers: BINGO_EMAIL_PRIVATE_HEADERS },
    );
  }

  return NextResponse.json(view, { headers: BINGO_EMAIL_PRIVATE_HEADERS });
}

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const service = await loadService(token);

  let payload: { readingId?: unknown; completed?: unknown } = {};
  try {
    payload = await request.json();
  } catch {
    // handled below as invalid
  }

  const view = service
    ? await service.setBatchReadingCompletion(
        token,
        payload.readingId,
        payload.completed,
      )
    : null;

  if (!view) {
    return NextResponse.json(
      { error: "That reading couldn't be updated." },
      { status: 400, headers: BINGO_EMAIL_PRIVATE_HEADERS },
    );
  }

  return NextResponse.json(view, { headers: BINGO_EMAIL_PRIVATE_HEADERS });
}
