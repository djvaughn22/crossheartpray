// Which original language a book was written in, for labelling Deep Dive.
//
// The New Testament is listed rather than the Old because it is the shorter
// list, so an unrecognised or newly-spelled book name falls back to Hebrew
// rather than silently claiming Greek.

const NEW_TESTAMENT_BOOKS = new Set([
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
]);

export type BibleTestament = "old" | "new";

export function testamentForBook(book: string): BibleTestament {
  return NEW_TESTAMENT_BOOKS.has(book.trim()) ? "new" : "old";
}

/** "Hebrew" for the Old Testament, "Greek" for the New. */
export function originalLanguageForBook(book: string): "Hebrew" | "Greek" {
  return testamentForBook(book) === "new" ? "Greek" : "Hebrew";
}
