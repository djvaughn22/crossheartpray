# Bible Bingo 7 Email Subscriptions

Emails readers seven Bible Reading Plan cards at a time and opens those
exact cards inside the existing Bible Bingo 7 page (`/explorebible`).
No separate email product page exists.

## How it works

- Signup lives on `/explorebible` and `/bible-reading-plan` (Weekly is the
  recommended default; Daily moves through the plan in ~52 days).
- Each subscriber gets a randomized journey through all 364 plan readings,
  derived from a stored seed: lanes (Sunday–Saturday) are shuffled
  independently, so every set of seven has one card per bingo lane —
  52 sets cover the whole plan with no repeats.
- Every email's seven cards are saved as a batch with a secure token.
  `/explorebible?batch=TOKEN` renders that exact batch — refresh and other
  devices always show the same cards. Reading ids are the plan's own
  checklist ids (`week-12-friday`), and each card deep-links into the
  existing Bible Reading Plan cell.
- Manage page: `/bible-bingo/manage?token=MANAGE_TOKEN` (from every email's
  footer). Weekly↔Daily, pause, resume, unsubscribe, fresh journey.
  Cadence changes never reshuffle or reset progress.
- Delivery: one Vercel cron (`/api/bingo-email/send`, daily 13:00 UTC,
  `Authorization: Bearer $CRON_SECRET` — same model as the Instagram
  publisher; SOCIAL_ADMIN_KEY also works for manual runs). Batches are
  idempotency-keyed: duplicate runs can't double-send, and a failed send
  retries the SAME batch next run.

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
HTML (`&format=text` for the plain-text part, `&set=N` for a later set).
In local dev it needs no key, and a demo batch is seeded:
`/explorebible?batch=demo-batch-token-000000` and
`/bible-bingo/manage?token=demo-manage-token-000000`.

## Tests

`npm test` — see `src/lib/__tests__/bingoEmail*.test.ts` (journey
determinism, no-repeat coverage, cadence, idempotency/retry, template
rendering, route auth). No live email or database is touched in tests.
