// Shared wiring for the Bible Bingo 7 email routes: real store + sender +
// site base URL. Returns null when this deployment is not configured for
// durable email signups — callers fail closed with a clear message.

import { getBingoEmailSender } from "../../../lib/bingoEmail/mailer";
import { getBingoEmailStore } from "../../../lib/bingoEmail/store";
import {
  createBingoEmailService,
  type BingoEmailService,
} from "../../../lib/bingoEmail/service";

export function bingoEmailBaseUrl() {
  return (process.env.SITE_BASE_URL?.trim() || "https://crossheartpray.com").replace(
    /\/$/,
    "",
  );
}

/** Service with a working sender — required for signup and cron sends. */
export async function getBingoEmailServiceWithSender(): Promise<BingoEmailService | null> {
  const store = await getBingoEmailStore();
  const sendEmail = getBingoEmailSender();
  if (!store || !sendEmail) return null;
  return createBingoEmailService({ store, sendEmail, baseUrl: bingoEmailBaseUrl() });
}

/**
 * Service for read/manage endpoints — needs storage but not a sender, so
 * batch links and manage links keep working even if the provider is down.
 */
export async function getBingoEmailServiceReadOnly(): Promise<BingoEmailService | null> {
  const store = await getBingoEmailStore();
  if (!store) return null;
  const sendEmail =
    getBingoEmailSender() ??
    (async () => {
      throw new Error("bingo-email: no email provider configured");
    });
  return createBingoEmailService({ store, sendEmail, baseUrl: bingoEmailBaseUrl() });
}

export const BINGO_EMAIL_PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

export const BINGO_EMAIL_UNAVAILABLE_MESSAGE =
  "Email signup isn't available yet. Please check back soon.";
