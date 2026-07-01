import {
  STRONGS_GREEK_DICTIONARY,
  STRONGS_HEBREW_DICTIONARY,
} from "./strongsDictionaryData";

export type StrongsDictionaryEntry = {
  lemma?: string;
  translit?: string;
  xlit?: string;
  pron?: string;
  derivation?: string;
  strongs_def?: string;
  kjv_def?: string;
};

function cleanStrongs(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/^([HG])0+([0-9]+)$/, "$1$2");
}

export function getStrongsDictionaryEntry(strongs?: string | null): StrongsDictionaryEntry | null {
  const clean = cleanStrongs(strongs);

  if (!clean) return null;

  if (clean.startsWith("G")) {
    return (STRONGS_GREEK_DICTIONARY as Record<string, StrongsDictionaryEntry>)[clean] ?? null;
  }

  if (clean.startsWith("H")) {
    return (STRONGS_HEBREW_DICTIONARY as Record<string, StrongsDictionaryEntry>)[clean] ?? null;
  }

  return null;
}

export function getStrongsShortDefinition(entry?: StrongsDictionaryEntry | null) {
  return String(entry?.kjv_def ?? "").trim();
}

export function getStrongsLongDefinition(entry?: StrongsDictionaryEntry | null) {
  return String(entry?.strongs_def ?? "").trim();
}

export function getStrongsOrigin(entry?: StrongsDictionaryEntry | null) {
  return String(entry?.derivation ?? "").trim();
}

export function getStrongsLemma(entry?: StrongsDictionaryEntry | null) {
  return String(entry?.lemma ?? "").trim();
}

export function getStrongsTransliteration(entry?: StrongsDictionaryEntry | null) {
  return String(entry?.translit ?? entry?.xlit ?? "").trim();
}

export function getStrongsPronunciation(entry?: StrongsDictionaryEntry | null) {
  return String(entry?.pron ?? "").trim();
}
