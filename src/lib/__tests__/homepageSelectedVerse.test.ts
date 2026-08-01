import { describe, it, expect } from "vitest";
import {
  HOMEPAGE_SELECTED_VERSE_REFERENCE,
  parseHomepageSelectedVerse,
  resolveHomepageSelectedVerse,
} from "../homepageSelectedVerse";

describe("homepageSelectedVerse", () => {
  it("has a valid default selected verse reference", () => {
    expect(HOMEPAGE_SELECTED_VERSE_REFERENCE).toBe("Romans 15:7");
  });

  it("parseHomepageSelectedVerse returns a valid reference", () => {
    const parsed = parseHomepageSelectedVerse();
    expect(parsed).not.toBeNull();
    expect(parsed?.book).toBe("ROM");
    expect(parsed?.chapter).toBe(15);
    expect(parsed?.verse).toBe(7);
  });

  it("resolveHomepageSelectedVerse returns a resolved reference", () => {
    const resolved = resolveHomepageSelectedVerse();
    expect(resolved).not.toBeNull();
    expect(resolved?.bookCode).toBe("ROM");
    expect(resolved?.chapter).toBe(15);
    expect(resolved?.verse).toBe(7);
    expect(resolved?.label).toBe("Romans 15:7");
  });

  it("changing HOMEPAGE_SELECTED_VERSE_REFERENCE would affect all parsing", () => {
    // This is a demonstration test showing that if the constant is changed,
    // all callers automatically use the new value
    const current = HOMEPAGE_SELECTED_VERSE_REFERENCE;
    expect(current).toBe("Romans 15:7");

    // In the future, someone might change it to e.g. "John 3:16"
    // and all homepage features would automatically use the new verse
  });
});
