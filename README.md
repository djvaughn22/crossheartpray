# CrossHeartPray (crossheartpray.com)

Scripture-first daily faith site: Bible verses, prayer, Daily Hope, Bible Bingo, the 52-week Bible Reading Plan, and Life Essentials. The Bible is the destination.

## Repo map

- **Production:** https://crossheartpray.com — branch `main`, auto-deploys on push (Vercel).
- **Framework:** Next.js 16.2.6 (App Router). Build: `npm run build`. Tests: `npm test` (vitest, `src/lib/__tests__/`).
- **Routes:** `/`, `/about`, `/cross`, `/heart`, `/pray`, `/daily-hope`, `/bible-reading-plan`, `/bible-bingo/[boardId]`, `/explorebible`, `/life-essentials`, `/today`, `/today/[date]`, `/admin/social`.
- **Family chrome:** `src/components/OpenMirrorNav.tsx` / `OpenMirrorFooter.tsx` / `OpenMirrorTheme.tsx` are synced copies — canonical source is the hub repo `packages/openmirror-ui/` + `scripts/sync-ui.sh`. Never edit the local copies. CHP keeps its own `SiteHeader` + `ChpProductNav` below the family bar.
- **Theme:** head script in `src/app/layout.tsx` applies the saved theme (and `?theme=` overrides) before paint; family toggle uses the `om-theme` + `crossheartpray-visual-theme` keys.
- **Persistence (localStorage):** `crossheartpray:bible-reading-plan:v1` (Reading Plan progress).
- **Reusable checklist mechanics:** `src/lib/checklistProgress.ts` — generic load/save/toggle/stats extracted from the Reading Plan; covered by tests. Other products copy this file and use their own `product:feature:vN` key. See hub `docs/OPEN_MIRROR_PATTERNS.md`.
- **Env vars (names only):** `SITE_BASE_URL`, `SOCIAL_ADMIN_KEY`, `SOCIAL_HASHTAGS`, `CRON_SECRET`.
- **External services:** bible.com (WEBUS links), YouTube (Gene Getz Life Essentials), GA4.
- **Protected:** all Scripture content, doctrine, memorial content, approved wording, page order, routes, the Reading Plan's public behavior and visuals. Code quality may improve around the product; the product itself is locked.
- **Content sources of truth:** `src/lib/dailyBibleBingo.ts`, `src/lib/bibleReadingPlan.ts`, `src/lib/geneGetzLifeEssentials.ts`.
