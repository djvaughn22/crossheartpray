import { getSyncService } from "../../../../../lib/sync/service";
import {
  clearSyncSessionCookie,
  hasSafeSyncOrigin,
  sessionTokenFromRequest,
  syncJson,
} from "../../routeShared";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasSafeSyncOrigin(request)) {
    return syncJson({ error: "Request not allowed." }, 403);
  }

  const token = sessionTokenFromRequest(request);
  const service = await getSyncService();

  if (service) {
    await service.logout(token);
  }

  const response = syncJson({ ok: true });
  clearSyncSessionCookie(response);
  return response;
}
