// Daily Hope reads its verse text straight from the active local dataset —
// no reference may go missing under the site-wide default translation, and
// the rendered text is the active translation's (BSB by default).
import { describe, expect, it } from "vitest";

import { getDailyHopeDays, getDailyHopeMissingReferences } from "../dailyHopeRoutine";
import { LOCAL_BIBLE_VERSES } from "../localBibleVerses";

describe("Daily Hope under the central translation default", () => {
  it("every curated reference resolves in the active dataset", () => {
    expect(getDailyHopeMissingReferences()).toEqual([]);
  });

  it("passage text comes from the active dataset verbatim", () => {
    const sunday = getDailyHopeDays().find((day) => day.slug === "sunday")!;
    const romans = sunday.items.find((item) => item.label === "Romans 5:3-5")!;
    const local = LOCAL_BIBLE_VERSES.find((verse) => verse.label === "Romans 5:3")!;
    expect(romans.passages[0].text).toBe(local.text);
  });
});
