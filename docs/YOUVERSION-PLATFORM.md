# YouVersion Platform — hybrid Scripture architecture

_Last checked: July 21, 2026_

CrossHeartPray uses a hybrid Scripture architecture: the local public-domain
World English Bible is the fast, reliable foundation; the YouVersion Platform
becomes the preferred enhanced reading layer once the owner configures a real
App Key. Licensed translations are never copied into the local dataset or
cached in ways YouVersion does not permit. Every feature goes through the
shared Scripture system (`src/lib/scripture`, `src/components/scripture`).

Background: CrossHeartPray never had a YouVersion App Key — plain
`bible.com/bible/206/...` web links never needed one. Nothing here has ever
called a YouVersion API.

## CURRENTLY WORKING (no key, $0, license-clean)

- **Local WEB reader** — `ScriptureReader` on /explorebible reads any chapter
  in-app from `/api/scripture/chapter` (local WEB text, a few KB per chapter,
  hard-cached). Previous/Next walks the whole canon.
- **Autocomplete** — `ScriptureReferenceInput` suggests as you type
  ("John 3", "II Tim", "1 pe"), full keyboard + touch + ARIA combobox.
- **Structured references** — `ScriptureReference` objects everywhere; no
  raw string parsing in features. `toUsfmString()` emits the same USFM the
  YouVersion SDK consumes (`JHN.3.16`).
- **Chapter navigation** — `adjacentChapter()` crosses book boundaries
  (Malachi 4 → Matthew 1).
- **Centralized Bible.com links** — every deep link flows through
  `bibleComUrl` / `bibleComUrlForPassage`. No page keeps its own book table
  or URL builder. (One deliberate exception: `bibleReadingPlan.ts` keeps its
  reading-plan *range* parser — "Genesis 1-11"-style plan strings are a
  different grammar, and its behavior is locked by its own tests.)
- **External translation links** — `TranslationPicker` offers WEB
  ("read here") plus KJV/NIV/ESV/NLT explicitly labeled "on Bible.com".
  Licensed text is never rendered locally.
- **Fallback behavior** — if a chapter fetch fails, the reader shows a
  Bible.com deep link for the same chapter. No dead ends.

Provider boundary (`src/lib/scripture/provider.ts`): components call a
`ScriptureProvider` interface (`resolveReference`, `suggestReferences`,
`loadChapter`, `buildExternalUrl`, `listAvailableTranslations`,
`determineReaderCapability`). `getScriptureProvider()` picks
youVersion → localWeb by priority; `externalLinkFallbackProvider` covers
failures. Today it always returns localWeb.

## OWNER ACTION REQUIRED (only DJ can do these)

1. Create (or access) the developer account at **platform.youversion.com**
   as Open Mirror LLC — free.
2. Review and accept the current YouVersion Platform Terms of Use.
3. Register CrossHeartPray as an app in the Developer Dashboard.
4. Copy the **App Key**. If Sign in with YouVersion is ever wanted, also add
   `https://crossheartpray.com` (and preview origins) to the Callback URI
   list — not needed for Bible reading only.
5. Add the key locally in `.env.local` and in Vercel → crossheartpray →
   Settings → Environment Variables:
   `NEXT_PUBLIC_YOUVERSION_APP_KEY=<the key>`
   The official React SDK receives the App Key in client code
   (`<YouVersionProvider appKey={...}>` — developers.youversion.com/sdks/react),
   so client visibility is the documented contract; it is a public
   identifier, not a server secret. Never commit it.
6. Redeploy (any push to main, or a Vercel redeploy).
7. After the SDK work lands (below), verify on the live site: attribution
   shows for every licensed translation, and only permitted translations are
   readable in-app.

## FUTURE IMPLEMENTATION (after the key exists)

1. `npm install @youversion/platform-react-ui` (React ≥ 19.1 required — we
   run 19.2.4).
2. Implement the youVersion `ScriptureProvider` and flip
   `YOUVERSION_SDK_INSTALLED` in `src/lib/scripture/provider.ts`; wrap
   Scripture surfaces in `<YouVersionProvider>`.
3. Swap `ScriptureReader`'s body for `BibleReader.Root` when the provider
   reports YouVersion capability; mark permitted translations `readHere` in
   `listAvailableTranslations` so `TranslationPicker` upgrades itself.
4. Retain the local WEB reader as the automatic fallback whenever the key,
   network, or a licensed translation is unavailable.
5. Before release, verify licensing: attribution rendered for every
   version (`BibleCard` automatic; `BibleTextView` manual via
   `version.copyright`), SDK usage reporting untouched, no YouVersion marks
   in our UI, no AI features over Platform content.

SDK references: React docs at developers.youversion.com/sdks/react ·
source at github.com/youversion/platform-sdk-react · components:
`BibleReader`, `BibleCard`, `BibleTextView`, `VerseOfTheDay`,
`BibleChapterPicker`, `BibleVersionPicker`, `YouVersionAuthButton`.
