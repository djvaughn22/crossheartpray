import { describe, expect, it } from "vitest";
import { normalizeReadingPlanEntryId } from "../readingPlanProgress";
import { normalizeReadingPlan104EntryId } from "../readingPlan104Progress";
import {
  createReadingPlanSyncIdentity,
  normalizeReadingPlanSyncEntryId,
  readingPlanSyncIdentityKey,
  READING_PLAN_SYNC_PLAN_IDS,
} from "../readingPlanSyncModel";

describe("Reading Plan shared Sync identity model", () => {
  it("locks versioned plan identifiers", () => {
    expect(READING_PLAN_SYNC_PLAN_IDS).toEqual({
      oneYear: "one-year-v1",
      twoYear: "two-year-v1",
    });
  });

  it("keeps the 1-year item namespace at weeks 1 through 52", () => {
    expect(
      normalizeReadingPlanSyncEntryId(
        READING_PLAN_SYNC_PLAN_IDS.oneYear,
        "Week-05-Friday",
      ),
    ).toBe("week-5-friday");

    expect(
      normalizeReadingPlanSyncEntryId(
        READING_PLAN_SYNC_PLAN_IDS.oneYear,
        "week-53-friday",
      ),
    ).toBeNull();
  });

  it("keeps the 2-year item namespace at weeks 1 through 104", () => {
    expect(
      normalizeReadingPlanSyncEntryId(
        READING_PLAN_SYNC_PLAN_IDS.twoYear,
        "Week-104-Saturday",
      ),
    ).toBe("week-104-saturday");

    expect(
      normalizeReadingPlanSyncEntryId(
        READING_PLAN_SYNC_PLAN_IDS.twoYear,
        "week-105-saturday",
      ),
    ).toBeNull();
  });

  it("preserves the existing annual plan-year boundary explicitly", () => {
    expect(
      createReadingPlanSyncIdentity(
        READING_PLAN_SYNC_PLAN_IDS.oneYear,
        "week-17-wednesday",
        { planYear: 2026 },
      ),
    ).toEqual({
      planId: "one-year-v1",
      cycleId: "2026",
      itemId: "week-17-wednesday",
    });

    expect(
      createReadingPlanSyncIdentity(
        READING_PLAN_SYNC_PLAN_IDS.oneYear,
        "week-17-wednesday",
      ),
    ).toBeNull();
  });

  it("keeps the current 2-year track independent of annual year buckets", () => {
    expect(
      createReadingPlanSyncIdentity(
        READING_PLAN_SYNC_PLAN_IDS.twoYear,
        "week-17-wednesday",
      ),
    ).toEqual({
      planId: "two-year-v1",
      cycleId: null,
      itemId: "week-17-wednesday",
    });
  });

  it("cannot collide when the same local week/day exists in both plans", () => {
    const annual = createReadingPlanSyncIdentity(
      READING_PLAN_SYNC_PLAN_IDS.oneYear,
      "week-8-monday",
      { planYear: 2026 },
    );
    const twoYear = createReadingPlanSyncIdentity(
      READING_PLAN_SYNC_PLAN_IDS.twoYear,
      "week-8-monday",
    );

    expect(annual).not.toBeNull();
    expect(twoYear).not.toBeNull();

    expect(readingPlanSyncIdentityKey(annual!)).toBe(
      "one-year-v1:2026:week-8-monday",
    );
    expect(readingPlanSyncIdentityKey(twoYear!)).toBe(
      "two-year-v1:-:week-8-monday",
    );
  });

  it("leaves both existing public normalizers backward-compatible", () => {
    expect(normalizeReadingPlanEntryId("Week-052-Sunday")).toBe(
      "week-52-sunday",
    );
    expect(normalizeReadingPlanEntryId("week-53-sunday")).toBeNull();

    expect(normalizeReadingPlan104EntryId("Week-0104-Saturday")).toBe(
      "week-104-saturday",
    );
    expect(normalizeReadingPlan104EntryId("week-105-saturday")).toBeNull();
  });
});
