// The Scripture API routes, exercised for truthfulness:
//   - /api/scripture/translations only marks "readHere" what the platform
//     genuinely returned; CSB/KJV/NIV stay external links until licensed.
//   - /api/scripture/chapter refuses versions outside the licensed list,
//     serves licensed ones with honest attribution, and degrades to error
//     statuses (never fake text) when YouVersion fails.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../youversionPlatform", () => ({
  youVersionServerKey: vi.fn(),
  fetchEnabledYouVersionBibles: vi.fn(),
  fetchYouVersionChapter: vi.fn(),
}));

import {
  fetchEnabledYouVersionBibles,
  fetchYouVersionChapter,
  youVersionServerKey,
} from "../youversionPlatform";
import { GET as getTranslations } from "../../app/api/scripture/translations/route";
import { GET as getChapter } from "../../app/api/scripture/chapter/route";

const keyMock = vi.mocked(youVersionServerKey);
const biblesMock = vi.mocked(fetchEnabledYouVersionBibles);
const chapterMock = vi.mocked(fetchYouVersionChapter);

const ENABLED = [
  {
    id: 206,
    abbreviation: "engWEBUS",
    title: "World English Bible",
    languageTag: "en",
    copyright: null,
    books: [],
  },
  {
    id: 3034,
    abbreviation: "BSB",
    title: "Berean Standard Bible",
    languageTag: "en",
    copyright: null,
    books: ["GEN", "PSA", "JHN"],
  },
  {
    id: 3427,
    abbreviation: "TCENT",
    title: "The Text-Critical English New Testament",
    languageTag: "en",
    copyright: null,
    books: ["MAT", "JHN", "REV"],
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  keyMock.mockReturnValue("fake-test-key");
  biblesMock.mockResolvedValue(ENABLED);
});

async function translationsPayload() {
  const response = await getTranslations();
  expect(response.status).toBe(200);
  return (await response.json()).translations as Array<{
    id: number;
    abbreviation: string;
    label: string;
    access: string;
    source?: string;
  }>;
}

describe("/api/scripture/translations", () => {
  it("lists every locally readable translation, KJV included, all readHere", async () => {
    const translations = await translationsPayload();

    for (const abbreviation of ["KJV", "BSB", "WEBUS"]) {
      const entry = translations.find((item) => item.abbreviation === abbreviation);
      expect(entry, abbreviation).toBeDefined();
      expect(entry?.access, abbreviation).toBe("readHere");
      expect(entry?.source, abbreviation).toBe("local");
    }

    // Local datasets are not duplicated by the platform's own entries.
    expect(translations.filter((entry) => entry.id === 3034)).toHaveLength(1);
    expect(translations.filter((entry) => entry.id === 206)).toHaveLength(1);
    expect(translations.filter((entry) => entry.id === 1)).toHaveLength(1);
  });

  // The reported bug: the picker offered KJV, the reader showed BSB. A
  // translation with no readable text must not appear at all.
  it("never lists a translation that cannot be rendered", async () => {
    const translations = await translationsPayload();

    for (const entry of translations) {
      expect(entry.access, entry.abbreviation).toBe("readHere");
    }
    for (const unlicensed of ["CSB", "NIV", "ESV", "NLT"]) {
      expect(
        translations.some((entry) => entry.abbreviation === unlicensed),
        unlicensed,
      ).toBe(false);
    }
  });

  it("never invents readHere access when the key is missing", async () => {
    keyMock.mockReturnValue(null);
    const translations = await translationsPayload();

    // Only the local datasets — no platform entries invented without a key.
    expect(translations.map((entry) => entry.abbreviation).sort()).toEqual(
      ["BSB", "KJV", "WEBUS"].sort(),
    );
    expect(translations.every((entry) => entry.source === "local")).toBe(true);
    expect(biblesMock).not.toHaveBeenCalled();
  });

  it("degrades to the local datasets when the platform is unreachable", async () => {
    biblesMock.mockRejectedValue(new Error("timeout"));
    const translations = await translationsPayload();

    expect(translations.every((entry) => entry.access === "readHere")).toBe(true);
    expect(translations.map((entry) => entry.abbreviation).sort()).toEqual(
      ["BSB", "KJV", "WEBUS"].sort(),
    );
  });
});

function chapterRequest(query: string) {
  return new Request(`http://localhost/api/scripture/chapter?${query}`);
}

describe("/api/scripture/chapter with a version parameter", () => {
  it("serves a licensed YouVersion chapter with honest attribution", async () => {
    chapterMock.mockResolvedValue([{ verse: 1, text: "In the beginning was the Word..." }]);

    const response = await getChapter(chapterRequest("book=JHN&chapter=1&version=3427"));
    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.translation).toEqual({ id: 3427, abbreviation: "TCENT", label: "TCENT" });
    expect(data.attribution).toContain("Text-Critical English New Testament");
    expect(data.attribution).not.toContain("World English Bible");
    expect(data.verses).toEqual([{ verse: 1, text: "In the beginning was the Word..." }]);
    expect(data.next).toEqual({ book: "JHN", chapter: 2 });
    expect(chapterMock).toHaveBeenCalledWith(3427, "JHN", 1);
  });

  it("refuses versions the application is not licensed for", async () => {
    const response = await getChapter(chapterRequest("book=JHN&chapter=3&version=1713"));
    expect(response.status).toBe(403);
    expect(chapterMock).not.toHaveBeenCalled();
  });

  it("404s when the version genuinely lacks the requested book", async () => {
    const response = await getChapter(chapterRequest("book=GEN&chapter=1&version=3427"));
    expect(response.status).toBe(404);
    expect(chapterMock).not.toHaveBeenCalled();
  });

  it("returns 502 on upstream failure so the reader falls back to the local text", async () => {
    chapterMock.mockRejectedValue(new Error("timeout"));
    const response = await getChapter(chapterRequest("book=JHN&chapter=3&version=3427"));
    expect(response.status).toBe(502);
  });

  it("returns 503 when no key is configured", async () => {
    keyMock.mockReturnValue(null);
    const response = await getChapter(chapterRequest("book=JHN&chapter=3&version=3427"));
    expect(response.status).toBe(503);
  });

  it("version=3034 (the active default) serves the local BSB text, never a proxy", async () => {
    const response = await getChapter(chapterRequest("book=JHN&chapter=1&version=3034"));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.attribution).toBe("Berean Standard Bible (BSB), public domain.");
    expect(data.translation).toEqual({ id: 3034, abbreviation: "BSB", label: "BSB" });
    expect(data.verses.length).toBeGreaterThan(0);
    expect(chapterMock).not.toHaveBeenCalled();
  });

  it("the default (no version) serves BSB with BSB attribution", async () => {
    const response = await getChapter(chapterRequest("book=PSA&chapter=23"));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.attribution).toBe("Berean Standard Bible (BSB), public domain.");
    expect(data.verses[0].text).toBe(
      "A Psalm of David. The LORD is my shepherd; I shall not want.",
    );
  });
});
