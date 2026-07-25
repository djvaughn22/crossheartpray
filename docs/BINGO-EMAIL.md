# Bible Bingo Email Subscriptions

Emails readers the 52-week Bible Reading Plan: Weekly delivers all seven
readings for the plan week together (opened as a board on the existing
Bible Bingo 7 page), Daily delivers one reading each day (opened at the
exact cell on the existing Bible Reading Plan page). No separate email
product page exists.

## How it works

- Signup lives on `/explorebible` and `/bible-reading-plan`. Weekly is the
  recommended default (seven readings each week); Daily sends one reading
  each day and finishes the plan in 364 daily readings — 52 weeks.
- The journey follows the CANONICAL plan order — Week 1 → Week 52, no
  randomization. Within each week the seven weekday readings rotate to the
  weekday the journey began on (recorded at the first send,
  America/Chicago): a Wednesday start reads Week 1 Wed→Thu→Fri→Sat→Sun→
  Mon→Tue, then Week 2 Wednesday. All 364 readings, exactly once. Both
  cadences share this one order and one position, so switching Weekly↔Daily
  never duplicates, skips, or resets anything. After a pause, the journey
  resumes at the next unfinished reading in the same rotation — complete
  plan coverage is preserved even if calendar weekdays have drifted.
- Every email's readings are saved as a batch with a secure token
  (7 readings for Weekly, 1 for Daily). Weekly's button opens
  `/explorebible?batch=TOKEN` — the exact emailed board. Daily's button
  opens the exact plan cell:
  `/bible-reading-plan?week=N&day=slug&bingoBatch=TOKEN#week-N-slug` — the
  plan page syncs that batch's completion server-side and shows a small
  manage-email note. Reading ids are the plan's own checklist ids.
- Manage page: `/bible-bingo/manage?token=MANAGE_TOKEN` (from every email's
  footer). Weekly↔Daily, pause, resume, unsubscribe, fresh journey.
- Delivery: one Vercel cron (`/api/bingo-email/send`, daily 13:00 UTC,
  `Authorization: Bearer $CRON_SECRET` — same model as the Instagram
  publisher; SOCIAL_ADMIN_KEY also works for manual runs). Batches are
  keyed by journey position: duplicate runs can't double-send, and a failed
  send retries the SAME saved batch — it never advances the journey or
  picks a different reading.

## Email identity (official)

The official CrossHeartPray mailbox is `hi@crossheartpray.com`
(Microsoft 365 via GoDaddy). All Bible Bingo 7 email uses it:

- From: `CrossHeartPray <hi@crossheartpray.com>` (`BINGO_EMAIL_FROM`)
- Reply-To on every message: `hi@crossheartpray.com` (`BINGO_EMAIL_REPLY_TO`)
- Subscriber support / manual test recipient: `hi@crossheartpray.com`

Resend is **outbound-only**. Replies go to `hi@crossheartpray.com`, where
Microsoft/GoDaddy receives (and forwards) them exactly as it does today —
the application implements no receiving, no forwarding, no reply webhooks,
and stores no forwarding destination anywhere.

## Environment variables (Vercel, production)

| Variable | Status | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | **Newly required** | Neon Postgres; `bingo_email_*` tables auto-create on first use. Without it, signup fails closed. |
| `RESEND_API_KEY` | **Newly required** | Outbound sending only. Without it, signup fails closed. |
| `BINGO_EMAIL_FROM` | **Newly required** | `CrossHeartPray <hi@crossheartpray.com>` |
| `BINGO_EMAIL_REPLY_TO` | Optional (recommended) | Defaults to `hi@crossheartpray.com` in code; set it anyway to be explicit. |
| `CRON_SECRET` | Already set in CHP | Authenticates the Vercel cron (shared with the Instagram publisher). |
| `SOCIAL_ADMIN_KEY` | Already set in CHP | Optional here: manual cron trigger + email preview. |
| `SITE_BASE_URL` | Already set in CHP (optional) | Base for links in emails; defaults to `https://crossheartpray.com`. |

No other secrets exist for this feature — batch and manage tokens are
random values stored in the database, not signed, so there is no signing
key.

## DNS safety (do this exactly)

1. Add `crossheartpray.com` to Resend for **outbound sending** only.
2. Add only the exact outbound verification records Resend shows for this
   account (do not copy values from anywhere else, including this repo —
   none are recorded here on purpose).
3. Do NOT enable Resend Receiving / inbound.
4. Do NOT delete or replace the existing Microsoft 365 MX records.
5. Do NOT create a second SPF TXT record on the same hostname — if Resend's
   SPF target must live where an SPF record already exists, merge it into
   the one existing record. (Resend normally scopes SPF to its own `send.`
   subdomain, which avoids this entirely.)
6. Preserve Microsoft 365 authentication records (SPF/DKIM/DMARC).
7. Afterwards, verify BOTH still pass SPF/DKIM/DMARC: send a normal mail
   from the Microsoft mailbox and a Bible Bingo 7 test to
   `hi@crossheartpray.com`, and check the received headers.

Until `DATABASE_URL`, `RESEND_API_KEY`, and `BINGO_EMAIL_FROM` are set,
signup fails closed with a friendly "not available yet" message and the
cron reports `not-configured` — nothing breaks.

## Preview without sending

`/api/bingo-email/preview?key=$SOCIAL_ADMIN_KEY` renders the exact email
HTML (`&format=text` for the plain-text part, `&set=N` for a later weekly
set, `&cadence=daily&day=N` for the one-card daily email, `&start=wednesday`
to preview a different start weekday).
In local dev it needs no key, and a demo batch is seeded:
`/explorebible?batch=demo-batch-token-000000` and
`/bible-bingo/manage?token=demo-manage-token-000000`.

## Tests

`npm test` — see `src/lib/__tests__/bingoEmail*.test.ts` (journey
determinism, no-repeat coverage, cadence, idempotency/retry, template
rendering, route auth). No live email or database is touched in tests.
