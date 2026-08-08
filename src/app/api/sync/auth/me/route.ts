import { getSyncService } from "../../../../../lib/sync/service";
import {
  sessionTokenFromRequest,
  syncJson,
} from "../../routeShared";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = sessionTokenFromRequest(request);

  if (!token) {
    return syncJson({
      authenticated: false,
      account: null,
    });
  }

  const service = await getSyncService();

  if (!service) {
    return syncJson({ error: "Sync is temporarily unavailable." }, 503);
  }

  const account = await service.accountForSession(token);

  return syncJson({
    authenticated: Boolean(account),
    account,
  });
}
