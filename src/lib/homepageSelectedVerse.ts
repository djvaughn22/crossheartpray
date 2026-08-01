// Shared selected verse for the homepage.
//
// The homepage features a connected experience where the displayed verse,
// Behind the Verse, Life Essentials, and Deep Dive all pull from one source.
// Change HOMEPAGE_SELECTED_VERSE_REFERENCE here to update all homepage features.
// In the future, a verse selector component can override this at runtime.

import { parseScriptureReference, resolveScriptureSelection, type ResolvedScriptureReference, type ScriptureReference } from "./scripture";

export const HOMEPAGE_SELECTED_VERSE_REFERENCE = "Romans 15:7";

export function parseHomepageSelectedVerse(): ScriptureReference | null {
  return parseScriptureReference(HOMEPAGE_SELECTED_VERSE_REFERENCE);
}

export function resolveHomepageSelectedVerse(): ResolvedScriptureReference | null {
  const parsed = parseHomepageSelectedVerse();
  if (!parsed) return null;

  return resolveScriptureSelection({
    ...parsed,
    chapter: parsed.chapter ?? 1,
    verse: parsed.verse ?? 1,
  });
}
