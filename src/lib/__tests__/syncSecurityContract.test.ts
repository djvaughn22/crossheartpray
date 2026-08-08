import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("CrossHeartPray Sync security contract", () => {
  it("keeps account/session/code secrets server-side", () => {
    const pg = source("src/lib/sync/pgStore.ts");
    const crypto = source("src/lib/sync/crypto.ts");

    expect(pg).toContain("password_hash");
    expect(pg).toContain("token_hash");
    expect(pg).toContain("code_hash");

    expect(pg).not.toMatch(/\braw_code\b/);
    expect(pg).not.toMatch(/\bpassword text\b/);
    expect(crypto).not.toContain("NEXT_PUBLIC");
  });

  it("uses HttpOnly SameSite cookies", () => {
    const shared = source("src/app/api/sync/routeShared.ts");

    expect(shared).toContain("httpOnly: true");
    expect(shared).toContain('sameSite: "lax"');
    expect(shared).toContain(
      'secure: process.env.NODE_ENV === "production"',
    );
  });

  it("does not make client storage authoritative for entitlement", () => {
    const service = source("src/lib/sync/service.ts");
    const progressRoute = source("src/app/api/sync/progress/route.ts");

    expect(service).not.toContain("localStorage");
    expect(progressRoute).not.toContain("localStorage");
    expect(service).toContain("listEntitlements");
    expect(service).toContain("syncActive");
  });

  it("keeps the existing local-first progress services free of account dependencies", () => {
    const oneYear = source("src/lib/readingPlanProgress.ts");
    const twoYear = source("src/lib/readingPlan104Progress.ts");

    expect(oneYear).not.toContain("/api/sync");
    expect(twoYear).not.toContain("/api/sync");
    expect(oneYear).not.toContain("getSyncService");
    expect(twoYear).not.toContain("getSyncService");
  });

  it("stores code redemption identity without needing the raw code", () => {
    const pg = source("src/lib/sync/pgStore.ts");

    expect(pg).toContain("normalized_email");
    expect(pg).toContain("redeemed_at");
    expect(pg).toContain("code_id");
    expect(pg).toContain("user_id");
    expect(pg).not.toContain("raw_code");
  });

  it("requires server entitlement before cloud progress access", () => {
    const route = source("src/app/api/sync/progress/route.ts");

    expect(route).toContain("sync-inactive");
    expect(route).toContain("Local reading progress still works");
  });
});
