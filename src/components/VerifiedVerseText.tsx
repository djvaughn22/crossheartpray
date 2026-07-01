"use client";

import {
  getVerifiedWordStudyForPhrase,
  getVerifiedWordStudyForWord,
  verifiedWordStudyKey,
  type VerifiedWordStudy,
  type WordStudyPassage,
} from "../lib/originalLanguageWordStudy";

type VerifiedVerseTextProps = {
  passage: WordStudyPassage;
  wordStudies: VerifiedWordStudy[];
  onWordClick: (wordStudy: VerifiedWordStudy) => void;
};

type PhraseMatch = {
  endIndex: number;
  text: string;
  wordStudy: VerifiedWordStudy;
};

function isWordPart(part: string) {
  return /^[A-Za-z]+(?:'[A-Za-z]+)?$/.test(part);
}

function phraseText(parts: string[], startIndex: number, endIndex: number) {
  return parts.slice(startIndex, endIndex + 1).join("");
}

export default function VerifiedVerseText({
  passage,
  wordStudies,
  onWordClick,
}: VerifiedVerseTextProps) {
  const parts = passage.text.split(/([A-Za-z]+(?:['’][A-Za-z]+)?)/g);
  const phraseMatches = new Map<number, PhraseMatch>();
  const phraseCoveredIndexes = new Set<number>();
  const phraseStudyKeys = new Set<string>();

  for (let index = 0; index < parts.length; index += 1) {
    if (!isWordPart(parts[index]) || phraseCoveredIndexes.has(index)) {
      continue;
    }

    const wordIndexes: number[] = [];

    for (
      let scanIndex = index;
      scanIndex < parts.length && wordIndexes.length < 4;
      scanIndex += 1
    ) {
      if (isWordPart(parts[scanIndex])) {
        wordIndexes.push(scanIndex);
      }
    }

    for (let wordCount = Math.min(4, wordIndexes.length); wordCount >= 2; wordCount -= 1) {
      const endIndex = wordIndexes[wordCount - 1];
      const candidate = phraseText(parts, index, endIndex);
      const wordStudy = getVerifiedWordStudyForPhrase(wordStudies, candidate);

      if (!wordStudy) {
        continue;
      }

      phraseMatches.set(index, {
        endIndex,
        text: candidate,
        wordStudy,
      });

      for (let coveredIndex = index; coveredIndex <= endIndex; coveredIndex += 1) {
        phraseCoveredIndexes.add(coveredIndex);
      }

      phraseStudyKeys.add(verifiedWordStudyKey(wordStudy));
      break;
    }
  }

  return (
    <>
      {parts.map((part, index) => {
        const phraseMatch = phraseMatches.get(index);

        if (phraseMatch) {
          return (
            <button
              key={`${verifiedWordStudyKey(phraseMatch.wordStudy)}-${index}`}
              type="button"
              onClick={() =>
                onWordClick({
                  ...phraseMatch.wordStudy,
                  englishWord: phraseMatch.text,
                })
              }
              title="Open Behind the Verse"
              className="inline cursor-help rounded-sm bg-transparent p-0 font-[inherit] text-inherit underline decoration-emerald-200/35 decoration-dotted decoration-1 underline-offset-[3px] transition hover:bg-emerald-300/10 hover:text-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/60"
            >
              {phraseMatch.text}
            </button>
          );
        }

        if (phraseCoveredIndexes.has(index)) {
          return null;
        }

        const wordStudy = getVerifiedWordStudyForWord(wordStudies, part);

        if (
          !wordStudy ||
          phraseStudyKeys.has(verifiedWordStudyKey(wordStudy))
        ) {
          return <span key={`${part}-${index}`}>{part}</span>;
        }

        return (
          <button
            key={`${verifiedWordStudyKey(wordStudy)}-${index}`}
            type="button"
            onClick={() => onWordClick({ ...wordStudy, englishWord: part })}
            title="Open Behind the Verse"
            className="inline cursor-help rounded-sm bg-transparent p-0 font-[inherit] text-inherit underline decoration-emerald-200/35 decoration-dotted decoration-1 underline-offset-[3px] transition hover:bg-emerald-300/10 hover:text-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/60"
          >
            {part}
          </button>
        );
      })}
    </>
  );
}
