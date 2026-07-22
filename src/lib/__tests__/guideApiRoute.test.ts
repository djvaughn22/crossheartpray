// The /api/guide/intent route, exercised guard by guard. The OpenAI SDK is
// mocked so the tests can prove a blocked request NEVER constructs a client
// or reaches the model.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const constructorSpy = vi.fn();
const createSpy = vi.fn();

vi.mock("openai", () => ({
  default: class MockOpenAI {
    responses = { create: createSpy };
    constructor(config: unknown) {
      constructorSpy(config);
    }
  },
}));

import { POST } from "../../app/api/guide/intent/route";
import { resetRateLimitStore } from "../guide/guideRateLimit";

function intentRequest(body: unknown, ip = "203.0.113.5"): NextRequest {
  return new Request("http://localhost/api/guide/intent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  }) as unknown as NextRequest;
}

function enablePreviewWithAi() {
  vi.stubEnv("CROSSHEARTPRAY_GUIDE_ACCESS_MODE", "preview");
  vi.stubEnv("CROSSHEARTPRAY_GUIDE_AI_ENABLED", "true");
  vi.stubEnv("OPENAI_API_KEY", "test-key-not-real");
}

beforeEach(() => {
  resetRateLimitStore();
  constructorSpy.mockClear();
  createSpy.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("access gating", () => {
  it("returns 403 and never touches OpenAI in off mode", async () => {
    vi.stubEnv("CROSSHEARTPRAY_GUIDE_ACCESS_MODE", "off");
    const response = await POST(intentRequest({ userText: "help me start" }));
    expect(response.status).toBe(403);
    expect(constructorSpy).not.toHaveBeenCalled();
  });

  it("returns a calm 200 with no model call when AI is disabled", async () => {
    vi.stubEnv("CROSSHEARTPRAY_GUIDE_ACCESS_MODE", "preview");
    vi.stubEnv("CROSSHEARTPRAY_GUIDE_AI_ENABLED", "false");
    vi.stubEnv("OPENAI_API_KEY", "test-key-not-real");
    const response = await POST(intentRequest({ userText: "help me start" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ intent: null, aiEnabled: false });
    expect(constructorSpy).not.toHaveBeenCalled();
  });

  it("behaves safely with no API key configured", async () => {
    vi.stubEnv("CROSSHEARTPRAY_GUIDE_ACCESS_MODE", "preview");
    vi.stubEnv("CROSSHEARTPRAY_GUIDE_AI_ENABLED", "true");
    vi.stubEnv("OPENAI_API_KEY", "");
    const response = await POST(intentRequest({ userText: "help me start" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ intent: null, aiEnabled: false });
    expect(constructorSpy).not.toHaveBeenCalled();
  });
});

describe("input guards", () => {
  it("rejects invalid JSON and oversized input without a model call", async () => {
    enablePreviewWithAi();
    expect((await POST(intentRequest("{not json"))).status).toBe(400);
    expect(
      (await POST(intentRequest({ userText: "x".repeat(301) }))).status,
    ).toBe(400);
    expect((await POST(intentRequest({ userText: 42 }))).status).toBe(400);
    expect(constructorSpy).not.toHaveBeenCalled();
  });

  it("routes crisis language to the safety response, never the model", async () => {
    enablePreviewWithAi();
    const response = await POST(
      intentRequest({ userText: "I want to kill myself tonight" }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ intent: null, safety: true });
    expect(constructorSpy).not.toHaveBeenCalled();
  });
});

describe("the one allowed model call", () => {
  it("parses a normal request into a sanitized intent", async () => {
    enablePreviewWithAi();
    createSpy.mockResolvedValue({
      output_text: JSON.stringify({
        durationMinutes: 5,
        needs: ["worry"],
        preferredResource: null,
      }),
    });
    const response = await POST(
      intentRequest({ userText: "I'm worried about tomorrow, five minutes" }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      intent: { durationMinutes: 5, needs: ["worry"] },
    });
    expect(createSpy).toHaveBeenCalledTimes(1);
  });

  it("falls back to null intent on invalid structured output", async () => {
    enablePreviewWithAi();
    createSpy.mockResolvedValue({ output_text: "sorry, here is a verse: John 3:16" });
    const response = await POST(intentRequest({ userText: "help me begin" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ intent: null });
  });

  it("enforces the daily quota per visitor", async () => {
    enablePreviewWithAi();
    vi.stubEnv("CROSSHEARTPRAY_GUIDE_DAILY_ANONYMOUS_LIMIT", "1");
    createSpy.mockResolvedValue({
      output_text: JSON.stringify({
        durationMinutes: 10,
        needs: ["hope"],
        preferredResource: null,
      }),
    });
    expect((await POST(intentRequest({ userText: "hope" }))).status).toBe(200);
    const second = await POST(intentRequest({ userText: "hope again" }));
    expect(second.status).toBe(429);
    expect(createSpy).toHaveBeenCalledTimes(1);
  });
});
