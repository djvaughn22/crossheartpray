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
  it("lists local WEB first, licensed versions as readHere, CSB/KJV/NIV as external", async () => {
    const translations = await translationsPayload();

    expect(translations[0]).toMatchObject({
      abbreviation: "WEBUS",
      access: "readHere",
      source: "local",
    });

    const bsb = translations.find((entry) => entry.abbreviation === "BSB");
    expect(bsb).toMatchObject({ access: "readHere", source: "youVersion" });

    // The platform's WEB entry is not duplicated — local WEB covers it.
    expect(translations.filter((entry) => entry.id === 206)).toHaveLength(1);

    for (const abbreviation of ["CSB", "KJV", "NIV", "ESV", "NLT"]) {
      const entry = translations.find((item) => item.abbreviation === abbreviation);
      expect(entry, abbreviation).toBeDefined();
      expect(entry?.access, abbreviation).toBe("bibleComLink");
    }
  });

  it("never invents readHere access when the key is missing", async () => {
    keyMock.mockReturnValue(null);
    const translations = await translationsPayload();
    const readHere = translations.filter((entry) => entry.access === "readHere");
    expect(readHere).toHaveLength(1);
    expect(readHere[0].abbreviation).toBe("WEBUS");
    expect(biblesMock).not.toHaveBeenCalled();
  });

  it("degrades to local + external when the platform is unreachable", async () => {
    biblesMock.mockRejectedValue(new Error("timeout"));
    const translations = await translationsPayload();
    expect(translations.filter((entry) => entry.access === "readHere")).toHaveLength(1);
    expect(
      translations.some((entry) => entry.abbreviation === "CSB" && entry.access === "bibleComLink"),
    ).toBe(true);
  });
});

function chapterRequest(query: string) {
  return new Request(`http://localhost/api/scripture/chapter?${query}`);
}

describe("/api/scripture/chapter with a version parameter", () => {
  it("serves a licensed YouVersion chapter with honest attribution", async () => {
    chapterMock.mockResolvedValue([{ verse: 1, text: "In the beginning..." }]);

    const response = await getChapter(chapterRequest("book=JHN&chapter=1&version=3034"));
    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.translation).toEqual({ id: 3034, abbreviation: "BSB", label: "BSB" });
    expect(data.attribution).toContain("Berean Standard Bible");
    expect(data.attribution).not.toContain("World English Bible");
    expect(data.verses).toEqual([{ verse: 1, text: "In the beginning..." }]);
    expect(data.next).toEqual({ book: "JHN", chapter: 2 });
    expect(chapterMock).toHaveBeenCalledWith(3034, "JHN", 1);
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

  it("returns 502 on upstream failure so the reader falls back to WEB", async () => {
    chapterMock.mockRejectedValue(new Error("timeout"));
    const response = await getChapter(chapterRequest("book=JHN&chapter=3&version=3034"));
    expect(response.status).toBe(502);
  });

  it("returns 503 when no key is configured", async () => {
    keyMock.mockReturnValue(null);
    const response = await getChapter(chapterRequest("book=JHN&chapter=3&version=3034"));
    expect(response.status).toBe(503);
  });

  it("version=206 (WEB) serves the local text with WEB attribution", async () => {
    const response = await getChapter(chapterRequest("book=JHN&chapter=1&version=206"));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.attribution).toBe("World English Bible (WEB), public domain.");
    expect(data.verses.length).toBeGreaterThan(0);
    expect(chapterMock).not.toHaveBeenCalled();
  });
});
