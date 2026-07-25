// High-entropy random tokens for Bible Bingo 7 email links.
// Tokens are opaque capabilities stored server-side (unique-indexed), never
// signed payloads — nothing personal can be decoded out of a URL.

import { randomBytes, randomUUID } from "crypto";

/** 144 bits of randomness, URL-safe. Used for batch and manage tokens. */
export function newBingoEmailToken() {
  return randomBytes(18).toString("base64url");
}

export function newBingoEmailId() {
  return randomUUID();
}

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

/** Cheap shape check before any storage lookup. */
export function isPlausibleBingoEmailToken(value: string | null | undefined) {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}
