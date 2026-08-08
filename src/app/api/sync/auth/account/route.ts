import { getSyncService } from "../../../../../lib/sync/service";
import {
  clearSyncSessionCookie,
  hasSafeSyncOrigin,
  sessionTokenFromRequest,
  syncJson,
  syncRateLimited,
} from "../../routeShared";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request) {
  if (!hasSafeSyncOrigin(request)) {
    return syncJson({ error: "Request not allowed." }, 403);
  }

  if (syncRateLimited("sync-delete-account", request, 5, 10 * 60 * 1000)) {
    return syncJson(
      { error: "Too many attempts. Please try again in a few minutes." },
      429,
    );
  }

  let payload: { password?: unknown };

  try {
    payload = await request.json();
  } catch {
    return syncJson({ error: "Password required." }, 400);
  }

  const service = await getSyncService();

  if (!service) {
    return syncJson({ error: "Sync is temporarily unavailable." }, 503);
  }

  const result = await service.deleteAccount(
    sessionTokenFromRequest(request),
    payload.password,
  );

  if (!result.ok) {
    return syncJson(
      {
        error:
          result.error === "invalid-password"
            ? "Invalid password."
            : "Please sign in again.",
      },
      result.error === "invalid-password" ? 401 : 401,
    );
  }

  const response = syncJson({ ok: true });
  clearSyncSessionCookie(response);
  return response;
}
