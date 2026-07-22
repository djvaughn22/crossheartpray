// Feature access control for the optional /guide page — the same server-side
// contract Digital DJ uses in TheDJCares, adapted for CrossHeartPray.
// Single source of truth for the guide's access mode, switches, and limits.
// Client state is never treated as authorization.

export type FeatureKey = "crossheartpray_guide";
export type FeatureAccessMode = "off" | "preview" | "subscriber";

export type AccessDecision = {
  allowed: boolean;
  mode: FeatureAccessMode;
  reason:
    | "feature_off"
    | "preview_access"
    | "subscriber_entitled"
    | "owner_override"
    | "sign_in_required"
    | "subscription_required"
    | "usage_limit";
};

export type Entitlement = {
  subjectId: string;
  featureKey?: FeatureKey;
  planId?: string;
  status: "active" | "inactive" | "expired" | "revoked";
  source: "owner" | "manual" | "promotion" | "billing";
  startsAt?: Date;
  endsAt?: Date;
};

export type Viewer = {
  id?: string;
  isOwner?: boolean;
  entitlements?: Entitlement[];
};

// Parse and validate the access mode. Anything unrecognized falls back to
// "off" — an invalid configuration must fail safely, not open the feature.
export function parseAccessMode(value: string | undefined): FeatureAccessMode {
  if (value === "preview" || value === "subscriber" || value === "off") {
    return value;
  }
  if (value === undefined || value === "") return "preview";
  return "off";
}

export function parseAiEnabled(value: string | undefined): boolean {
  return value === "true";
}

export function getCurrentAccessMode(featureKey: FeatureKey): FeatureAccessMode {
  if (featureKey === "crossheartpray_guide") {
    return parseAccessMode(process.env.CROSSHEARTPRAY_GUIDE_ACCESS_MODE);
  }
  return "off";
}

// AI is opt-in: it only turns on when the switch is explicitly "true" AND a
// server key exists. Everything else is the deterministic guide, which is the
// complete product on its own.
export function isAiEnabled(featureKey: FeatureKey): boolean {
  if (featureKey === "crossheartpray_guide") {
    return parseAiEnabled(process.env.CROSSHEARTPRAY_GUIDE_AI_ENABLED);
  }
  return false;
}

function parseLimit(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : Math.max(0, parsed);
}

export function getDailyAnonLimit(): number {
  return parseLimit(process.env.CROSSHEARTPRAY_GUIDE_DAILY_ANONYMOUS_LIMIT, 5);
}

export function getDailyAccountLimit(): number {
  return parseLimit(process.env.CROSSHEARTPRAY_GUIDE_DAILY_ACCOUNT_LIMIT, 20);
}

// Adapter for a future shared Open Mirror entitlement service. When
// OPEN_MIRROR_ENTITLEMENT_URL is not configured (the current state), this
// returns an empty list without any network request. When it is configured,
// a failure of any kind still fails closed to "no entitlements".
export async function fetchEntitlements(subjectId: string): Promise<Entitlement[]> {
  const baseUrl = process.env.OPEN_MIRROR_ENTITLEMENT_URL;
  if (!baseUrl) return [];

  try {
    const response = await fetch(
      `${baseUrl.replace(/\/$/, "")}/entitlements/${encodeURIComponent(subjectId)}`,
      { signal: AbortSignal.timeout(3_000) },
    );
    if (!response.ok) return [];
    const data: unknown = await response.json();
    if (!Array.isArray(data)) return [];
    return data.filter(
      (item): item is Entitlement =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Entitlement).subjectId === "string" &&
        typeof (item as Entitlement).status === "string",
    );
  } catch {
    return [];
  }
}

function hasActiveEntitlement(viewer: Viewer | undefined): boolean {
  if (!viewer?.entitlements) return false;
  const now = Date.now();
  return viewer.entitlements.some(
    (entitlement) =>
      entitlement.status === "active" &&
      (entitlement.featureKey === "crossheartpray_guide" ||
        entitlement.planId === FUTURE_PLANS.open_mirror_apps_monthly.id) &&
      (!entitlement.endsAt || entitlement.endsAt.getTime() > now),
  );
}

// Main authorization check — every guide route and action goes through here.
export async function canAccessFeature(args: {
  featureKey: FeatureKey;
  viewer?: Viewer;
  requestContext?: { ip?: string };
}): Promise<AccessDecision> {
  const { featureKey, viewer } = args;
  const mode = getCurrentAccessMode(featureKey);

  if (viewer?.isOwner) {
    return { allowed: true, mode, reason: "owner_override" };
  }

  if (mode === "off") {
    return { allowed: false, mode: "off", reason: "feature_off" };
  }

  if (mode === "preview") {
    return { allowed: true, mode: "preview", reason: "preview_access" };
  }

  // subscriber mode
  if (!viewer?.id) {
    return { allowed: false, mode: "subscriber", reason: "sign_in_required" };
  }
  if (hasActiveEntitlement(viewer)) {
    return { allowed: true, mode: "subscriber", reason: "subscriber_entitled" };
  }
  return { allowed: false, mode: "subscriber", reason: "subscription_required" };
}

// Internal future plan metadata. Inactive, never displayed anywhere on
// CrossHeartPray, and nothing on this site links to any purchase flow.
export const FUTURE_PLANS = {
  open_mirror_apps_monthly: {
    id: "open_mirror_apps_monthly",
    priceCents: 299,
    currency: "USD",
    interval: "month" as const,
    active: false,
    publiclyVisible: false,
    billingEnabled: false,
  },
} as const;
