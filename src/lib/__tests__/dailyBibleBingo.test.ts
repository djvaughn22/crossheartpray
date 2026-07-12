import { describe, expect, it } from "vitest";
import {
  addDaysToDateKey,
  buildDailyBibleBingoPost,
  captionMarkerForDate,
  chicagoDateKey,
  chicagoHour,
  DAILY_BIBLE_BINGO_START_DATE,
  formatFullDate,
  isValidDateKey,
  weekdayIndexForDateKey,
} from "../dailyBibleBingo";
import { passagesForBibleBingoBoardId } from "../bibleRandom";

describe("America/Chicago date boundaries", () => {
  it("stays on the previous day until midnight Central (summer, CDT = UTC-5)", () => {
    expect(chicagoDateKey(new Date("2026-07-13T04:59:00Z"))).toBe("2026-07-12");
    expect(chicagoDateKey(new Date("2026-07-13T05:00:00Z"))).toBe("2026-07-13");
  });

  it("stays on the previous day until midnight Central (winter, CST = UTC-6)", () => {
    expect(chicagoDateKey(new Date("2026-01-10T05:59:00Z"))).toBe("2026-01-09");
    expect(chicagoDateKey(new Date("2026-01-10T06:00:00Z"))).toBe("2026-01-10");
  });

  it("reports the Chicago hour", () => {
    expect(chicagoHour(new Date("2026-07-12T13:30:00Z"))).toBe(8); // 8:30am CDT
    expect(chicagoHour(new Date("2026-07-12T05:00:00Z"))).toBe(0); // midnight CDT
  });
});

describe("date keys", () => {
  it("validates date keys", () => {
    expect(isValidDateKey("2026-07-12")).toBe(true);
    expect(isValidDateKey("2028-02-29")).toBe(true); // leap year
    expect(isValidDateKey("2026-02-30")).toBe(false);
    expect(isValidDateKey("2026-13-01")).toBe(false);
    expect(isValidDateKey("07-12-2026")).toBe(false);
    expect(isValidDateKey("2026-7-12")).toBe(false);
    expect(isValidDateKey("garbage")).toBe(false);
  });

  it("adds days across month boundaries", () => {
    expect(addDaysToDateKey("2026-07-31", 1)).toBe("2026-08-01");
    expect(addDaysToDateKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToDateKey("2026-07-12", -1)).toBe("2026-07-11");
  });

  it("knows the launch date is a Sunday", () => {
    expect(DAILY_BIBLE_BINGO_START_DATE).toBe("2026-07-12");
    expect(weekdayIndexForDateKey("2026-07-12")).toBe(0);
    expect(formatFullDate("2026-07-12")).toBe("Sunday, July 12, 2026");
  });
});

describe("deterministic daily board", () => {
  it("produces identical posts for the same date", () => {
    const a = buildDailyBibleBingoPost("2026-07-12");
    const b = buildDailyBibleBingoPost("2026-07-12");

    expect(a.boardId).toBe(b.boardId);
    expect(a.caption).toBe(b.caption);
    expect(a.references).toEqual(b.references);
  });

  it("features the weekday lane", () => {
    expect(buildDailyBibleBingoPost("2026-07-12").featuredLaneIndex).toBe(0); // Sunday
    expect(buildDailyBibleBingoPost("2026-07-13").featuredLaneIndex).toBe(1); // Monday
    expect(buildDailyBibleBingoPost("2026-07-18").featuredLaneIndex).toBe(6); // Saturday
  });

  it("never produces an empty card", () => {
    const post = buildDailyBibleBingoPost("2026-07-12");

    expect(post.lanes).toHaveLength(7);
    for (const lane of post.lanes) {
      expect(lane.reference.length).toBeGreaterThan(0);
      expect(lane.passage.text.trim().length).toBeGreaterThan(0);
      expect(lane.verseUrl).toMatch(/^https:\/\/www\.bible\.com\/bible\/206\//);
      expect(lane.chapterUrl).toMatch(/^https:\/\/www\.bible\.com\/bible\/206\//);
    }
  });

  it("rejects invalid date keys", () => {
    expect(() => buildDailyBibleBingoPost("2026-02-30")).toThrow();
  });
});

describe("page / image / caption parity", () => {
  it("caption lists exactly the board's references", () => {
    const post = buildDailyBibleBingoPost("2026-07-12");

    expect(post.caption.startsWith(captionMarkerForDate("2026-07-12"))).toBe(true);
    for (const reference of post.references) {
      expect(post.caption).toContain(`• ${reference}`);
    }
    expect(post.caption).toContain("CrossHeartPray.com/today");
    expect(post.caption).toContain("#CrossHeartPray");
  });

  it("the archive board id resolves back to the same seven passages", () => {
    const post = buildDailyBibleBingoPost("2026-07-12");
    const passages = passagesForBibleBingoBoardId(post.boardId);

    expect(passages).not.toBeNull();
    expect(passages!.map((p) => p.label)).toEqual(post.references);
  });
});
