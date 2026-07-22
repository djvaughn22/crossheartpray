# YouVersion Platform — hybrid Scripture architecture

_Last verified against the live API: July 21, 2026_

CrossHeartPray uses a hybrid Scripture architecture: the local public-domain
World English Bible is the fast, always-available foundation; the YouVersion
Platform is the enhanced reading layer for translations the application is
genuinely licensed for. Licensed text is never copied into the local dataset
or persisted; every feature goes through the shared Scripture system
(`src/lib/scripture`, `src/components/scripture`).

## CURRENT STATE (verified live, July 21, 2026)

The owner's real App Key is configured as **`YVP_APP_KEY`** in `.env.local`
and in Vercel (Development, Preview, Production). It is a **server-side**
credential here:

- The official REST API (`https://api.youversion.com/v1`, header
  `X-YVP-App-Key`) is called only from API routes via
  `src/lib/youversionPlatform.ts`.
- The key never appears in a client bundle, log, or test snapshot.
  `scriptureProvider.test.ts` bans it from all client Scripture code.
- The official React SDK (`@youversion/platform-react-ui`) is NOT installed —
  it would require handing the key to client code, and the REST API covers
  everything this site needs (version list + chapter passages).

### What the key is licensed for (live `/v1/bibles` response)

11 English versions, all public-domain/freely licensed: WEB (206, served
locally instead), BSB, ASV, LSV, FBV, Geneva (enggnv), WMB, WMBBE, TCENT
(NT only), CPDV, TOJB2011.

**CSB (1713), KJV (1), and NIV (111) are NOT licensed to this application**
— the API answers 403 for them (verified July 21, 2026). They are offered as
external Bible.com links only and are never rendered in-app. The default
in-app translation is therefore local WEB, not CSB.

### Endpoints used

- `GET /v1/bibles?language_ranges[]=en` — the licensed-version list. This is
  the licensing gate: nothing outside this list is ever proxied.
- `GET /v1/bibles/{id}/passages/{BOOK}.{chapter}?format=html` — chapter text
  with verse markers (`span.yv-v`), parsed server-side into verse-numbered
  text. The API itself replies `cache-control: public, max-age=86400`, so the
  proxy's in-memory caches and CDN headers stay within that policy.

### Server proxy routes

- `GET /api/scripture/translations` — truthful capability list: local WEB
  (readHere), licensed YouVersion versions (readHere), well-known external
  translations (bibleComLink). Falls back to local + external when the key or
  platform is unavailable — the reader never breaks.
- `GET /api/scripture/chapter?book=JHN&chapter=3[&version=3034]` — local WEB
  by default; a licensed YouVersion version when requested. Failures return
  an error status and the client reader falls back to local WEB, keeping the
  external Bible.com option. No dead ends.

## HOW CSB / KJV / NIV BECOME READABLE IN-APP (owner action)

1. In platform.youversion.com → Developer Dashboard, request licensing for
   the wanted translations (YouVersion's "fast-track Bible licensing") and
   complete whatever approval/"Make Live" step the dashboard requires.
2. No code change is needed: once the platform includes a version in
   `/v1/bibles` for this app, it appears in the picker as "read here", CSB
   becomes the preferred default for new visitors
   (`pickDefaultTranslation`), and attribution comes from the version's
   `copyright` field automatically.
3. After granting, verify on the live site: the version reads in-app, the
   attribution line names it, and unlicensed versions still open externally.

## READER PRIORITY (implemented and test-locked)

1. Licensed YouVersion translation, when selected and available.
2. Local WEB (also the visible fallback when YouVersion fails — the reader
   says so plainly and never mislabels WEB as another translation).
3. Bible.com deep link when both fail.

User translation choice persists in localStorage
(`crossheartpray:scripture:translation:v1`) — no account required.
