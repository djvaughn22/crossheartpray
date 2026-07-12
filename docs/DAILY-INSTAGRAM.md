# Daily Bible Bingo → Instagram

CrossHeartPray publishes exactly one Daily Bible Bingo post to Instagram each
day. The Instagram bio uses one permanent link — **crossheartpray.com/today** —
which always resolves to the current day's board. Nothing about the bio ever
needs to change.

## How the daily system works

- A "day" begins at **midnight America/Chicago** (the site's existing
  standard). The date key `YYYY-MM-DD` is the deterministic seed.
- `src/lib/dailyBibleBingo.ts` → `buildDailyBibleBingoPost(date)` is the
  **single source of truth**: it selects the same 7 passages the Bible Bingo
  page deals (same seed, same engine, same lane definitions) and derives the
  board id, verse links, image data, and Instagram caption from that one
  object. The page, image, and caption cannot disagree.
- Routes:
  - `/today` — today's board (permanent bio link)
  - `/today/2026-07-12` — permanent dated archive page
  - `/api/social/bible-bingo/2026-07-12.png` — the 1080×1350 Instagram image
    (stable public URL Meta fetches)
  - `/api/social/daily/2026-07-12` — the authoritative JSON object
  - `/api/social/instagram/publish` — protected publish endpoint (cron + admin)
  - `/admin/social?key=…` — preview & approval screen
- First public day: **2026-07-12**. Earlier dates 404.
- Rerunning the same date always produces the same card. To intentionally
  change the rendered image/caption, bump `DAILY_BIBLE_BINGO_VERSION` in
  `src/lib/dailyBibleBingo.ts` (verse selection never changes).

## Meta account prerequisites

1. The CrossHeartPray Instagram account must be a **professional account**
   (Business or Creator).
2. A Meta developer app (developers.facebook.com) owned by DJ / Open Mirror
   LLC, with Instagram content publishing added. Two supported paths — check
   Meta's current docs at implementation time, names shift:
   - **Instagram API with Facebook Login**: IG account linked to a Facebook
     Page; permissions currently named `instagram_basic`,
     `instagram_content_publish`, `pages_read_engagement`. Graph base:
     `https://graph.facebook.com/v23.0` (default).
   - **Instagram API with Instagram Login**: no Facebook Page required;
     permissions currently named `instagram_business_basic`,
     `instagram_business_content_publish`. Graph base:
     `https://graph.instagram.com/v23.0` (set `META_GRAPH_API_BASE`).
3. Generate a **long-lived access token** (≈60 days) for the account and note
   the numeric Instagram account ID. While the app is in Development mode,
   tokens for DJ's own account work fine — full **App Review is only needed
   if other users would ever authorize the app** (they won't; this can run in
   dev mode indefinitely with DJ as an app admin/tester).
4. Long-lived tokens expire — refresh before day 60 (Meta's token debugger
   shows the expiry). Put the new token in Vercel env vars.

## Environment variables

See `.env.example` for the full annotated list. Set real values only in
Vercel → Project Settings → Environment Variables (never commit them):

| Variable | Purpose |
| --- | --- |
| `INSTAGRAM_AUTOPUBLISH_ENABLED` | Emergency pause switch. Cron publishes only when exactly `true`. |
| `INSTAGRAM_ACCOUNT_ID` | Numeric IG professional account id. |
| `META_ACCESS_TOKEN` | Long-lived token with content-publish permission. |
| `META_APP_ID` / `META_APP_SECRET` | App credentials (token generation/refresh). |
| `META_GRAPH_API_BASE` | Optional; defaults to `https://graph.facebook.com/v23.0`. |
| `CRON_SECRET` | Vercel sends `Authorization: Bearer $CRON_SECRET` to the cron endpoint. |
| `INSTAGRAM_PUBLISH_HOUR` | Optional 0–23 America/Chicago gate — only for hourly cron schedules. Leave empty with the default daily cron. |
| `SOCIAL_ADMIN_KEY` | Key for `/admin/social` and manual publish calls. |
| `SITE_BASE_URL` | Optional origin override (defaults to `https://crossheartpray.com`). |
| `SOCIAL_HASHTAGS` | Optional comma-separated hashtag override. |

## Scheduling

`vercel.json` runs the publish endpoint daily at **13:30 UTC** (8:30 am CDT /
7:30 am CST — Vercel cron is UTC and doesn't follow DST, so the Central time
drifts one hour across seasons; adjust the schedule if that matters). The
endpoint is idempotent: it refuses to publish a date that already has a post,
so repeated calls can never duplicate. Duplicate detection uses the Instagram
account itself as the ledger — every caption starts with a unique
`Daily Bible Bingo — <date>` line that the publisher searches for before
posting.

## Testing in dry-run mode

```bash
curl -X POST "https://crossheartpray.com/api/social/instagram/publish?dryRun=1" \
  -H "x-admin-key: $SOCIAL_ADMIN_KEY"
```

Dry run validates the card data, checks credentials, checks for duplicates,
and confirms Meta can fetch the image — then stops. It returns the exact
caption and image URL that a real publish would use. Or press **Dry run** on
`/admin/social?key=…`.

## Publishing today manually

Two options:

- **Hands-on (no Meta setup needed):** open `/admin/social?key=…`, download
  the 1080×1350 image, copy the caption, and post from the Instagram app.
- **Through the API:** press **Publish now / Retry** on the admin screen, or:

```bash
curl -X POST "https://crossheartpray.com/api/social/instagram/publish?force=1" \
  -H "x-admin-key: $SOCIAL_ADMIN_KEY"
```

(`force=1` publishes even while autopublish is paused.)

## Enabling / pausing automatic publishing

- Enable: set `INSTAGRAM_AUTOPUBLISH_ENABLED=true` in Vercel and redeploy
  (env changes need a redeploy to take effect).
- Pause (emergency stop): set it to `false` (or delete it). Cron calls then
  return `skippedReason` and never touch Instagram.

## Retrying a failed day

Publishing is safe to retry — duplicates are impossible. From the admin
screen press **Publish now / Retry**, or:

```bash
curl -X POST "https://crossheartpray.com/api/social/instagram/publish?date=2026-07-12&force=1" \
  -H "x-admin-key: $SOCIAL_ADMIN_KEY"
```

Past days back to 2026-07-12 can be targeted with `date=`. Future dates are
refused.

## Verifying the live post matches /today

1. `/admin/social?key=…` → **Check status** shows the Instagram media id and
   timestamp found for the date.
2. Compare the references in the Instagram caption with
   `crossheartpray.com/api/social/daily/<date>` (`references` field) and the
   `/today/<date>` page — all three come from the same object, and
   `npm test` includes a parity test that enforces it.

## Tests

`npm test` (vitest) covers date boundaries (CDT/CST midnight), date-key
validation, deterministic board generation, empty-card protection,
caption/board/archive parity, missing-credential behavior, duplicate refusal,
dry-run behavior, the full publish flow, sanitized error output, and the
non-HTTPS image guard.
