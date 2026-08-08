export type SyncUser = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

export type SyncSession = {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
};

export type SyncEntitlementKind = "annual" | "lifetime" | "free-code" | "beta";
export type SyncEntitlementStatus = "active" | "revoked" | "expired";

export type SyncEntitlement = {
  id: string;
  userId: string;
  kind: SyncEntitlementKind;
  status: SyncEntitlementStatus;
  sourceRef: string | null;
  startsAt: string;
  endsAt: string | null;
  createdAt: string;
};

export type SyncProgressItem = {
  userId: string;
  planId: "one-year-v1" | "two-year-v1";
  cycleId: string | null;
  itemId: string;
  completed: boolean;
  updatedAt: string;
};

export type SyncCode = {
  id: string;
  codeHash: string;
  label: string;
  enabled: boolean;
  createdAt: string;
  disabledAt: string | null;
};

export type SyncCodeRedemption = {
  id: string;
  codeId: string;
  userId: string;
  normalizedEmail: string;
  redeemedAt: string;
};
