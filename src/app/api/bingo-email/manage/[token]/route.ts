// Manage-subscription endpoint (passwordless, manage-token authorized).
//
// GET  → current cadence, status, and progress (no email address).
// POST → { action: "cadence" | "pause" | "resume" | "unsubscribe" | "restart" }.
//        Also accepts the RFC 8058 one-click unsubscribe form POST that
//        mail clients send to the List-Unsubscribe URL.

import { NextResponse } from "next/server";
import { isPlausibleBingoEmailToken } from "../../../../../lib/bingoEmail/tokens";
import type { BingoEmailManageAction } from "../../../../../lib/bingoEmail/service";
import {
  BINGO_EMAIL_PRIVATE_HEADERS,
  getBingoEmailServiceReadOnly,
} from "../../routeShared";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ token: string }> };

const ACTIONS = new Set(["cadence", "pause", "resume", "unsubscribe", "restart"]);

async function loadService(token: string) {
  if (!isPlausibleBingoEmailToken(token)) return null;
  return getBingoEmailServiceReadOnly();
}

export async function GET(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const service = await loadService(token);
  const view = service ? await service.manageView(token) : null;

  if (!view) {
    return NextResponse.json(
      { error: "This manage link isn't available." },
      { status: 404, headers: BINGO_EMAIL_PRIVATE_HEADERS },
    );
  }

  return NextResponse.json(view, { headers: BINGO_EMAIL_PRIVATE_HEADERS });
}

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const service = await loadService(token);

  if (!service) {
    return NextResponse.json(
      { error: "This manage link isn't available." },
      { status: 404, headers: BINGO_EMAIL_PRIVATE_HEADERS },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  let action: BingoEmailManageAction | null = null;

  if (contentType.includes("application/x-www-form-urlencoded")) {
    // RFC 8058 one-click unsubscribe: body is "List-Unsubscribe=One-Click".
    const form = await request.text();
    if (form.includes("List-Unsubscribe=One-Click")) {
      action = { action: "unsubscribe" };
    }
  } else {
    try {
      const payload = (await request.json()) as {
        action?: unknown;
        cadence?: unknown;
      };
      if (typeof payload.action === "string" && ACTIONS.has(payload.action)) {
        action =
          payload.action === "cadence"
            ? ({ action: "cadence", cadence: payload.cadence } as BingoEmailManageAction)
            : ({ action: payload.action } as BingoEmailManageAction);
      }
    } catch {
      // handled below
    }
  }

  const view = action ? await service.applyManageAction(token, action) : null;

  if (!view) {
    return NextResponse.json(
      { error: "That change couldn't be made." },
      { status: 400, headers: BINGO_EMAIL_PRIVATE_HEADERS },
    );
  }

  return NextResponse.json(view, { headers: BINGO_EMAIL_PRIVATE_HEADERS });
}
