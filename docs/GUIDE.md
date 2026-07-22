# The Guide (/guide) — status and rollback

One optional, independent guided page that helps a visitor find a safe place
to begin, using verified local Scripture (World English Bible) and existing
CrossHeartPray resources only. Nothing on the page is model-generated: the
optional "Tell the guide" sentence is classified into the same button choices
a visitor could tap, then discarded.

Baseline rollback tag: `before-guide-preview-20260722-1752` (commit `cf7b9b6`).
Feature branch: `feature/guide-preview`.

## Environment variables (all server-side)

| Variable | Values | Default |
| --- | --- | --- |
| `CROSSHEARTPRAY_GUIDE_ACCESS_MODE` | `off` / `preview` / `subscriber` | `preview` (invalid values fail safe to `off`) |
| `CROSSHEARTPRAY_GUIDE_AI_ENABLED` | `true` / `false` | `false` (AI is opt-in) |
| `CROSSHEARTPRAY_GUIDE_DAILY_ANONYMOUS_LIMIT` | integer | `5` |
| `CROSSHEARTPRAY_GUIDE_DAILY_ACCOUNT_LIMIT` | integer | `20` |
| `OPENAI_MODEL` | model id | `gpt-5.4-nano` |
| `OPENAI_API_KEY` | server secret | unset — page works fully without it |
| `OPEN_MIRROR_ENTITLEMENT_URL` | future shared entitlement service | unset — no network call is made |
| `OPEN_MIRROR_ACCOUNT_URL` | future account-management link | unset — subscriber message shows no link |
| `CROSSHEARTPRAY_GUIDE_RATE_SALT` | optional stable hash salt | random per instance |

`OPENAI_API_KEY` is never exposed to the browser and never logged. Visitor
text is parsed in memory only; prayer text never leaves the device.

## Rollback ladder (least to most)

1. **Disable AI only** — set `CROSSHEARTPRAY_GUIDE_AI_ENABLED=false` (or
   remove `OPENAI_API_KEY`) and redeploy. The full deterministic guide keeps
   working; the "Tell the guide" field disappears; `/api/guide/intent`
   answers 200 with no model call.
2. **Disable the whole guide** — set `CROSSHEARTPRAY_GUIDE_ACCESS_MODE=off`
   and redeploy. `/guide` returns 404, the homepage entry line disappears,
   and CrossHeartPray looks and works exactly as before.
3. **Revert the commits** — the feature is additive; revert the guide commits
   in reverse order:
   ```
   git revert <newest-guide-commit>..<oldest-guide-commit>
   ```
   or revert each SHA listed in `git log --oneline cf7b9b6..` individually.
4. **Restore from the baseline tag** —
   ```
   git checkout main
   git reset --hard before-guide-preview-20260722-1752
   git push --force-with-lease origin main   # only if already pushed
   ```
5. **Data cleanup** — none required. The feature adds no database, no
   migration, and no server-side storage. The only stored data is the
   visitor's own prayer draft in their browser's localStorage
   (`chp-guide-prayer`), which the page's "Clear this prayer" button removes.

## Proof with the guide disabled

With `CROSSHEARTPRAY_GUIDE_ACCESS_MODE=off`, `next build` still passes and
all existing routes (`/`, `/daily-hope`, `/bible-reading-plan`,
`/life-essentials`, `/explorebible`, `/about`, `/today`) render unchanged;
the homepage renders without the entry line. Covered by the existing test
suite plus `guideAccess.test.ts` (off-mode decisions) and verified against a
production build during development.

## Future subscriber mode

`open_mirror_apps_monthly` exists only as inactive internal metadata in
`src/lib/guide/featureAccess.ts`. It is never displayed. If subscriber mode
is turned on, visitors see one restrained access-state message; account
management happens at `OPEN_MIRROR_ACCOUNT_URL`, never on CrossHeartPray.
No payment path of any kind exists in this repository.
