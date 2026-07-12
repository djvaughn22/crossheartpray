import { describe, expect, it, vi } from "vitest";
import {
  buildDailyBibleBingoPost,
  captionMarkerForDate,
} from "../dailyBibleBingo";
import {
  missingCredentials,
  publishDailyPost,
  readPublishConfig,
  sanitizeForLog,
  validatePostForPublishing,
  type PublishConfig,
} from "../instagramPublisher";

const TOKEN = "TEST-TOKEN-abc123";

function testConfig(overrides: Partial<PublishConfig> = {}): PublishConfig {
  return {
    autopublishEnabled: true,
    publishHour: null,
    accountId: "17840000000000000",
    accessToken: TOKEN,
    graphApiBase: "https://graph.facebook.com/v23.0",
    siteBaseUrl: "https://crossheartpray.com",
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function pngResponse() {
  return new Response("png-bytes", {
    status: 200,
    headers: { "content-type": "image/png" },
  });
}

// A fetch mock keyed by URL substrings, recording every call.
function fetchMock(routes: Array<[match: string, respond: () => Response]>) {
  const calls: string[] = [];
  const impl = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    for (const [match, respond] of routes) {
      if (url.includes(match)) return respond();
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
  return { impl: impl as unknown as typeof fetch, calls };
}

describe("config and validation", () => {
  it("reads env config with safe defaults", () => {
    const config = readPublishConfig({
      INSTAGRAM_AUTOPUBLISH_ENABLED: "false",
      INSTAGRAM_PUBLISH_HOUR: "8",
      INSTAGRAM_ACCOUNT_ID: " 123 ",
      META_ACCESS_TOKEN: "t",
    });

    expect(config.autopublishEnabled).toBe(false);
    expect(config.publishHour).toBe(8);
    expect(config.accountId).toBe("123");
    expect(config.graphApiBase).toBe("https://graph.facebook.com/v23.0");
  });

  it("treats a blank or invalid publish hour as unset", () => {
    expect(readPublishConfig({ INSTAGRAM_PUBLISH_HOUR: "" }).publishHour).toBeNull();
    expect(readPublishConfig({ INSTAGRAM_PUBLISH_HOUR: "25" }).publishHour).toBeNull();
  });

  it("lists missing credentials by env var name", () => {
    expect(missingCredentials(testConfig({ accountId: "", accessToken: "" }))).toEqual([
      "INSTAGRAM_ACCOUNT_ID",
      "META_ACCESS_TOKEN",
    ]);
  });

  it("accepts a real daily post and rejects a gutted one", () => {
    const post = buildDailyBibleBingoPost("2026-07-12");
    expect(validatePostForPublishing(post)).toEqual([]);

    const broken = { ...post, caption: "wrong caption" };
    expect(validatePostForPublishing(broken).length).toBeGreaterThan(0);
  });

  it("strips tokens from log output", () => {
    const config = testConfig();
    expect(sanitizeForLog(`failed: ${TOKEN}`, config)).not.toContain(TOKEN);
    expect(sanitizeForLog("url?access_token=xyz&x=1", config)).toContain(
      "access_token=[token]",
    );
  });
});

describe("publishDailyPost", () => {
  it("fails cleanly with missing credentials and never calls the network", async () => {
    const { impl, calls } = fetchMock([]);
    const result = await publishDailyPost({
      dateKey: "2026-07-12",
      dryRun: false,
      config: testConfig({ accessToken: "" }),
      fetchImpl: impl,
    });

    expect(result.ok).toBe(false);
    expect(result.error?.stage).toBe("credentials");
    expect(result.error?.message).toContain("META_ACCESS_TOKEN");
    expect(calls).toHaveLength(0);
  });

  it("refuses to publish the same date twice", async () => {
    const marker = captionMarkerForDate("2026-07-12");
    const { impl, calls } = fetchMock([
      [
        "/media?fields=",
        () => jsonResponse({ data: [{ id: "999", caption: `${marker}\n…`, timestamp: "2026-07-12T13:30:00+0000" }] }),
      ],
    ]);

    const result = await publishDailyPost({
      dateKey: "2026-07-12",
      dryRun: false,
      config: testConfig(),
      fetchImpl: impl,
    });

    expect(result.ok).toBe(true);
    expect(result.published).toBe(false);
    expect(result.alreadyPublished).toBe(true);
    expect(result.mediaId).toBe("999");
    // Only the duplicate check ran — no container, no publish.
    expect(calls).toHaveLength(1);
  });

  it("dry run checks the image but never creates media", async () => {
    const { impl, calls } = fetchMock([
      ["/media?fields=", () => jsonResponse({ data: [] })],
      ["/api/social/bible-bingo/", pngResponse],
    ]);

    const result = await publishDailyPost({
      dateKey: "2026-07-12",
      dryRun: true,
      config: testConfig(),
      fetchImpl: impl,
    });

    expect(result.ok).toBe(true);
    expect(result.published).toBe(false);
    expect(result.caption).toContain(captionMarkerForDate("2026-07-12"));
    expect(result.imageUrl).toBe(
      "https://crossheartpray.com/api/social/bible-bingo/2026-07-12.png",
    );
    expect(calls.some((url) => url.includes("/media_publish"))).toBe(false);
    expect(calls).toHaveLength(2);
  });

  it("publishes through container → status → publish and returns the media id", async () => {
    const { impl, calls } = fetchMock([
      ["/media?fields=", () => jsonResponse({ data: [] })],
      ["/api/social/bible-bingo/", pngResponse],
      ["/media_publish", () => jsonResponse({ id: "MEDIA-456" })],
      ["?fields=status_code", () => jsonResponse({ status_code: "FINISHED" })],
      ["/media", () => jsonResponse({ id: "CONTAINER-123" })],
    ]);

    const result = await publishDailyPost({
      dateKey: "2026-07-12",
      dryRun: false,
      config: testConfig(),
      fetchImpl: impl,
      pollDelayMs: 1,
    });

    expect(result.ok).toBe(true);
    expect(result.published).toBe(true);
    expect(result.mediaId).toBe("MEDIA-456");
    expect(result.publishedAt).toBeTruthy();
    expect(calls.filter((url) => url.includes("/media_publish"))).toHaveLength(1);
  });

  it("fails without leaking the token when the image is not public", async () => {
    const { impl } = fetchMock([
      ["/media?fields=", () => jsonResponse({ data: [] })],
      ["/api/social/bible-bingo/", () => new Response("nope", { status: 404 })],
    ]);

    const result = await publishDailyPost({
      dateKey: "2026-07-12",
      dryRun: false,
      config: testConfig(),
      fetchImpl: impl,
    });

    expect(result.ok).toBe(false);
    expect(result.error?.stage).toBe("image-check");
    expect(JSON.stringify(result)).not.toContain(TOKEN);
  });

  it("surfaces a sanitized Meta error when container creation fails", async () => {
    const { impl } = fetchMock([
      ["/media?fields=", () => jsonResponse({ data: [] })],
      ["/api/social/bible-bingo/", pngResponse],
      [
        "/media",
        () =>
          jsonResponse(
            { error: { message: `Invalid parameter for ${TOKEN}`, code: 100 } },
            400,
          ),
      ],
    ]);

    const result = await publishDailyPost({
      dateKey: "2026-07-12",
      dryRun: false,
      config: testConfig(),
      fetchImpl: impl,
    });

    expect(result.ok).toBe(false);
    expect(result.error?.stage).toBe("create-container");
    expect(result.error?.message).toContain("code 100");
    expect(JSON.stringify(result)).not.toContain(TOKEN);
  });

  it("refuses a non-HTTPS image URL", async () => {
    const { impl, calls } = fetchMock([
      ["/media?fields=", () => jsonResponse({ data: [] })],
    ]);

    const result = await publishDailyPost({
      dateKey: "2026-07-12",
      dryRun: false,
      config: testConfig({ siteBaseUrl: "http://localhost:3000" }),
      fetchImpl: impl,
    });

    expect(result.ok).toBe(false);
    expect(result.error?.stage).toBe("image-check");
    expect(calls).toHaveLength(1); // duplicate check only, no image fetch
  });
});
