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

  if (syncRateLimited("sync-register", request, 5, 10 * 60 * 1000)) {
    return syncJson(
      { error: "Too many attempts. Please try again in a few minutes." },
      429,
    );
  }

  let payload: { email?: unknown; password?: unknown };

  try {
    payload = await request.json();
  } catch {
    return syncJson({ error: "Please enter your email and password." }, 400);
  }

  const service = await getSyncService();
  if (!service) {
    return syncJson({ error: "Sync is temporarily unavailable." }, 503);
  }

  const result = await service.register(payload);

  if (!result.ok) {
    const messages = {
      "invalid-email": "Please enter a valid email address.",
      "invalid-password": "Use a password with at least 12 characters.",
      "email-in-use": "An account already exists for that email.",
    } as const;

    return syncJson({ error: messages[result.error] }, 400);
  }

  const response = syncJson(
    {
      account: result.account,
      message:
        "Account created. CrossHeartPray remains free; cross-device Sync activates with a Sync entitlement.",
    },
    201,
  );

  setSyncSessionCookie(response, result.token, result.expiresAt);
  return response;
}
