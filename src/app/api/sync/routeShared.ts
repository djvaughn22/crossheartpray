import { NextResponse } from "next/server";

export const SYNC_SESSION_COOKIE = "chp_sync_session";

export const SYNC_PRIVATE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
};

const attempts = new Map<string, number[]>();

export function syncJson(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: SYNC_PRIVATE_HEADERS,
  });
}

export function requestIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export function syncRateLimited(
  bucket: string,
  request: Request,
  max: number,
  windowMs: number,
): boolean {
  const key = `${bucket}:${requestIp(request)}`;
  const cutoff = Date.now() - windowMs;
  const recent = (attempts.get(key) ?? []).filter((at) => at > cutoff);

  recent.push(Date.now());
  attempts.set(key, recent);

  if (attempts.size > 5000) attempts.clear();

  return recent.length > max;
}

export function hasSafeSyncOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function sessionTokenFromRequest(request: Request): string | null {
  const raw = request.headers.get("cookie");
  if (!raw) return null;

  for (const part of raw.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name !== SYNC_SESSION_COOKIE) continue;

    const value = rest.join("=");
    if (!value) return null;

    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  }

  return null;
}

export function setSyncSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: string,
) {
  response.cookies.set({
    name: SYNC_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export function clearSyncSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SYNC_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
