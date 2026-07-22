// The guide's server-side access contract: off / preview / subscriber modes,
// owner override, entitlement checks, safe defaults for invalid config, and
// the promise that future plan metadata never reaches a visitor-facing file.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canAccessFeature,
  fetchEntitlements,
  FUTURE_PLANS,
  getDailyAccountLimit,
  getDailyAnonLimit,
  getCurrentAccessMode,
  isAiEnabled,
  parseAccessMode,
  type Entitlement,
} from "../guide/featureAccess";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("access mode parsing", () => {
  it("accepts the three valid modes", () => {
    expect(parseAccessMode("off")).toBe("off");
    expect(parseAccessMode("preview")).toBe("preview");
    expect(parseAccessMode("subscriber")).toBe("subscriber");
  });

  it("defaults to preview when unset", () => {
    expect(parseAccessMode(undefined)).toBe("preview");
    expect(parseAccessMode("")).toBe("preview");
  });

  it("fails safe to off on invalid configuration", () => {
    expect(parseAccessMode("on")).toBe("off");
    expect(parseAccessMode("PREVIEW ")).toBe("off");
    expect(parseAccessMode("everyone")).toBe("off");
  });
});

describe("canAccessFeature", () => {
  it("denies everyone in off mode except the owner", async () => {
    vi.stubEnv("CROSSHEARTPRAY_GUIDE_ACCESS_MODE", "off");
    const anonymous = await canAccessFeature({ featureKey: "crossheartpray_guide" });
    expect(anonymous).toEqual({ allowed: false, mode: "off", reason: "feature_off" });

    const owner = await canAccessFeature({
      featureKey: "crossheartpray_guide",
      viewer: { isOwner: true },
    });
    expect(owner.allowed).toBe(true);
    expect(owner.reason).toBe("owner_override");
  });

  it("allows anonymous visitors in preview mode", async () => {
    vi.stubEnv("CROSSHEARTPRAY_GUIDE_ACCESS_MODE", "preview");
    const decision = await canAccessFeature({ featureKey: "crossheartpray_guide" });
    expect(decision).toEqual({
      allowed: true,
      mode: "preview",
      reason: "preview_access",
    });
  });

  it("requires sign-in in subscriber mode", async () => {
    vi.stubEnv("CROSSHEARTPRAY_GUIDE_ACCESS_MODE", "subscriber");
    const decision = await canAccessFeature({ featureKey: "crossheartpray_guide" });
    expect(decision).toEqual({
      allowed: false,
      mode: "subscriber",
      reason: "sign_in_required",
    });
  });

  it("denies a signed-in viewer without an entitlement", async () => {
    vi.stubEnv("CROSSHEARTPRAY_GUIDE_ACCESS_MODE", "subscriber");
    const decision = await canAccessFeature({
      featureKey: "crossheartpray_guide",
      viewer: { id: "viewer-1", entitlements: [] },
    });
    expect(decision).toEqual({
      allowed: false,
      mode: "subscriber",
      reason: "subscription_required",
    });
  });

  it("allows a signed-in viewer with an active entitlement", async () => {
    vi.stubEnv("CROSSHEARTPRAY_GUIDE_ACCESS_MODE", "subscriber");
    const entitlement: Entitlement = {
      subjectId: "viewer-1",
      planId: "open_mirror_apps_monthly",
      status: "active",
      source: "manual",
    };
    const decision = await canAccessFeature({
      featureKey: "crossheartpray_guide",
      viewer: { id: "viewer-1", entitlements: [entitlement] },
    });
    expect(decision).toEqual({
      allowed: true,
      mode: "subscriber",
      reason: "subscriber_entitled",
    });
  });

  it("ignores revoked and expired entitlements", async () => {
    vi.stubEnv("CROSSHEARTPRAY_GUIDE_ACCESS_MODE", "subscriber");
    const decision = await canAccessFeature({
      featureKey: "crossheartpray_guide",
      viewer: {
        id: "viewer-1",
        entitlements: [
          {
            subjectId: "viewer-1",
            planId: "open_mirror_apps_monthly",
            status: "revoked",
            source: "billing",
          },
          {
            subjectId: "viewer-1",
            featureKey: "crossheartpray_guide",
            status: "active",
            source: "billing",
            endsAt: new Date(Date.now() - 1000),
          },
        ],
      },
    });
    expect(decision.allowed).toBe(false);
  });
});

describe("switches and limits", () => {
  it("AI is off unless explicitly enabled", () => {
    expect(isAiEnabled("crossheartpray_guide")).toBe(false);
    vi.stubEnv("CROSSHEARTPRAY_GUIDE_AI_ENABLED", "yes");
    expect(isAiEnabled("crossheartpray_guide")).toBe(false);
    vi.stubEnv("CROSSHEARTPRAY_GUIDE_AI_ENABLED", "true");
    expect(isAiEnabled("crossheartpray_guide")).toBe(true);
  });

  it("reads daily limits with safe defaults", () => {
    expect(getDailyAnonLimit()).toBe(5);
    expect(getDailyAccountLimit()).toBe(20);
    vi.stubEnv("CROSSHEARTPRAY_GUIDE_DAILY_ANONYMOUS_LIMIT", "3");
    expect(getDailyAnonLimit()).toBe(3);
    vi.stubEnv("CROSSHEARTPRAY_GUIDE_DAILY_ANONYMOUS_LIMIT", "not-a-number");
    expect(getDailyAnonLimit()).toBe(5);
    vi.stubEnv("CROSSHEARTPRAY_GUIDE_DAILY_ANONYMOUS_LIMIT", "-4");
    expect(getDailyAnonLimit()).toBe(0);
  });

  it("defaults to preview mode when the mode variable is unset", () => {
    expect(getCurrentAccessMode("crossheartpray_guide")).toBe("preview");
  });
});

describe("entitlement service adapter", () => {
  it("makes no network request when OPEN_MIRROR_ENTITLEMENT_URL is unset", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await fetchEntitlements("viewer-1");
    expect(result).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fails closed when the configured service errors", async () => {
    vi.stubEnv("OPEN_MIRROR_ENTITLEMENT_URL", "https://entitlements.example");
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("down"));
    const result = await fetchEntitlements("viewer-1");
    expect(result).toEqual([]);
  });
});

describe("future plan stays internal", () => {
  it("is inactive, unbilled, and not publicly visible", () => {
    const plan = FUTURE_PLANS.open_mirror_apps_monthly;
    expect(plan.active).toBe(false);
    expect(plan.billingEnabled).toBe(false);
    expect(plan.publiclyVisible).toBe(false);
  });

  it("never appears in any visitor-facing guide file", () => {
    const appDir = join(__dirname, "..", "..", "app");
    const visitorFacing = [
      join(appDir, "guide", "page.tsx"),
      join(appDir, "guide", "GuideClient.tsx"),
      join(appDir, "page.tsx"),
    ];
    for (const file of visitorFacing) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/open_mirror_apps_monthly|priceCents|299/);
      expect(source, file).not.toMatch(/\bupgrade\b|\bsubscribe\b/i);
    }
  });
});
