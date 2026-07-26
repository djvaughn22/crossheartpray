// The active local Scripture dataset — every feature that renders verse text
// (chapter API, Bible Bingo pools, Daily Hope, Explore Bible) imports from
// here and automatically follows the site-wide translation chosen in
// src/lib/scripture/translationConfig.ts.
//
// The condition is deliberately one bare `process.env` string comparison so
// the bundler can fold it to a constant at build time and drop the inactive
// ~9 MB dataset from every bundle. next.config.ts inlines BIBLE_TRANSLATION
// pre-normalized through parseConfiguredTranslation, so the value here is
// always exactly "BSB" or "WEBUS" and this check agrees with
// translationConfig — translationDataset.test.ts locks the two together.

import { BSB_BIBLE_VERSES } from "./bibleText/bsbBibleVerses";
import { WEBUS_BIBLE_VERSES } from "./bibleText/webusBibleVerses";

export type { LocalBibleVerse } from "./bibleText/types";

export const LOCAL_BIBLE_VERSES =
  process.env.BIBLE_TRANSLATION === "WEBUS"
    ? WEBUS_BIBLE_VERSES
    : BSB_BIBLE_VERSES;
