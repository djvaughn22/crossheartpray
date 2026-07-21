// Autocomplete suggestions for the shared Scripture reference picker.
//
// All data is local (books.ts), so suggestions are synchronous and instant;
// the input component exposes them through an async-friendly API so a future
// remote source (e.g. YouVersion Platform search) can slot in without
// changing any caller.

import { matchScriptureBooks, type ScriptureBook } from "./books";
import { formatScriptureReference, type ScriptureReference } from "./reference";

export type ScriptureSuggestion = {
  reference: ScriptureReference;
  /** "John 3:16" — what lands in the input when picked. */
  label: string;
  /** "21 chapters" / "Chapter 3 of 21" — secondary line in the listbox. */
  detail: string;
};

const MAX_SUGGESTIONS = 8;

function bookDetail(book: ScriptureBook): string {
  return book.chapters === 1 ? "1 chapter" : `${book.chapters} chapters`;
}

function suggestionFor(reference: ScriptureReference, detail: string): ScriptureSuggestion {
  return { reference, label: formatScriptureReference(reference), detail };
}

/**
 * Suggestions for partial input like "Jo", "John 3", "1 pe", "II Tim",
 * "John 3:1". Best match first, never more than `limit`.
 */
export function suggestScriptureReferences(
  input: string,
  limit: number = MAX_SUGGESTIONS,
): ScriptureSuggestion[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  // Split a trailing chapter[:verse] group off the book text.
  const match = trimmed.match(/^(.*?)(?:\s+(\d{1,3})(?:\s*[:.]\s*(\d{0,3}))?)?$/);
  if (!match) return [];

  const [, bookPart, chapterPart, versePart] = match;
  const books = matchScriptureBooks(bookPart || trimmed);
  if (books.length === 0) return [];

  const suggestions: ScriptureSuggestion[] = [];

  if (chapterPart === undefined) {
    // Book-level input: offer the books themselves.
    for (const book of books) {
      suggestions.push(suggestionFor({ book: book.usfm }, bookDetail(book)));
    }
    return suggestions.slice(0, limit);
  }

  const book = books[0];
  const typedChapter = Number(chapterPart);

  if (versePart === undefined) {
    // "John 3" → John 3, then completions like John 30..39 that still exist.
    if (typedChapter >= 1 && typedChapter <= book.chapters) {
      suggestions.push(
        suggestionFor(
          { book: book.usfm, chapter: typedChapter },
          `Chapter ${typedChapter} of ${book.chapters}`,
        ),
      );
    }
    for (let digit = 0; digit <= 9 && suggestions.length < limit; digit += 1) {
      const completed = typedChapter * 10 + digit;
      if (completed !== typedChapter && completed >= 1 && completed <= book.chapters) {
        suggestions.push(
          suggestionFor(
            { book: book.usfm, chapter: completed },
            `Chapter ${completed} of ${book.chapters}`,
          ),
        );
      }
    }
    return suggestions.slice(0, limit);
  }

  if (typedChapter < 1 || typedChapter > book.chapters) return [];

  if (versePart === "") {
    // "John 3:" → the chapter, ready for a verse.
    return [
      suggestionFor(
        { book: book.usfm, chapter: typedChapter },
        `Chapter ${typedChapter} of ${book.chapters}`,
      ),
    ];
  }

  const verse = Number(versePart);
  if (!Number.isInteger(verse) || verse < 1) return [];

  return [
    suggestionFor(
      { book: book.usfm, chapter: typedChapter, verse },
      `${book.name} chapter ${typedChapter}`,
    ),
  ];
}
