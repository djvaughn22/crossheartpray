// @vitest-environment jsdom
//
// Bible Bingo 7 issues readings by canonical Reading Plan identity: newly
// generated boards exclude entries completed this plan year, lanes exhaust
// honestly (no recycling), and identity never depends on translation.
import { describe, expect, it } from "vitest";

import {
  bibleBingoPassageForBoardReference,
  bibleBingoPlanEntryIdForPassage,
  passagesForBibleBingoBoardId,
  randomReferenceForSectionExcluding,
  remainingPlanEntriesForSection,
  seededReferenceForSection,
  seededReferenceForSectionExcluding,
} from "../bibleRandom";
import { BIBLE_BINGO_SECTIONS } from "../dailyBibleBingo";
import {
  BINGO_BOARD_STORAGE_KEY,
  loadStoredBingoBoard,
  saveStoredBingoBoard,
} from "../bingoBoard";
import { currentPlanYear } from "../readingPlanProgress";

const DAY_SLUGS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function slugForSection(index: number) {
  return DAY_SLUGS[index];
}

/** Every canonical entry id belonging to one lane (52 weeks). */
function wholeLane(daySlug: string): string[] {
  return Array.from({ length: 52 }, (_, week) => `week-${week + 1}-${daySlug}`);
}

describe("canonical reading identity for cards", () => {
  it("maps a card's chapter to exactly one plan entry id", () => {
    const id = bibleBingoPlanEntryIdForPassage({ code: "PSA", chapter: "23" });
    expect(id).toMatch(/^week-\d{1,2}-wednesday$/);
  });

  it("adjacent readings with similar references resolve to different entries", () => {
    // Two different chapters of the same book must not collapse into one
    // reading unless the plan genuinely assigns them together.
    const first = bibleBingoPlanEntryIdForPassage({ code: "PSA", chapter: 1 });
    const last = bibleBingoPlanEntryIdForPassage({ code: "PSA", chapter: 150 });
    expect(first).not.toBeNull();
    expect(last).not.toBeNull();
    expect(first).not.toBe(last);
  });

  it("identity is translation-independent (reference only, never text)", () => {
    // MAT 17:21 exists in WEB but is footnoted (unnumbered) in BSB — the
    // READING identity is the chapter's plan entry either way.
    const fromVerseRef = bibleBingoPlanEntryIdForPassage({ code: "MAT", chapter: "17" });
    const fromNumber = bibleBingoPlanEntryIdForPassage({ code: "mat", chapter: 17 });
    expect(fromVerseRef).not.toBeNull();
    expect(fromVerseRef).toBe(fromNumber);
  });
});

describe("newly generated boards exclude completed readings", () => {
  it("a seeded card never lands on a completed entry", () => {
    for (const [index, section] of BIBLE_BINGO_SECTIONS.entries()) {
      const daySlug = slugForSection(index);
      // Complete the entry today's seeded pick would otherwise use.
      const unfiltered = seededReferenceForSection(section.title, "2026-07-25");
      const takenId = bibleBingoPlanEntryIdForPassage(unfiltered);
      expect(takenId).not.toBeNull();
      const completed = new Set(takenId ? [takenId] : []);

      const pick = seededReferenceForSectionExcluding(
        section.title,
        "2026-07-25",
        completed,
      );
      expect(pick).not.toBeNull();
      const pickedId = bibleBingoPlanEntryIdForPassage(pick!);
      expect(pickedId).not.toBeNull();
      expect(completed.has(pickedId!)).toBe(false);
      expect(pickedId!.endsWith(`-${daySlug}`)).toBe(true);
    }
  });

  it("a random spin never lands on a completed entry and never recycles", () => {
    const section = BIBLE_BINGO_SECTIONS[0]; // Sunday — Epistles
    const lane = wholeLane("sunday");
    // Leave exactly one unfinished entry; every spin must land on it.
    const remainingId = lane[17];
    const completed = new Set(lane.filter((id) => id !== remainingId));

    for (let attempt = 0; attempt < 25; attempt += 1) {
      const pick = randomReferenceForSectionExcluding(section.title, completed);
      expect(pick).not.toBeNull();
      expect(bibleBingoPlanEntryIdForPassage(pick!)).toBe(remainingId);
    }
  });

  it("seven unique unfinished entries when at least seven remain", () => {
    const completed = new Set<string>();
    const ids = BIBLE_BINGO_SECTIONS.map((section) => {
      const pick = seededReferenceForSectionExcluding(section.title, "seed-x", completed);
      expect(pick).not.toBeNull();
      return bibleBingoPlanEntryIdForPassage(pick!);
    });
    expect(new Set(ids).size).toBe(7); // one distinct reading per lane
  });

  it("an exhausted lane returns null instead of refilling with completed readings", () => {
    const section = BIBLE_BINGO_SECTIONS[3]; // Wednesday — Psalms
    const completed = new Set(wholeLane("wednesday"));
    expect(seededReferenceForSectionExcluding(section.title, "any", completed)).toBeNull();
    expect(randomReferenceForSectionExcluding(section.title, completed)).toBeNull();
    expect(remainingPlanEntriesForSection(section.title, completed)).toBe(0);
  });

  it("with one through six lanes remaining, only those lanes yield cards", () => {
    // Finish every lane except Tuesday and Saturday.
    const completed = new Set(
      DAY_SLUGS.filter((slug) => slug !== "tuesday" && slug !== "saturday").flatMap(
        wholeLane,
      ),
    );

    const picks = BIBLE_BINGO_SECTIONS.map((section, index) => ({
      daySlug: slugForSection(index),
      pick: seededReferenceForSectionExcluding(section.title, "seed-y", completed),
    }));

    for (const { daySlug, pick } of picks) {
      if (daySlug === "tuesday" || daySlug === "saturday") {
        expect(pick).not.toBeNull();
      } else {
        expect(pick).toBeNull();
      }
    }
  });

  it("zero unfinished entries remaining → every lane reports complete", () => {
    const completed = new Set(DAY_SLUGS.flatMap(wholeLane));
    for (const section of BIBLE_BINGO_SECTIONS) {
      expect(seededReferenceForSectionExcluding(section.title, "z", completed)).toBeNull();
    }
  });
});

describe("saved boards stay stable", () => {
  it("round-trips the current board through storage for the current year", () => {
    saveStoredBingoBoard(["JHN.3.16", null, "PSA.23.1", null, null, null, null]);
    const restored = loadStoredBingoBoard(7);
    expect(restored).not.toBeNull();
    expect(restored!.year).toBe(currentPlanYear());
    expect(restored!.cards).toEqual(["JHN.3.16", null, "PSA.23.1", null, null, null, null]);
  });

  it("ignores a saved board from a previous plan year (rollover)", () => {
    window.localStorage.setItem(
      BINGO_BOARD_STORAGE_KEY,
      JSON.stringify({ year: currentPlanYear() - 1, cards: new Array(7).fill("JHN.3.16") }),
    );
    expect(loadStoredBingoBoard(7)).toBeNull();
  });

  it("rejects corrupt or wrong-shape saved boards safely", () => {
    window.localStorage.setItem(BINGO_BOARD_STORAGE_KEY, "{broken");
    expect(loadStoredBingoBoard(7)).toBeNull();
    window.localStorage.setItem(
      BINGO_BOARD_STORAGE_KEY,
      JSON.stringify({ year: currentPlanYear(), cards: ["JHN.3.16"] }),
    );
    expect(loadStoredBingoBoard(7)).toBeNull();
  });

  it("restores a stored card to the exact same passage", () => {
    const passage = bibleBingoPassageForBoardReference(
      BIBLE_BINGO_SECTIONS[6].title,
      "JHN",
      "3",
      "16",
    );
    expect(passage).not.toBeNull();
    expect(passage!.label.startsWith("John 3:16")).toBe(true);
    expect(passage!.text.length).toBeGreaterThan(0);
  });

  it("fails safely for a card that cannot be matched", () => {
    expect(
      bibleBingoPassageForBoardReference(BIBLE_BINGO_SECTIONS[6].title, "MAT", 17, 21),
    ).toBeNull();
    expect(
      bibleBingoPassageForBoardReference(BIBLE_BINGO_SECTIONS[6].title, "XXX", 1, 1),
    ).toBeNull();
  });
});

describe("old shared board ids survive translation versification", () => {
  it("keeps a WEB-era board alive when one verse is footnoted in BSB", () => {
    // MAT.17.21 is unnumbered in BSB; the board keeps its reference with
    // empty text instead of 404ing all seven cards.
    const boardId = [
      "ROM.1.1",
      "GEN.1.1",
      "JOS.1.1",
      "PSA.23.1",
      "PRO.3.5",
      "ISA.40.31",
      "MAT.17.21",
    ].join("~");

    const passages = passagesForBibleBingoBoardId(boardId);
    expect(passages).not.toBeNull();
    expect(passages).toHaveLength(7);
    expect(passages![6].label).toBe("Matthew 17:21");
    expect(passages![6].text).toBe("");
    // The other six carry real text.
    expect(passages!.slice(0, 6).every((p) => p.text.length > 0)).toBe(true);
  });

  it("still rejects structurally invalid board ids", () => {
    expect(passagesForBibleBingoBoardId("JHN.3.16")).toBeNull();
    expect(passagesForBibleBingoBoardId("not~a~board~id~at~all~x")).toBeNull();
  });
});
