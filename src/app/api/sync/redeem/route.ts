import { getSyncService } from "../../../../lib/sync/service";
import {
  hasSafeSyncOrigin,
  sessionTokenFromRequest,
  syncJson,
  syncRateLimited,
} from "../routeShared";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasSafeSyncOrigin(request)) {
    return syncJson({ error: "Request not allowed." }, 403);
  }

  if (syncRateLimited("sync-redeem", request, 8, 10 * 60 * 1000)) {
    return syncJson(
      { error: "Too many attempts. Please try again in a few minutes." },
      429,
    );
  }

  let payload: { code?: unknown };

  try {
    payload = await request.json();
  } catch {
    return syncJson({ error: "That code is not valid." }, 400);
  }

  const service = await getSyncService();
  if (!service) {
    return syncJson({ error: "Sync is temporarily unavailable." }, 503);
  }

  const result = await service.redeemSyncCode(
    sessionTokenFromRequest(request),
    payload.code,
  );

  if (!result.ok) {
    if (result.error === "not-authenticated") {
      return syncJson({ error: "Please sign in again." }, 401);
    }

    return syncJson({ error: "That code is not valid." }, 400);
  }

  return syncJson({
    account: result.account,
    message: "Save on any device is now on for this account.",
  });
}
