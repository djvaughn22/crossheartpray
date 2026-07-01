export type OriginalLanguage = "hebrew" | "greek";

export type WordStudyPassage = {
  label: string;
  code: string;
  chapter: string;
  verse: string;
  text: string;
};

export type VerifiedWordStudy = {
  reference: string;
  code: string;
  chapter: string;
  verse: string;
  englishWord: string;
  language: OriginalLanguage;
  originalWord: string;
  transliteration: string;
  pronunciation?: string;
  strongs: string;
  lemma: string;
  morphology: string;
  sourceGloss: string;
  lexiconMeaning: string;
  sourceName: string;
  lexiconSourceName: string;
  sourceUrl: string;
};

export function normalizeStudyWord(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

export function wordStudyLookupKey(passage: WordStudyPassage) {
  return `${passage.code.toUpperCase()}|${Number(passage.chapter)}|${Number(
    passage.verse,
  )}`;
}

export function buildDeepDiveWordStudiesUrl(passage: WordStudyPassage) {
  const params = new URLSearchParams({
    code: passage.code.toUpperCase(),
    chapter: String(Number(passage.chapter)),
    verse: String(Number(passage.verse)),
  });

  return `/api/deep-dive-word-studies?${params.toString()}`;
}

const lowValueEnglishWords = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "for",
  "nor",
  "so",
  "yet",
  "to",
  "of",
  "in",
  "on",
  "at",
  "by",
  "from",
  "with",
  "as",
  "into",
  "about",
  "over",
  "under",
  "through",
  "before",
  "after",
  "between",
  "among",
  "around",
  "against",
  "upon",
  "within",
  "without",
  "is",
  "are",
  "was",
  "were",
  "be",
  "being",
  "been",
  "am",
  "has",
  "have",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "shall",
  "should",
  "may",
  "might",
  "can",
  "could",
  "must",
  "i",
  "me",
  "my",
  "mine",
  "we",
  "us",
  "our",
  "ours",
  "you",
  "your",
  "yours",
  "he",
  "him",
  "his",
  "she",
  "her",
  "hers",
  "they",
  "them",
  "their",
  "theirs",
  "it",
  "its",
  "this",
  "that",
  "these",
  "those",
  "there",
  "here",
  "then",
  "when",
  "where",
  "who",
  "whom",
  "whose",
  "which",
  "what",
  "why",
  "how",
  "now",
  "not",
  "no",
  "yes",
  "if",
  "because",
  "than",
  "also",
  "only",
]);

const alwaysKeepDeepDiveWords = new Set([
  "god",
  "lord",
  "jesus",
  "christ",
  "spirit",
  "holy",
  "faith",
  "faithful",
  "grace",
  "mercy",
  "peace",
  "joy",
  "truth",
  "love",
  "beloved",
  "righteous",
  "righteousness",
  "justice",
  "judgment",
  "sin",
  "repent",
  "repentance",
  "forgive",
  "forgiven",
  "forgiveness",
  "covenant",
  "command",
  "commandment",
  "law",
  "wisdom",
  "heart",
  "soul",
  "life",
  "death",
  "resurrection",
  "salvation",
  "save",
  "saved",
  "bless",
  "blessing",
  "blessed",
  "curse",
  "sacrifice",
  "blood",
  "worship",
  "praise",
  "glory",
  "kingdom",
  "king",
  "father",
  "son",
  "gospel",
  "angel",
  "prophet",
  "apostle",
  "disciple",
  "church",
  "temple",
  "sabbath",
  "bread",
  "water",
  "light",
  "darkness",
  "good",
  "evil",
  "name",
  "word",
  "flesh",
  "hope",
  "fear",
]);

function expandNegationContractions(value: string) {
  return value
    .replace(/\b(?:don|doesn|didn|isn|aren|wasn|weren|haven|hasn|hadn|couldn|shouldn|wouldn|won|can)['’]?t\b/gi, "not")
    .replace(/\bcannot\b/gi, "not");
}

function normalizeMeaningRoot(value: string) {
  const normalized = normalizeStudyWord(expandNegationContractions(value));

  if (!normalized) return "";

  const irregularRoots: Record<string, string> = {
    said: "say",
    says: "say",
    saying: "say",
    spoke: "speak",
    spoken: "speak",
    told: "tell",
    went: "go",
    gone: "go",
    came: "come",
    made: "make",
    knew: "know",
    known: "know",
    gave: "give",
    given: "give",
  };

  if (irregularRoots[normalized]) {
    return irregularRoots[normalized];
  }

  if (normalized.endsWith("ies") && normalized.length > 4) {
    return `${normalized.slice(0, -3)}y`;
  }

  if (normalized.endsWith("ing") && normalized.length > 5) {
    const withoutIng = normalized.slice(0, -3);
    const last = withoutIng.slice(-1);

    if (last && withoutIng.endsWith(last.repeat(2))) {
      return withoutIng.slice(0, -1);
    }

    return withoutIng;
  }

  if (normalized.endsWith("ed") && normalized.length > 4) {
    const withoutEd = normalized.slice(0, -2);
    const last = withoutEd.slice(-1);

    if (last && withoutEd.endsWith(last.repeat(2))) {
      return withoutEd.slice(0, -1);
    }

    return withoutEd;
  }

  if (normalized.endsWith("s") && !normalized.endsWith("ss") && normalized.length > 3) {
    return normalized.slice(0, -1);
  }

  return normalized;
}

function isBasicVerbInflection(value: string) {
  const normalized = normalizeStudyWord(value);

  if (!normalized) return false;

  const irregularVerbs = new Set([
    "said",
    "says",
    "saying",
    "spoke",
    "spoken",
    "told",
    "went",
    "gone",
    "came",
    "made",
    "knew",
    "known",
    "gave",
    "given",
  ]);

  return (
    irregularVerbs.has(normalized) ||
    normalized.endsWith("ed") ||
    normalized.endsWith("ing")
  );
}

function meaningRoots(value: string) {
  return expandNegationContractions(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/g)
    .map(normalizeMeaningRoot)
    .filter((word) => word && !lowValueEnglishWords.has(word));
}

function hasSourceMeaningExpansion(wordStudy: VerifiedWordStudy) {
  const englishWord = normalizeStudyWord(wordStudy.englishWord);
  const englishRoot = normalizeMeaningRoot(wordStudy.englishWord);

  if (!englishRoot) return false;

  if (alwaysKeepDeepDiveWords.has(englishWord)) {
    return true;
  }

  if (
    !isBasicVerbInflection(englishWord) &&
    alwaysKeepDeepDiveWords.has(englishRoot)
  ) {
    return true;
  }

  const roots = new Set([
    ...meaningRoots(wordStudy.lexiconMeaning),
    ...meaningRoots(wordStudy.sourceGloss),
  ]);

  roots.delete(englishWord);
  roots.delete(englishRoot);

  return roots.size > 0;
}

function isUsefulGrammar(morphology: string) {
  const grammar = morphology.trim().toUpperCase();

  if (!grammar) return false;

  // Greek data often uses readable tags like ADV, CONJ, PREP, T-..., P-...
  if (
    grammar === "ADV" ||
    grammar === "CONJ" ||
    grammar === "PREP" ||
    grammar.startsWith("T-") ||
    grammar.startsWith("P-")
  ) {
    return false;
  }

  // Keep normal Bible-study content words: nouns, verbs, adjectives.
  // Hebrew morphology commonly contains N/V/A inside compact codes like HNcmpa or HVqp3ms.
  return /(^|[^A-Z])[NVA]/.test(grammar) || /^[NVA]/.test(grammar);
}

export function hasSourceBackedOriginalLanguageBridge(wordStudy: VerifiedWordStudy) {
  const hasOriginalLanguageBridge = Boolean(
    wordStudy.englishWord.trim() &&
      wordStudy.originalWord.trim() &&
      wordStudy.strongs.trim(),
  );

  const hasSourceProof = Boolean(
    wordStudy.sourceGloss.trim() ||
      wordStudy.lexiconMeaning.trim() ||
      wordStudy.sourceName.trim() ||
      wordStudy.lexiconSourceName.trim() ||
      wordStudy.sourceUrl.trim(),
  );

  return hasOriginalLanguageBridge && hasSourceProof;
}

export function isUsefulVerifiedWordStudy(wordStudy: VerifiedWordStudy) {
  // Deep Dive is a source-backed original-language bridge:
  // English word -> Hebrew/Greek word -> transliteration -> Strong's/source proof.
  //
  // Do not hide verified records just because the source gloss or lexicon
  // meaning repeats the English word. Repeated words like God/God,
  // heaven/heavens, earth/earth, love/love, grace/grace, and faith/faith
  // are still valuable when they expose the original word and Strong's link.
  return hasSourceBackedOriginalLanguageBridge(wordStudy);
}

export function hasVerifiedWordStudies(wordStudies: VerifiedWordStudy[]) {
  return wordStudies.some(isUsefulVerifiedWordStudy);
}

export function getDefaultWordStudy(wordStudies: VerifiedWordStudy[]) {
  return wordStudies.find(isUsefulVerifiedWordStudy) ?? null;
}

export function getVerifiedWordStudyForWord(
  wordStudies: VerifiedWordStudy[],
  englishWord: string,
) {
  const normalizedWord = normalizeStudyWord(englishWord);

  return (
    wordStudies.find(
      (wordStudy) =>
        isUsefulVerifiedWordStudy(wordStudy) &&
        normalizeStudyWord(wordStudy.englishWord) === normalizedWord,
    ) ?? null
  );
}

export function getVerifiedWordStudyForPhrase(
  wordStudies: VerifiedWordStudy[],
  englishPhrase: string,
) {
  const phraseRoots = meaningRoots(englishPhrase);

  if (phraseRoots.length < 2) return null;

  return (
    wordStudies.find((wordStudy) => {
      if (!isUsefulVerifiedWordStudy(wordStudy)) return false;

      const studyRoots = new Set([
        ...meaningRoots(wordStudy.englishWord),
        ...meaningRoots(wordStudy.sourceGloss),
        ...meaningRoots(wordStudy.lexiconMeaning),
      ]);

      return phraseRoots.every((root) => studyRoots.has(root));
    }) ?? null
  );
}

export function verifiedWordStudyKey(wordStudy: VerifiedWordStudy) {
  return [
    wordStudy.reference,
    wordStudy.strongs,
    wordStudy.originalWord,
    wordStudy.lemma,
    wordStudy.englishWord,
  ].join("|");
}

export function originalLanguageName(language: OriginalLanguage) {
  return language === "hebrew" ? "Hebrew" : "Greek";
}
