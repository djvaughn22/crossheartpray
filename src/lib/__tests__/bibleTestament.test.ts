import { describe, expect, it } from "vitest";
import { originalLanguageForBook } from "../bibleTestament";
import { LIFE_ESSENTIALS_PRINCIPLES } from "../geneGetzLifeEssentials";

const NEW_TESTAMENT = [
  "Matthew",
  "Mark",
  "Luke",
  "John",
  "Acts",
  "Romans",
  "1 Corinthians",
  "2 Corinthians",
  "Galatians",
  "Ephesians",
  "Philippians",
  "Colossians",
  "1 Thessalonians",
  "2 Thessalonians",
  "1 Timothy",
  "2 Timothy",
  "Titus",
  "Philemon",
  "Hebrews",
  "James",
  "1 Peter",
  "2 Peter",
  "1 John",
  "2 John",
  "3 John",
  "Jude",
  "Revelation",
];

describe("original language by book", () => {
  it("names Greek for all 27 New Testament books", () => {
    expect(NEW_TESTAMENT).toHaveLength(27);
    for (const book of NEW_TESTAMENT) {
      expect(originalLanguageForBook(book), book).toBe("Greek");
    }
  });

  it("names Hebrew for Old Testament books", () => {
    for (const book of ["Genesis", "Psalm", "Song of Songs", "Malachi", "Job"]) {
      expect(originalLanguageForBook(book), book).toBe("Hebrew");
    }
  });

  it("does not confuse the Gospel of John with the letters of John", () => {
    expect(originalLanguageForBook("John")).toBe("Greek");
    expect(originalLanguageForBook("1 John")).toBe("Greek");
  });

  // A renamed or newly-spelled book must fall back to Hebrew rather than
  // silently claiming a New Testament book is Greek.
  it("falls back to Hebrew for an unrecognised book", () => {
    expect(originalLanguageForBook("Not A Book")).toBe("Hebrew");
  });

  it("covers every book Life Essentials actually uses", () => {
    const books = new Set(LIFE_ESSENTIALS_PRINCIPLES.map((p) => p.book));

    expect(books.size).toBe(66);

    for (const book of books) {
      const language = originalLanguageForBook(book);
      expect(
        NEW_TESTAMENT.includes(book) ? "Greek" : "Hebrew",
        `${book} was labelled ${language}`,
      ).toBe(language);
    }
  });
});
