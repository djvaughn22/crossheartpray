// CrossHeartPray Instagram publisher — now a thin brand adapter over the
// shared Daily Social Engine core (src/lib/instagramPublisherCore.ts, synced
// from open-mirror/packages/daily-social-engine). The public API of this
// module is unchanged; all Meta mechanics live in the core.

import {
  buildDailyBibleBingoPost,
  captionMarkerForDate,
  DAILY_BIBLE_BINGO_START_DATE,
  DAILY_BIBLE_BINGO_VERSION,
  type DailyBibleBingoPost,
} from "./dailyBibleBingo";
import type { DailySocialBrandConfig, DailySocialPost } from "./dailySocialCore";
import {
  findPublishedMediaForMarker,
  missingCredentials,
  publishDailySocialPost,
  readPublishConfig,
  sanitizeForLog as coreSanitizeForLog,
  type PublishConfig,
  type PublishResult as CorePublishResult,
  type PublishStep,
} from "./instagramPublisherCore";

export { missingCredentials, readPublishConfig };
export type { PublishConfig, PublishStep };

export const CHP_BRAND: DailySocialBrandConfig = {
  brand: "crossheartpray",
  siteName: "CrossHeartPray.com",
  siteUrl: "https://crossheartpray.com",
  // Matches dailyBibleBingo.captionMarkerForDate — the existing ledger lines.
  markerPrefix: "Daily Bible Bingo",
  hashtags: [],
  startDate: DAILY_BIBLE_BINGO_START_DATE,
  version: DAILY_BIBLE_BINGO_VERSION,
};

export type PublishResult = Omit<CorePublishResult, "brand"> & { brand?: string };

export function sanitizeForLog(value: string, config: PublishConfig): string {
  return coreSanitizeForLog(value, config);
}

// Bible-Bingo-specific completeness checks, layered on top of the engine's
// generic parity validation: exactly 7 lanes, every lane with a real
// reference and verse text, board id encoding 7 passages.
export function validatePostForPublishing(post: DailyBibleBingoPost): string[] {
  const problems: string[] = [];

  if (post.lanes.length !== 7) {
    problems.push(`expected 7 lanes, found ${post.lanes.length}`);
  }

  for (const lane of post.lanes) {
    if (!lane.reference) problems.push(`lane ${lane.index} has no reference`);
    if (!lane.passage.text?.trim()) {
      problems.push(`lane ${lane.index} (${lane.reference}) has no verse text`);
    }
  }

  if (post.boardId.split("~").length !== 7) {
    problems.push("board id does not encode 7 passages");
  }

  for (const reference of post.references) {
    if (!post.caption.includes(reference)) {
      problems.push(`caption is missing reference ${reference}`);
    }
  }

  if (!post.caption.startsWith(captionMarkerForDate(post.date))) {
    problems.push("caption is missing its date marker line");
  }

  return problems;
}

export function toDailySocialPost(post: DailyBibleBingoPost): DailySocialPost {
  return {
    brand: CHP_BRAND.brand,
    date: post.date,
    fullDate: post.fullDate,
    timezone: post.timezone,
    version: post.version,
    contentId: post.boardId,
    typeLabel: "Daily Bible Bingo",
    title: post.title,
    caption: post.caption,
    hashtags: post.hashtags,
    imagePath: post.imagePath,
    imageFileName: post.imageFileName,
    pagePath: post.pagePath,
    parityKeys: post.references,
  };
}

export async function findPublishedMediaForDate(
  config: PublishConfig,
  dateKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ id: string; timestamp?: string } | null> {
  return findPublishedMediaForMarker(config, captionMarkerForDate(dateKey), fetchImpl);
}

export async function publishDailyPost(options: {
  dateKey: string;
  dryRun: boolean;
  config?: PublishConfig;
  fetchImpl?: typeof fetch;
  pollDelayMs?: number;
}): Promise<PublishResult> {
  const config = options.config ?? readPublishConfig();
  const post = buildDailyBibleBingoPost(options.dateKey);

  // Brand-specific completeness first — never hand the engine a gutted board.
  const problems = validatePostForPublishing(post);
  if (problems.length) {
    const message = sanitizeForLog(problems.join("; "), config);
    return {
      ok: false,
      date: options.dateKey,
      dryRun: options.dryRun,
      published: false,
      alreadyPublished: false,
      captionVersion: DAILY_BIBLE_BINGO_VERSION,
      imageUrl: "",
      caption: post.caption,
      error: { stage: "validate-card", message },
      steps: [{ step: "validate-card", ok: false, detail: message }],
    };
  }

  return publishDailySocialPost({
    brandConfig: CHP_BRAND,
    post: toDailySocialPost(post),
    dryRun: options.dryRun,
    config,
    fetchImpl: options.fetchImpl,
    pollDelayMs: options.pollDelayMs,
  });
}
