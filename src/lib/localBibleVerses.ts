// The active local Scripture dataset — every feature that renders verse text
// (chapter API, Bible Bingo pools, Daily Hope, Explore Bible) imports from
// here and automatically follows the site-wide translation chosen in
// src/lib/scripture/translationConfig.ts.
//
// Every condition is deliberately a bare `process.env` string comparison so
// the bundler can fold the chain to a constant at build time and drop the
// inactive ~9 MB datasets from every bundle. Never wrap these in a helper.
// next.config.ts inlines BIBLE_TRANSLATION pre-normalized through
// parseConfiguredTranslation, so the value here is always exactly a registry
// key and this chain agrees with translationConfig — translationConfig.test.ts
// locks the two together for every supported translation.
//
// This is the SITE-WIDE default only. The in-app reader serves any supported
// translation through /api/scripture/chapter, which reads them all
// server-side (src/lib/scripture/localDatasets.ts).

import { BSB_BIBLE_VERSES } from "./bibleText/bsbBibleVerses";
import { KJV_BIBLE_VERSES } from "./bibleText/kjvBibleVerses";
import { WEBUS_BIBLE_VERSES } from "./bibleText/webusBibleVerses";

export type { LocalBibleVerse } from "./bibleText/types";

export const LOCAL_BIBLE_VERSES =
  process.env.BIBLE_TRANSLATION === "WEBUS"
    ? WEBUS_BIBLE_VERSES
    : process.env.BIBLE_TRANSLATION === "KJV"
      ? KJV_BIBLE_VERSES
      : BSB_BIBLE_VERSES;
