// Hybrid Scripture provider boundary.
//
// Presentation components talk to a ScriptureProvider, never to a concrete
// backend, so the reading experience can upgrade without rewriting pages:
//
//   1. "youVersion"            — preferred once the owner configures a real
//                                YouVersion Platform App Key AND the official
//                                React SDK is installed (see
//                                docs/YOUVERSION-PLATFORM.md). Not active yet.
//   2. "localWeb"              — today's reader: local public-domain World
//                                English Bible served by /api/scripture/chapter.
//   3. "externalLinkFallback"  — when chapter loading fails, callers fall back
//                                to Bible.com deep links. No dead ends.
//
// The YouVersion Platform App Key is a PUBLIC client identifier by the
// official contract — the React SDK receives it in client code as
// <YouVersionProvider appKey={...}> (developers.youversion.com/sdks/react) —
// which is why the env var uses the NEXT_PUBLIC_ prefix. It is not a server
// secret. Server-only credentials (admin, Meta, cron) must never appear in
// this directory; scriptureProvider.test.ts enforces that.

import {
  BIBLE_COM_DEFAULT_VERSION,
  BIBLE_COM_LINK_VERSIONS,
  bibleComUrl,
  parseScriptureReference,
  type BibleComLinkVersion,
  type ScriptureReference,
} from "./reference";
import { suggestScriptureReferences, type ScriptureSuggestion } from "./search";

export type ScriptureProviderId = "localWeb" | "youVersion" | "externalLinkFallback";

/** Can this provider render Scripture text inside CrossHeartPray? */
export type ReaderCapability = "embeddedReader" | "externalLinksOnly";

export type ScriptureTranslation = {
  id: number;
  abbreviation: string;
  label: string;
  /** "readHere" renders inside CrossHeartPray; "bibleComLink" opens Bible.com. */
  access: "readHere" | "bibleComLink";
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
};

export interface ScriptureProvider {
  id: ScriptureProviderId;
  resolveReference(input: string): ScriptureReference | null;
  suggestReferences(input: string, limit?: number): ScriptureSuggestion[];
  /** Rejects on failure — callers then use buildExternalUrl. */
  loadChapter(
    reference: Pick<ScriptureReference, "book" | "chapter">,
    options?: { signal?: AbortSignal },
  ): Promise<ScriptureChapter>;
  buildExternalUrl(reference: ScriptureReference, version?: BibleComLinkVersion): string;
  listAvailableTranslations(): ScriptureTranslation[];
  determineReaderCapability(): ReaderCapability;
}

/** The owner's YouVersion Platform App Key, or null while unconfigured. */
export function youVersionAppKey(): string | null {
  const key = process.env.NEXT_PUBLIC_YOUVERSION_APP_KEY?.trim();
  return key ? key : null;
}

// Flip only when @youversion/platform-react-ui is actually installed and the
// youVersion provider is implemented. Guards against a configured key with no
// SDK to honor it.
const YOUVERSION_SDK_INSTALLED = false;

export function isYouVersionReady(): boolean {
  return YOUVERSION_SDK_INSTALLED && youVersionAppKey() !== null;
}

// Chapters already fetched this session — instant back/forward everywhere,
// shared by every component that reads through the provider.
const chapterCache = new Map<string, ScriptureChapter>();

const sharedReferenceOperations = {
  resolveReference: (input: string) => parseScriptureReference(input),
  suggestReferences: (input: string, limit?: number) => suggestScriptureReferences(input, limit),
  buildExternalUrl: (reference: ScriptureReference, version?: BibleComLinkVersion) =>
    bibleComUrl(reference, version),
};

function translationsWithLocalWeb(): ScriptureTranslation[] {
  return BIBLE_COM_LINK_VERSIONS.map((version) => ({
    ...version,
    access: version.id === BIBLE_COM_DEFAULT_VERSION.id ? "readHere" : "bibleComLink",
  }));
}

export const localWebProvider: ScriptureProvider = {
  id: "localWeb",
  ...sharedReferenceOperations,

  async loadChapter(reference, options) {
    const chapter = reference.chapter ?? 1;
    const key = `${reference.book}.${chapter}`;
    const cached = chapterCache.get(key);
    if (cached) return cached;

    const response = await fetch(
      `/api/scripture/chapter?book=${reference.book}&chapter=${chapter}`,
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
    BIBLE_COM_LINK_VERSIONS.map((version) => ({ ...version, access: "bibleComLink" })),
  determineReaderCapability: () => "externalLinksOnly",
};

/**
 * Reader priority: youVersion (once genuinely configured + installed) →
 * localWeb. externalLinkFallbackProvider is not returned here — it is the
 * per-request fallback callers use when loadChapter rejects.
 */
export function getScriptureProvider(): ScriptureProvider {
  if (isYouVersionReady()) {
    // Placeholder until the YouVersion provider exists; keeps the priority
    // rule in one place. Falls through to localWeb so a configured key can
    // never break reading.
  }
  return localWebProvider;
}
