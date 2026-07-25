// Route-level guarantees: cron auth, token validation, and fail-closed
// signup. Handlers are invoked directly with Request objects — no live
// email or database is touched (test env has no DATABASE_URL/RESEND key,
// so storage is the in-memory adapter and the provider is absent).

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET as sendGET } from "../../app/api/bingo-email/send/route";
import { GET as batchGET } from "../../app/api/bingo-email/batch/[token]/route";
import { POST as subscribePOST } from "../../app/api/bingo-email/subscribe/route";

const ENV_KEYS = ["CRON_SECRET", "SOCIAL_ADMIN_KEY", "RESEND_API_KEY", "BINGO_EMAIL_FROM"] as const;
const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

describe("cron send route authentication", () => {
  it("rejects unauthenticated calls", async () => {
    process.env.CRON_SECRET = "topsecret";
    const response = await sendGET(
      new Request("https://crossheartpray.com/api/bingo-email/send"),
    );
    expect(response.status).toBe(401);
  });

  it("rejects a wrong bearer token", async () => {
    process.env.CRON_SECRET = "topsecret";
    const response = await sendGET(
      new Request("https://crossheartpray.com/api/bingo-email/send", {
        headers: { authorization: "Bearer wrong" },
      }),
    );
    expect(response.status).toBe(401);
  });

  it("accepts the cron secret and reports not-configured instead of failing", async () => {
    process.env.CRON_SECRET = "topsecret";
    const response = await sendGET(
      new Request("https://crossheartpray.com/api/bingo-email/send", {
        headers: { authorization: "Bearer topsecret" },
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.skipped).toBe("not-configured");
  });
});

describe("batch route token validation", () => {
  it("404s for malformed and unknown tokens", async () => {
    for (const token of ["<nope>", "short", "a".repeat(200), "plausible-but-unknown-token"]) {
      const response = await batchGET(
        new Request(`https://crossheartpray.com/api/bingo-email/batch/${token}`),
        { params: Promise.resolve({ token }) },
      );
      expect(response.status).toBe(404);
      expect(response.headers.get("x-robots-tag")).toContain("noindex");
      expect(response.headers.get("cache-control")).toContain("no-store");
    }
  });
});

describe("signup route", () => {
  it("validates consent and email before anything else", async () => {
    const noConsent = await subscribePOST(
      new Request("https://crossheartpray.com/api/bingo-email/subscribe", {
        method: "POST",
        body: JSON.stringify({ email: "a@example.com", consent: false }),
      }),
    );
    expect(noConsent.status).toBe(400);

    const badEmail = await subscribePOST(
      new Request("https://crossheartpray.com/api/bingo-email/subscribe", {
        method: "POST",
        body: JSON.stringify({ email: "nope", consent: true }),
      }),
    );
    expect(badEmail.status).toBe(400);
  });

  it("fails closed with 503 when no email provider is configured", async () => {
    const response = await subscribePOST(
      new Request("https://crossheartpray.com/api/bingo-email/subscribe", {
        method: "POST",
        body: JSON.stringify({ email: "reader@example.com", consent: true }),
      }),
    );
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toContain("isn't available yet");
  });
});
