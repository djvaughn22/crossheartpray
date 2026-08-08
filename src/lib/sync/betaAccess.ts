// Temporary shared-password admission for CrossHeartPray Sync.
//
// This is scaffolding, not the product: a paid subscription will replace it
// as the way an account gets a Sync entitlement, without touching the sync
// engine itself (register/login, sessions, merge). Deliberately NOT coupled
// to Step In The Ring's own beta-access password, even though the current
// value happens to match — a shared env var would tie two products' access
// windows together by accident.

import { timingSafeEqual } from "node:crypto";

export function betaAccessPasswordConfigured(): boolean {
  return Boolean(process.env.CHP_SYNC_BETA_ACCESS_PASSWORD?.trim());
}

/**
 * Unset env var fails closed — no password value can ever satisfy a check
 * against nothing. Compares full buffers of matched length even on early
 * exits so a wrong-length guess takes the same time as a right-length one.
 */
export function verifyBetaAccessPassword(candidate: unknown): boolean {
  const configured = process.env.CHP_SYNC_BETA_ACCESS_PASSWORD?.trim();
  if (!configured) return false;
  if (typeof candidate !== "string") return false;

  const expected = Buffer.from(configured, "utf8");
  const actual = Buffer.from(candidate.trim(), "utf8");

  if (actual.length !== expected.length) {
    timingSafeEqual(expected, expected);
    return false;
  }

  return timingSafeEqual(actual, expected);
}
