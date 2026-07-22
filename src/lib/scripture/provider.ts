// Hybrid Scripture provider boundary.
//
// Presentation components talk to a ScriptureProvider, never to a concrete
// backend. Reading priority (Phase-verified July 2026):
//
//   1. YouVersion Platform — licensed translations proxied through
//      /api/scripture/chapter?version=<id>. The App Key stays on the server
//      (the platform client under src/lib); this client code never sees it.
//   2. Local public-domain World English Bible via the same endpoint.
//   3. Bible.com deep links when chapter loading fails. No dead ends.
//
// Translation truthfulness: /api/scripture/translations returns only the
// versions the YouVersion application is genuinely licensed for, marked
// "readHere"; everything else is labeled as opening on Bible.com. WEB text is
// never labeled as any other translation.

import {
  BIBLE_COM_DEFAULT_VERSION,
  BIBLE_COM_LINK_VERSIONS,
  bibleComUrl,
  parseScriptureReference,
  type ScriptureReference,
} from "./reference";
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
  /** The translation actually rendered (absent = local WEB). */
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
// translation so WEB text is never shown under another translation's name.
const chapterCache = new Map<string, ScriptureChapter>();

const sharedReferenceOperations = {
  resolveReference: (input: string) => parseScriptureReference(input),
  suggestReferences: (input: string, limit?: number) => suggestScriptureReferences(input, limit),
  buildExternalUrl: (
    reference: ScriptureReference,
    version?: { id: number; abbreviation: string; label: string },
  ) => bibleComUrl(reference, version),
};

/** The static translation list: WEB readable locally, the rest external. */
function translationsWithLocalWeb(): ScriptureTranslation[] {
  return BIBLE_COM_LINK_VERSIONS.map((version) => ({
    ...version,
    access: version.id === BIBLE_COM_DEFAULT_VERSION.id ? "readHere" : "bibleComLink",
    source:
      version.id === BIBLE_COM_DEFAULT_VERSION.id
        ? ("local" as const)
        : ("bibleCom" as const),
  }));
}

export const localWebProvider: ScriptureProvider = {
  id: "localWeb",
  ...sharedReferenceOperations,

  async loadChapter(reference, options) {
    const chapter = reference.chapter ?? 1;
    const translation = options?.translation;
    const useYouVersion = translation?.source === "youVersion";
    const key = useYouVersion
      ? `${translation.id}:${reference.book}.${chapter}`
      : `web:${reference.book}.${chapter}`;

    const cached = chapterCache.get(key);
    if (cached) return cached;

    const versionParam = useYouVersion ? `&version=${translation.id}` : "";
    const response = await fetch(
      `/api/scripture/chapter?book=${reference.book}&chapter=${chapter}${versionParam}`,
      { signal: options?.signal },
    );
    if (!response.ok) {
      throw new Error(`Chapter ${key} unavailable (${response.status}).`);
    }
    const data: ScriptureChapter = await response.json();
    chapterCache.set(key, data);
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

  listAvailableTranslations: () =>
    BIBLE_COM_LINK_VERSIONS.map((version) => ({
      ...version,
      access: "bibleComLink",
      source: "bibleCom" as const,
    })),
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
 * The truthful translation list from /api/scripture/translations: local WEB,
 * plus every YouVersion translation this application is licensed to render,
 * plus external Bible.com links. Falls back to the static local list if the
 * endpoint is unreachable, so the reader always has WEB. Cached per session.
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
 *   2. CSB through YouVersion, when the application is licensed for it;
 *   3. local WEB;
 *   4. the first readable translation.
 * Never picks a translation the platform did not actually return.
 */
export function pickDefaultTranslation(
  translations: ScriptureTranslation[],
  savedId: number | null,
): ScriptureTranslation {
  const readable = translations.filter((translation) => translation.access === "readHere");
  const saved = readable.find((translation) => translation.id === savedId);
  if (saved) return saved;

  const csb = readable.find((translation) => translation.abbreviation === "CSB");
  if (csb) return csb;

  const webLocal = readable.find((translation) => translation.source === "local");
  if (webLocal) return webLocal;

  return readable[0] ?? translations[0];
}
