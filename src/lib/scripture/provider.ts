// Hybrid Scripture provider boundary.
//
// Presentation components talk to a ScriptureProvider, never to a concrete
// backend. Reading priority (Phase-verified July 2026):
//
//   1. Every public-domain translation with a complete local dataset
//      (BSB, WEB, KJV), served from /api/scripture/chapter?version=<id>.
//   2. YouVersion Platform translations this application is genuinely
//      licensed for, through the same endpoint. The App Key stays on the
//      server; this client code never sees it.
//
// Translation truthfulness: the picker only ever lists translations whose
// text can actually be rendered, and a chapter is cached under the
// translation the server says it served. Local text is never labeled as any
// other translation, and a failed load is an error — never a substitution.

import {
  bibleComUrl,
  parseScriptureReference,
  type ScriptureReference,
} from "./reference";
import {
  ACTIVE_BIBLE_TRANSLATION,
  SUPPORTED_BIBLE_TRANSLATIONS,
} from "./translationConfig";
import { suggestScriptureReferences, type ScriptureSuggestion } from "./search";

export type ScriptureProviderId = "localWeb" | "youVersion" | "externalLinkFallback";

/** Can this provider render Scripture text inside CrossHeartPray? */
export type ReaderCapability = "embeddedReader" | "externalLinksOnly";

export type ScriptureTranslationSource = "local" | "youVersion" | "bibleCom";

export type ScriptureTranslation = {
  id: number;
  abbreviation: string;
  label: string;
  /** "readHere" renders inside CrossHeartPray; "bibleComLink" opens Bible.com. */
  access: "readHere" | "bibleComLink";
  /** Where readHere text actually comes from. Absent = "bibleCom" link-only. */
  source?: ScriptureTranslationSource;
  /** USFM codes this version contains (YouVersion versions only). */
  books?: string[];
};

export type ScriptureChapter = {
  book: string;
  bookName: string;
  chapter: number;
  chapterCount: number;
  verses: Array<{ verse: number; text: string }>;
  previous: ScriptureReference | null;
  next: ScriptureReference | null;
  attribution: string;
  /** The translation actually rendered (absent = the active local text). */
  translation?: { id: number; abbreviation: string; label: string };
};

export interface ScriptureProvider {
  id: ScriptureProviderId;
  resolveReference(input: string): ScriptureReference | null;
  suggestReferences(input: string, limit?: number): ScriptureSuggestion[];
  /** Rejects on failure — callers then use buildExternalUrl. */
  loadChapter(
    reference: Pick<ScriptureReference, "book" | "chapter">,
    options?: { signal?: AbortSignal; translation?: ScriptureTranslation },
  ): Promise<ScriptureChapter>;
  buildExternalUrl(
    reference: ScriptureReference,
    version?: { id: number; abbreviation: string; label: string },
  ): string;
  listAvailableTranslations(): ScriptureTranslation[];
  determineReaderCapability(): ReaderCapability;
}

// Chapters already fetched this session — instant back/forward everywhere,
// shared by every component that reads through the provider. Keyed by
// translation so local text is never shown under another translation's name.
const chapterCache = new Map<string, ScriptureChapter>();

const sharedReferenceOperations = {
  resolveReference: (input: string) => parseScriptureReference(input),
  suggestReferences: (input: string, limit?: number) => suggestScriptureReferences(input, limit),
  buildExternalUrl: (
    reference: ScriptureReference,
    version?: { id: number; abbreviation: string; label: string },
  ) => bibleComUrl(reference, version),
};

/**
 * The offline fallback list, used when /api/scripture/translations can't be
 * reached: every translation with a complete local dataset, all genuinely
 * readable. Nothing unreadable is ever offered, so losing the network
 * narrows the picker instead of filling it with names that render someone
 * else's text.
 */
function translationsWithLocalWeb(): ScriptureTranslation[] {
  return Object.values(SUPPORTED_BIBLE_TRANSLATIONS).map((translation) => ({
    id: translation.bibleComId,
    abbreviation: translation.bibleComAbbreviation,
    label: translation.shortName,
    access: "readHere" as const,
    source: "local" as const,
  }));
}

export const localWebProvider: ScriptureProvider = {
  id: "localWeb",
  ...sharedReferenceOperations,

  async loadChapter(reference, options) {
    const chapter = reference.chapter ?? 1;
    const translation = options?.translation;

    // Translation is part of Scripture identity. The requested version id is
    // always in both the cache key and the URL, so KJV and BSB can never
    // share an entry and the browser's HTTP cache is keyed the same way.
    const versionId = translation?.id ?? ACTIVE_BIBLE_TRANSLATION.bibleComId;
    const key = `${versionId}:${reference.book}.${chapter}`;

    const cached = chapterCache.get(key);
    if (cached) return cached;

    const response = await fetch(
      `/api/scripture/chapter?book=${reference.book}&chapter=${chapter}&version=${versionId}`,
      { signal: options?.signal },
    );
    if (!response.ok) {
      throw new Error(`Chapter ${key} unavailable (${response.status}).`);
    }
    const data: ScriptureChapter = await response.json();

    // The server names the translation it actually served. Cache under that,
    // so a response can never be reused under a different translation's key.
    const servedId = data.translation?.id ?? versionId;
    chapterCache.set(`${servedId}:${reference.book}.${chapter}`, data);
    return data;
  },

  listAvailableTranslations: translationsWithLocalWeb,
  determineReaderCapability: () => "embeddedReader",
};

export const externalLinkFallbackProvider: ScriptureProvider = {
  id: "externalLinkFallback",
  ...sharedReferenceOperations,

  async loadChapter(reference) {
    throw new Error(
      `No embedded reader available for ${reference.book}; use buildExternalUrl.`,
    );
  },

  listAvailableTranslations: translationsWithLocalWeb,
  determineReaderCapability: () => "externalLinksOnly",
};

/**
 * The embedded reader provider. YouVersion-licensed translations flow through
 * the same provider via loadChapter's translation option — the server decides
 * what is genuinely licensed. externalLinkFallbackProvider is not returned
 * here; it is the per-request fallback callers use when loadChapter rejects.
 */
export function getScriptureProvider(): ScriptureProvider {
  return localWebProvider;
}

// ── Dynamic translation capabilities ──────────────────────────────────────

let translationsPromise: Promise<ScriptureTranslation[]> | null = null;

/**
 * The truthful translation list from /api/scripture/translations: the local
 * active translation, plus every YouVersion translation this application is
 * licensed to render, plus external Bible.com links. Falls back to the
 * static local list if the endpoint is unreachable, so the reader always has
 * the local text. Cached per session.
 */
export function fetchAvailableTranslations(): Promise<ScriptureTranslation[]> {
  if (!translationsPromise) {
    translationsPromise = (async () => {
      try {
        const response = await fetch("/api/scripture/translations", {
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) throw new Error(`translations ${response.status}`);
        const data: { translations?: ScriptureTranslation[] } = await response.json();
        if (!Array.isArray(data.translations) || data.translations.length === 0) {
          throw new Error("translations payload empty");
        }
        return data.translations;
      } catch {
        translationsPromise = null; // allow a later retry
        return translationsWithLocalWeb();
      }
    })();
  }
  return translationsPromise;
}

// ── Translation preference (local, no account) ────────────────────────────

const TRANSLATION_PREF_KEY = "crossheartpray:scripture:translation:v1";

export function loadTranslationPreference(): number | null {
  try {
    const raw = window.localStorage.getItem(TRANSLATION_PREF_KEY);
    if (!raw) return null;
    const id = Number(raw);
    return Number.isInteger(id) ? id : null;
  } catch {
    return null;
  }
}

export function saveTranslationPreference(id: number): void {
  try {
    window.localStorage.setItem(TRANSLATION_PREF_KEY, String(id));
  } catch {
    // Private browsing — the preference just doesn't persist.
  }
}

/**
 * Truthful default-translation priority:
 *   1. the user's saved choice, when still genuinely readable here;
 *   2. the local active site-wide translation (BSB by default);
 *   3. the first readable translation.
 * Never picks a translation the platform did not actually return.
 */
export function pickDefaultTranslation(
  translations: ScriptureTranslation[],
  savedId: number | null,
): ScriptureTranslation {
  const readable = translations.filter((translation) => translation.access === "readHere");
  const saved = readable.find((translation) => translation.id === savedId);
  if (saved) return saved;

  const activeLocal = readable.find((translation) => translation.source === "local");
  if (activeLocal) return activeLocal;

  return readable[0] ?? translations[0];
}
