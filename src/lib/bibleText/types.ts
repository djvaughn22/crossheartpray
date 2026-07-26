// Shared verse shape for every local Scripture dataset. Both translation
// datasets (BSB, WEBUS) normalize into this schema so the rest of the app
// never cares which translation is active.

export type LocalBibleVerse = {
  book: string;
  code: string;
  chapter: string;
  verse: string;
  label: string;
  text: string;
  group: string;
};
