import { validateSyncProgressUpdate } from "../../../../lib/sync/progress";
import { getSyncService } from "../../../../lib/sync/service";
import {
  hasSafeSyncOrigin,
  sessionTokenFromRequest,
  syncJson,
  syncRateLimited,
} from "../routeShared";

export const dynamic = "force-dynamic";

function syncError(
  error: "not-authenticated" | "sync-inactive",
) {
  if (error === "not-authenticated") {
    return syncJson({ error: "Please sign in again." }, 401);
  }

  return syncJson(
    {
      error:
        "Cross-device Sync is not active for this account. Local reading progress still works.",
    },
    403,
  );
}

export async function GET(request: Request) {
  const service = await getSyncService();

  if (!service) {
    return syncJson({ error: "Sync is temporarily unavailable." }, 503);
  }

  const result = await service.listProgressForSession(
    sessionTokenFromRequest(request),
  );

  if (!result.ok) return syncError(result.error);

  return syncJson({
    items: result.items,
  });
}

export async function PUT(request: Request) {
  if (!hasSafeSyncOrigin(request)) {
    return syncJson({ error: "Request not allowed." }, 403);
  }

  if (syncRateLimited("sync-progress", request, 120, 60 * 1000)) {
    return syncJson(
      { error: "Too many Sync updates. Please try again shortly." },
      429,
    );
  }

  let payload: { updates?: unknown };

  try {
    payload = await request.json();
  } catch {
    return syncJson({ error: "Invalid Sync update." }, 400);
  }

  if (
    !Array.isArray(payload.updates) ||
    payload.updates.length < 1 ||
    payload.updates.length > 1000
  ) {
    return syncJson({ error: "Invalid Sync update." }, 400);
  }

  const now = new Date();
  const updates = payload.updates.map((raw) =>
    validateSyncProgressUpdate(raw, now),
  );

  if (updates.some((value) => value === null)) {
    return syncJson({ error: "Invalid Sync update." }, 400);
  }

  const service = await getSyncService();

  if (!service) {
    return syncJson({ error: "Sync is temporarily unavailable." }, 503);
  }

  const result = await service.applyProgressForSession(
    sessionTokenFromRequest(request),
    updates.filter((value) => value !== null),
    now,
  );

  if (!result.ok) return syncError(result.error);

  return syncJson({
    items: result.items,
  });
}
