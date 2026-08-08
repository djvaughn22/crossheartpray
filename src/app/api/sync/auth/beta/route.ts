// Temporary beta admission: email + the one shared password, immediate
// access. Replaces owner activation as how a person turns on Save on Any
// Device while paid subscriptions are not open yet. See betaAccess.ts.

import { getSyncService } from "../../../../../lib/sync/service";
import {
  hasSafeSyncOrigin,
  setSyncSessionCookie,
  syncJson,
  syncRateLimited,
} from "../../routeShared";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasSafeSyncOrigin(request)) {
    return syncJson({ error: "Request not allowed." }, 403);
  }

  // A shared password is guessable, so this door is rate limited tighter
  // than the per-account login route.
  if (syncRateLimited("sync-beta", request, 8, 10 * 60 * 1000)) {
    return syncJson(
      { error: "Too many attempts. Please try again in a few minutes." },
      429,
    );
  }

  let payload: { email?: unknown; password?: unknown };

  try {
    payload = await request.json();
  } catch {
    return syncJson({ error: "Enter your email and the beta password." }, 400);
  }

  const service = await getSyncService();
  if (!service) {
    return syncJson({ error: "Sync is temporarily unavailable." }, 503);
  }

  const result = await service.admitViaBetaAccess(payload);

  if (!result.ok) {
    return syncJson({ error: "That email or password is not valid." }, 401);
  }

  const response = syncJson({
    account: result.account,
    message: "Save on any device is on for this account.",
  });

  setSyncSessionCookie(response, result.token, result.expiresAt);
  return response;
}
