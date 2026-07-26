// Source contracts for two-way progress synchronization: every feature that
// reads or writes Reading Plan completion goes through the canonical annual
// service — no private storage keys, no one-way mirrors.
import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const srcRoot = path.join(__dirname, "..", "..");
const read = (relative: string) => fs.readFileSync(path.join(srcRoot, relative), "utf8");

describe("Bible Bingo page (explorebible)", () => {
  const page = read(path.join("app", "explorebible", "page.tsx"));

  it("subscribes to canonical progress (reconciles on focus/visibility/storage)", () => {
    expect(page).toContain("subscribeToReadingPlanProgress");
  });

  it("marks readings complete through the canonical service", () => {
    expect(page).toContain("setReadingPlanEntryCompleted(focusedPlanEntryId");
  });

  it("deals new boards from the unfinished pool only", () => {
    expect(page).toContain("completedReadingPlanEntryIds()");
    expect(page).toContain("randomReferenceForSectionExcluding");
    expect(page).toContain("seededReferenceForSectionExcluding");
  });

  it("persists the current board so refresh keeps the same cards", () => {
    expect(page).toContain("loadStoredBingoBoard");
    expect(page).toContain("saveStoredBingoBoard");
  });

  it("never reads the plan storage key directly", () => {
    expect(page).not.toContain("localStorage.getItem");
    expect(page).not.toContain("bible-reading-plan:v1");
  });
});

describe("Reading Plan board", () => {
  const component = read(path.join("components", "BibleReadingPlanProgress.tsx"));

  it("loads and saves only through the canonical service", () => {
    expect(component).toContain("subscribeToReadingPlanProgress");
    expect(component).toContain("saveReadingPlanProgress");
    expect(component).toContain("setReadingPlanEntriesCompleted");
    expect(component).not.toContain("loadChecklistProgress(");
    expect(component).not.toContain("saveChecklistProgress(");
  });
});

describe("email completion flows", () => {
  it("the emailed-batch page mirrors through the canonical service", () => {
    const component = read(path.join("components", "BibleBingoEmailBatch.tsx"));
    expect(component).toContain("setReadingPlanEntryCompleted");
    expect(component).not.toContain("saveChecklistProgress");
  });
});

describe("saved shared boards", () => {
  it("reconcile card completion from canonical progress and fail safely on empty text", () => {
    const component = read(path.join("components", "BibleBingoShareBoard.tsx"));
    expect(component).toContain("subscribeToReadingPlanProgress");
    expect(component).toContain("bibleBingoPlanEntryIdForPassage");
    expect(component).toContain("passage.text ?");
  });
});

describe("one canonical storage definition", () => {
  it("the v1 key string exists only in the service (plus its own docs)", () => {
    const offenders: string[] = [];
    const roots = ["app", "components", "lib"];
    for (const root of roots) {
      const stack = [path.join(srcRoot, root)];
      while (stack.length) {
        const dir = stack.pop()!;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (entry.name !== "__tests__" && entry.name !== "bibleText") stack.push(full);
            continue;
          }
          if (!/\.(ts|tsx)$/.test(entry.name)) continue;
          if (full.endsWith(path.join("lib", "readingPlanProgress.ts"))) continue;
          if (fs.readFileSync(full, "utf8").includes("crossheartpray:bible-reading-plan:v")) {
            offenders.push(full);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
