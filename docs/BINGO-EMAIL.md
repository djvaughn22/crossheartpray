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

## Setup (owner)

1. Create a Neon Postgres database and set `DATABASE_URL` in Vercel.
   Tables (`bingo_email_*`) are created automatically on first use.
2. Set `RESEND_API_KEY` and `BINGO_EMAIL_FROM` (verified sender on a
   crossheartpray.com domain in Resend).
3. Until both are set, signup fails closed with a friendly "not available
   yet" message and the cron reports `not-configured` — nothing breaks.

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
