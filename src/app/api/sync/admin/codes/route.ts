// Owner-only minting of Sync codes.
//
// Guarded by SYNC_ADMIN_KEY, matching the existing owner-key pattern used by
// the Bingo email routes. Unset key means no owner endpoint exists at all,
// which is the correct closed default for a route that grants entitlement.

import { getSyncService } from "../../../../../lib/sync/service";
import { syncJson, syncRateLimited } from "../../routeShared";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const adminKey = process.env.SYNC_ADMIN_KEY?.trim();
  if (!adminKey) return false;

  return request.headers.get("authorization") === `Bearer ${adminKey}`;
}

export async function POST(request: Request) {
  if (syncRateLimited("sync-admin-codes", request, 20, 10 * 60 * 1000)) {
    return syncJson({ error: "Too many attempts." }, 429);
  }

  if (!authorized(request)) {
    return syncJson({ error: "Unauthorized" }, 401);
  }

  let payload: { code?: unknown; label?: unknown };

  try {
    payload = await request.json();
  } catch {
    return syncJson({ error: "Invalid request." }, 400);
  }

  const service = await getSyncService();
  if (!service) {
    return syncJson({ error: "Sync is temporarily unavailable." }, 503);
  }

  const result = await service.createSyncCode(payload.code, payload.label);

  if (!result.ok) {
    const messages = {
      "invalid-code":
        "Use a code of 8-64 letters and digits (spaces and dashes are ignored).",
      "code-exists": "That code already exists.",
    } as const;

    return syncJson({ error: messages[result.error] }, 400);
  }

  // The raw code is never echoed back — the owner already has it.
  return syncJson({ id: result.id, label: result.label }, 201);
}
