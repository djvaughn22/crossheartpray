// Shared Scripture system — single import point.
//
// Core rules:
// - Pass ScriptureReference objects, never re-parse raw strings.
// - Build every Bible.com link through bibleComUrl().
// - Text rendered inside CrossHeartPray comes from the local World English
//   Bible (public domain); everything else deep-links to Bible.com.

export {
  SCRIPTURE_BOOKS,
  SCRIPTURE_BOOK_NAME_TO_CODE,
  getScriptureBook,
  matchScriptureBooks,
  resolveBookCode,
  scriptureBookIndex,
  type ScriptureBook,
} from "./books";

export {
  externalLinkFallbackProvider,
  getScriptureProvider,
  isYouVersionReady,
  localWebProvider,
  youVersionAppKey,
  type ReaderCapability,
  type ScriptureChapter,
  type ScriptureProvider,
  type ScriptureProviderId,
  type ScriptureTranslation,
} from "./provider";

export {
  BIBLE_COM_DEFAULT_VERSION,
  BIBLE_COM_LINK_VERSIONS,
  adjacentChapter,
  bibleComUrl,
  bibleComUrlForPassage,
  formatScriptureReference,
  parseScriptureReference,
  toUsfmString,
  type BibleComLinkVersion,
  type ScriptureReference,
} from "./reference";

export { suggestScriptureReferences, type ScriptureSuggestion } from "./search";
