// Daily Bible Bingo Instagram image.
//
// GET /api/social/bible-bingo/2026-07-12.png  →  1080×1350 PNG (4:5)
//
// This is the stable public HTTPS URL Meta fetches when publishing, and the
// URL behind the "Download today's card" button. The image is rendered
// deterministically from buildDailyBibleBingoPost(date): the same date always
// produces the same card unless DAILY_BIBLE_BINGO_VERSION is bumped.

import { ImageResponse } from "next/og";
import {
  buildDailyBibleBingoPost,
  DAILY_BIBLE_BINGO_START_DATE,
  DAILY_BIBLE_BINGO_VERSION,
  isValidDateKey,
} from "../../../../../lib/dailyBibleBingo";

export const dynamic = "force-dynamic";

const WIDTH = 1080;
const HEIGHT = 1350;

// Larger verses get smaller type; very long verses are cut at a word
// boundary so the layout can never overflow. No text below 24px.
function fitVerse(text: string) {
  const trimmed = text.trim();

  if (trimmed.length <= 150) return { text: trimmed, fontSize: 40 };
  if (trimmed.length <= 270) return { text: trimmed, fontSize: 34 };
  if (trimmed.length <= 420) return { text: trimmed, fontSize: 28 };

  const cut = trimmed.slice(0, 420);
  const lastSpace = cut.lastIndexOf(" ");
  return {
    text: `${cut.slice(0, lastSpace > 0 ? lastSpace : 420)} …`,
    fontSize: 28,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ image: string }> },
) {
  const { image } = await params;
  const dateKey = image.replace(/\.png$/i, "");

  if (!isValidDateKey(dateKey) || dateKey < DAILY_BIBLE_BINGO_START_DATE) {
    return new Response("Not found", { status: 404 });
  }

  const post = buildDailyBibleBingoPost(dateKey);
  const featured = post.lanes[post.featuredLaneIndex];
  const others = post.lanes.filter((lane) => !lane.isFeatured);
  const verse = fitVerse(featured.passage.text);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #052e26 0%, #0b1220 50%, #3f0d1d 100%)",
          padding: 40,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flexGrow: 1,
            border: "3px solid rgba(255,255,255,0.14)",
            borderRadius: 44,
            padding: "44px 52px 36px",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", gap: 36, fontSize: 58 }}>
              <span>✝️</span>
              <span>❤️</span>
              <span>🙏</span>
            </div>
            <div
              style={{
                marginTop: 22,
                fontSize: 27,
                letterSpacing: 7,
                color: "#a7f3d0",
              }}
            >
              DAILY BIBLE BINGO
            </div>
            <div
              style={{
                marginTop: 12,
                fontSize: 52,
                color: "#ffffff",
                textAlign: "center",
              }}
            >
              {post.fullDate}
            </div>
          </div>

          {/* Featured lane */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.28)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 32,
              padding: "30px 40px",
              marginTop: 28,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                fontSize: 26,
                letterSpacing: 4,
                color: "#a7f3d0",
              }}
            >
              <span>{featured.section.emoji}</span>
              <span>{`${featured.dayLabel.toUpperCase()} · ${featured.laneTitle.toUpperCase()}`}</span>
            </div>
            <div style={{ marginTop: 14, fontSize: 46, color: "#ffffff" }}>
              {featured.reference}
            </div>
            <div
              style={{
                marginTop: 16,
                fontSize: verse.fontSize,
                lineHeight: 1.35,
                color: "#f1f5f9",
                textAlign: "center",
              }}
            >
              {verse.text}
            </div>
          </div>

          {/* Remaining six lanes */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              marginTop: 28,
            }}
          >
            {others.map((lane) => (
              <div
                key={lane.section.title}
                style={{
                  display: "flex",
                  alignItems: "center",
                  width: "50%",
                  padding: "12px 10px",
                }}
              >
                <div style={{ display: "flex", fontSize: 34 }}>
                  {lane.section.emoji}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    marginLeft: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 19,
                      letterSpacing: 3,
                      color: "#a7f3d0",
                    }}
                  >
                    {`${lane.dayLabel.toUpperCase()} · ${lane.laneTitle.toUpperCase()}`}
                  </div>
                  <div style={{ fontSize: 31, color: "#ffffff" }}>
                    {lane.reference}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: 26,
              fontSize: 26,
              letterSpacing: 4,
              color: "rgba(255,255,255,0.6)",
            }}
          >
            CROSSHEARTPRAY.COM/TODAY
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      emoji: "twemoji",
      headers: {
        // Per-date content is immutable for a given version; short client
        // cache + long CDN cache keeps regeneration cheap without staleness.
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        "X-Daily-Bingo-Version": String(DAILY_BIBLE_BINGO_VERSION),
      },
    },
  );
}
