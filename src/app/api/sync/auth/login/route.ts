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

  if (syncRateLimited("sync-login", request, 8, 10 * 60 * 1000)) {
    return syncJson(
      { error: "Too many attempts. Please try again in a few minutes." },
      429,
    );
  }

  let payload: { email?: unknown; password?: unknown };

  try {
    payload = await request.json();
  } catch {
    return syncJson({ error: "Invalid email or password." }, 400);
  }

  const service = await getSyncService();
  if (!service) {
    return syncJson({ error: "Sync is temporarily unavailable." }, 503);
  }

  const result = await service.login(payload);

  if (!result.ok) {
    return syncJson({ error: "Invalid email or password." }, 401);
  }

  const response = syncJson({
    account: result.account,
  });

  setSyncSessionCookie(response, result.token, result.expiresAt);
  return response;
}
