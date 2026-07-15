import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checklistStats,
  loadChecklistProgress,
  parseChecklistProgress,
  saveChecklistProgress,
  toggleChecklistItem,
} from "../checklistProgress";

const KEY = "crossheartpray:bible-reading-plan:v1";

function fakeWindow() {
  const store = new Map<string, string>();
  const events: string[] = [];
  return {
    localStorage: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
    dispatchEvent: (e: Event) => {
      events.push(e.type);
      return true;
    },
    __events: events,
    __store: store,
  };
}

describe("parseChecklistProgress tolerates every stored shape", () => {
  it("reads the current map shape", () => {
    expect(parseChecklistProgress({ "week-1-sunday": true })).toEqual({
      "week-1-sunday": true,
    });
  });

  it("reads the legacy array-of-ids shape", () => {
    expect(parseChecklistProgress(["a", "b", 3, null])).toEqual({ a: true, b: true });
  });

  it('reads "true" strings and legacy {read/done/completed} records', () => {
    expect(
      parseChecklistProgress({
        a: "true",
        b: { read: true },
        c: { done: true },
        d: { completed: true },
        e: { read: false },
        f: false,
      }),
    ).toEqual({ a: true, b: true, c: true, d: true });
  });

  it("parses garbage to an empty map", () => {
    expect(parseChecklistProgress(null)).toEqual({});
    expect(parseChecklistProgress(42)).toEqual({});
    expect(parseChecklistProgress("done")).toEqual({});
  });
});

describe("loadChecklistProgress / saveChecklistProgress", () => {
  let win: ReturnType<typeof fakeWindow>;

  beforeEach(() => {
    win = fakeWindow();
    vi.stubGlobal("window", win);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("round-trips a progress map", () => {
    saveChecklistProgress(KEY, { "week-1-sunday": true });
    expect(loadChecklistProgress(KEY)).toEqual({ "week-1-sunday": true });
  });

  it("recovers from corrupt JSON", () => {
    win.__store.set(KEY, "{not json");
    expect(loadChecklistProgress(KEY)).toEqual({});
  });

  it("returns {} for a missing key", () => {
    expect(loadChecklistProgress("some:other:key:v1")).toEqual({});
  });

  it("dispatches the change event only when a name is given", () => {
    saveChecklistProgress(KEY, { a: true }, "crossheartpray:bible-reading-plan-progress");
    saveChecklistProgress(KEY, { a: true });
    expect(win.__events).toEqual(["crossheartpray:bible-reading-plan-progress"]);
  });

  it("keeps product namespaces separate", () => {
    saveChecklistProgress("crossheartpray:bible-reading-plan:v1", { a: true });
    saveChecklistProgress("pleasebeready:checklist:v1", { b: true });
    expect(loadChecklistProgress("crossheartpray:bible-reading-plan:v1")).toEqual({ a: true });
    expect(loadChecklistProgress("pleasebeready:checklist:v1")).toEqual({ b: true });
  });

  it("survives a throwing localStorage (private mode)", () => {
    win.localStorage.setItem = () => {
      throw new Error("quota");
    };
    expect(() => saveChecklistProgress(KEY, { a: true })).not.toThrow();
  });
});

describe("toggleChecklistItem", () => {
  it("checks an unchecked item without mutating the input", () => {
    const before = {};
    expect(toggleChecklistItem(before, "a")).toEqual({ a: true });
    expect(before).toEqual({});
  });

  it("removes (not falses) an item on uncheck", () => {
    expect(toggleChecklistItem({ a: true, b: true }, "a")).toEqual({ b: true });
  });
});

describe("checklistStats", () => {
  it("computes done/remaining/percent", () => {
    expect(checklistStats(["a", "b", "c", "d"], { a: true, b: true, x: true })).toEqual({
      done: 2,
      total: 4,
      remaining: 2,
      percent: 50,
    });
  });

  it("handles an empty checklist without dividing by zero", () => {
    expect(checklistStats([], {})).toEqual({ done: 0, total: 0, remaining: 0, percent: 0 });
  });
});
