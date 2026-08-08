import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const MAXMEM = 64 * 1024 * 1024;

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      KEY_LENGTH,
      {
        N: SCRYPT_N,
        r: SCRYPT_R,
        p: SCRYPT_P,
        maxmem: MAXMEM,
      },
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      },
    );
  });
}

export function normalizeSyncEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;

  return email;
}

/**
 * Codes are compared case-insensitively with spaces and dashes ignored, so a
 * code read off a screen or a card matches however it was typed. Only the
 * normalized form is ever hashed.
 */
export function normalizeSyncCode(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const code = value.replace(/[\s-]/g, "").toUpperCase();
  if (code.length < 8 || code.length > 64) return null;
  if (!/^[A-Z0-9]+$/.test(code)) return null;

  return code;
}

export function validateSyncPassword(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.length < 12 || value.length > 256) return null;
  return value;
}

export async function hashSyncPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);

  return [
    "scrypt",
    String(SCRYPT_N),
    String(SCRYPT_R),
    String(SCRYPT_P),
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

export async function verifySyncPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  const parts = encoded.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, nRaw, rRaw, pRaw, saltRaw, hashRaw] = parts;

  if (
    Number(nRaw) !== SCRYPT_N ||
    Number(rRaw) !== SCRYPT_R ||
    Number(pRaw) !== SCRYPT_P
  ) {
    return false;
  }

  let salt: Buffer;
  let expected: Buffer;

  try {
    salt = Buffer.from(saltRaw, "base64");
    expected = Buffer.from(hashRaw, "base64");
  } catch {
    return false;
  }

  if (salt.length !== 16 || expected.length !== KEY_LENGTH) return false;

  const actual = await deriveKey(password, salt);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createSyncSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSyncSecret(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function createSyncId(): string {
  return randomUUID();
}
