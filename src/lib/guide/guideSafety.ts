// Simple, tested safety routing for the guide's one free-text field.
//
// If a visitor's words suggest immediate danger, self-harm, abuse, or a
// medical emergency, the guide does not send the text to any model and does
// not attempt counseling. It shows one brief, compassionate message that
// points to real help. A keyword check is deliberately simple — the model is
// never made responsible for deciding whether a person is safe.

const CRISIS_PATTERNS: RegExp[] = [
  /suicid/i,
  /kill (myself|me|him|her|them)/i,
  /end (my|his|her|their) life/i,
  /take my (own )?life/i,
  /self[- ]?harm/i,
  /hurt (myself|me)/i,
  /cutting myself/i,
  /overdose/i,
  /don'?t want to (live|be alive|wake up)/i,
  /want to die/i,
  /being abused/i,
  /abusing me/i,
  /\b(hits?|hitting|beats?|beating) me\b/i,
  /afraid of (him|her|them) hurting/i,
  /domestic violence/i,
  /medical emergency/i,
  /can'?t breathe/i,
  /heart attack/i,
];

export function detectCrisisLanguage(text: string): boolean {
  if (!text) return false;
  return CRISIS_PATTERNS.some((pattern) => pattern.test(text));
}

// One calm message, shown in place of any guide result. Wording keeps to
// facts and care — no judgment, no counseling, no theology.
export const CRISIS_SUPPORT_MESSAGE = {
  heading: "Please reach out for immediate help",
  body:
    "This guide is a simple way to find a place to read and pray — it is not able to help in an emergency. If you or someone near you is in danger or crisis, please contact your local emergency services right now. In the United States you can call or text 988 (Suicide & Crisis Lifeline) any time, or call 911. You matter, and real people are ready to help.",
} as const;
