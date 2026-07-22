// Shared Scripture system — single import point.
//
// Core rules:
// - Pass ScriptureReference objects, never re-parse raw strings.
// - Build every Bible.com link through bibleComUrl().
// - Text rendered inside CrossHeartPray comes from the local World English
//   Bible (public domain) or a YouVersion translation this application is
//   genuinely licensed for; everything else deep-links to Bible.com.
// - Text is never labeled as a translation it is not.

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
  fetchAvailableTranslations,
  getScriptureProvider,
  loadTranslationPreference,
  localWebProvider,
  pickDefaultTranslation,
  saveTranslationPreference,
  type ReaderCapability,
  type ScriptureChapter,
  type ScriptureProvider,
  type ScriptureProviderId,
  type ScriptureTranslation,
  type ScriptureTranslationSource,
} from "./provider";

export {
  BIBLE_COM_DEFAULT_VERSION,
  BIBLE_COM_LINK_VERSIONS,
  adjacentChapter,
  bibleComUrl,
  bibleComUrlForPassage,
  formatScriptureReference,
  parseScriptureReference,
  referenceForPassage,
  toUsfmString,
  type BibleComLinkVersion,
  type ScriptureReference,
} from "./reference";

export { suggestScriptureReferences, type ScriptureSuggestion } from "./search";

export {
  isRecommendedTranslation,
  matchesTranslationSearch,
  recommendedRank,
  translationDisplayName,
} from "./translationNames";

export {
  SCRIPTURE_READER_OPEN_EVENT,
  openScriptureReader,
  type ScriptureReaderOpenDetail,
} from "./readerBus";
