// The one AI endpoint for the guide. Every guard runs server-side and in
// order — a request that fails any of them never reaches OpenAI:
//   1. Feature access (CROSSHEARTPRAY_GUIDE_ACCESS_MODE)
//   2. AI switch (CROSSHEARTPRAY_GUIDE_AI_ENABLED) + API key present
//   3. Rate limit + daily quota (salted-hash visitor key, no raw IPs stored)
//   4. Input validation (type + 300-char cap)
//   5. Crisis-language safety routing (no model call, ever)
// The client treats every non-OK response the same way: fall back to the
// deterministic guide. The visitor's text is parsed in memory and never
// stored or logged.

import { NextRequest, NextResponse } from "next/server";
import { canAccessFeature, isAiEnabled } from "../../../../lib/guide/featureAccess";
import { anonymousKey, checkRateLimit } from "../../../../lib/guide/guideRateLimit";
import {
  MAX_INPUT_CHARS,
  parseGuideIntentWithAi,
  validateInput,
} from "../../../../lib/guide/guideIntent";
import { detectCrisisLanguage } from "../../../../lib/guide/guideSafety";

export async function POST(request: NextRequest) {
  const access = await canAccessFeature({ featureKey: "crossheartpray_guide" });
  if (!access.allowed) {
    return NextResponse.json(
      { error: "Feature not available", intent: null },
      { status: 403 },
    );
  }

  if (!isAiEnabled("crossheartpray_guide") || !process.env.OPENAI_API_KEY) {
    // AI off (or unconfigured) is a normal state, not an error — the
    // deterministic guide is the complete product either way.
    return NextResponse.json({ intent: null, aiEnabled: false }, { status: 200 });
  }

  const key = anonymousKey(request.headers.get("x-forwarded-for"));
  const rate = checkRateLimit(key);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit reached", intent: null },
      { status: 429 },
    );
  }

  let userText: unknown;
  try {
    ({ userText } = await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", intent: null },
      { status: 400 },
    );
  }

  if (!validateInput(userText)) {
    return NextResponse.json(
      { error: `userText must be 1–${MAX_INPUT_CHARS} characters`, intent: null },
      { status: 400 },
    );
  }

  // Safety routing happens before any model call and instead of one.
  if (detectCrisisLanguage(userText)) {
    return NextResponse.json({ intent: null, safety: true }, { status: 200 });
  }

  const intent = await parseGuideIntentWithAi(userText);
  // intent === null means the parser fell back — still a 200; the client
  // proceeds deterministically.
  return NextResponse.json({ intent });
}
