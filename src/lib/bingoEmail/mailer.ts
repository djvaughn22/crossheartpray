// Minimal server-side email provider adapter (Resend-compatible REST call).
// The API key never leaves the server: no NEXT_PUBLIC_ prefix, no client
// import path reaches this file. Recipient addresses are never logged.

export type BingoEmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
};

export type BingoEmailSender = (message: BingoEmailMessage) => Promise<void>;

// Replies go to the official mailbox (Microsoft/GoDaddy receives them
// normally there). Resend is OUTBOUND-ONLY: no inbound receiving, no reply
// webhooks, no MX involvement — this application never handles incoming
// mail or forwarding.
export const BINGO_EMAIL_DEFAULT_REPLY_TO = "hi@crossheartpray.com";

export function getBingoEmailReplyTo() {
  return process.env.BINGO_EMAIL_REPLY_TO?.trim() || BINGO_EMAIL_DEFAULT_REPLY_TO;
}

/**
 * The configured sender, or null when RESEND_API_KEY / BINGO_EMAIL_FROM are
 * absent (signup fails closed rather than silently dropping email).
 */
export function getBingoEmailSender(): BingoEmailSender | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.BINGO_EMAIL_FROM?.trim();

  if (!apiKey || !from) return null;

  const replyTo = getBingoEmailReplyTo();

  return async function sendViaResend(message) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        reply_to: [replyTo],
        subject: message.subject,
        html: message.html,
        text: message.text,
        headers: message.headers,
      }),
    });

    if (!response.ok) {
      // Provider error bodies can echo the recipient — do not log them.
      throw new Error(`bingo-email: provider responded ${response.status}`);
    }
  };
}
