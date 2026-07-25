// The outbound Resend payload: official From identity, Reply-To on every
// message, and outbound-only behavior (one POST to the send endpoint —
// nothing inbound, no webhooks). fetch is stubbed; no live email.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BINGO_EMAIL_DEFAULT_REPLY_TO,
  getBingoEmailReplyTo,
  getBingoEmailSender,
} from "../bingoEmail/mailer";

const ENV_KEYS = ["RESEND_API_KEY", "BINGO_EMAIL_FROM", "BINGO_EMAIL_REPLY_TO"] as const;
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
  vi.unstubAllGlobals();
});

describe("bingo email mailer", () => {
  it("is unconfigured (null) without both RESEND_API_KEY and BINGO_EMAIL_FROM", () => {
    expect(getBingoEmailSender()).toBeNull();
    process.env.RESEND_API_KEY = "re_test";
    expect(getBingoEmailSender()).toBeNull();
  });

  it("reply-to defaults to the official mailbox and follows the env override", () => {
    expect(BINGO_EMAIL_DEFAULT_REPLY_TO).toBe("hi@crossheartpray.com");
    expect(getBingoEmailReplyTo()).toBe("hi@crossheartpray.com");
    process.env.BINGO_EMAIL_REPLY_TO = "  other@crossheartpray.com ";
    expect(getBingoEmailReplyTo()).toBe("other@crossheartpray.com");
  });

  it("sends one outbound POST with the official From and Reply-To on every message", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.BINGO_EMAIL_FROM = "CrossHeartPray <hi@crossheartpray.com>";

    const calls: { url: string; body: Record<string, unknown> }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        calls.push({ url: String(url), body: JSON.parse(String(init.body)) });
        return new Response("{}", { status: 200 });
      }),
    );

    const send = getBingoEmailSender()!;
    await send({
      to: "reader@example.com",
      subject: "Your Bible Bingo 7 — Set 1 of 52",
      html: "<p>hello</p>",
      text: "hello",
      headers: { "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.resend.com/emails");
    expect(calls[0].body.from).toBe("CrossHeartPray <hi@crossheartpray.com>");
    expect(calls[0].body.reply_to).toEqual(["hi@crossheartpray.com"]);
    expect(calls[0].body.to).toEqual(["reader@example.com"]);
  });

  it("surfaces provider failures without echoing the recipient", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.BINGO_EMAIL_FROM = "CrossHeartPray <hi@crossheartpray.com>";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 422 })),
    );

    const send = getBingoEmailSender()!;
    await expect(
      send({ to: "reader@example.com", subject: "s", html: "h", text: "t" }),
    ).rejects.toThrow(/provider responded 422/);
  });
});
