// @vitest-environment jsdom

// Life Essentials must NOT carry its own Deep Dive launcher.
//
// Owner decision 2026-08-08: Deep Dive is reached the one established way —
// dotted-underlined Scripture words inside the shared ScriptureReader, which
// Life Essentials already opens through Read. A large pill sitting beside Read
// and Watch on a 1,500-row index duplicated that, competed with the two real
// actions, and made a per-verse claim ("Hebrew/Greek") that is never true of
// any single verse.
//
// These tests guard the removal in both directions: the pill must not come
// back, and Read/Watch must keep working exactly as before.

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import GeneGetzFullIndex from "../GeneGetzFullIndex";
import type { LifeEssentialsPrinciple } from "../../lib/geneGetzLifeEssentials";

Element.prototype.scrollIntoView = vi.fn();

const OT_PRINCIPLE: LifeEssentialsPrinciple = {
  code: "GEN",
  book: "Genesis",
  startChapter: 1,
  startVerse: 1,
  endChapter: 1,
  endVerse: 25,
  principleNumber: 1,
  principleTitle: "Chosen in Christ",
  shortPrincipleSummary: "To have an abundant life now and eternally.",
  officialVideoUrl: "https://ssl.bhpublishinggroup.com/QR/GetzBible/0001/",
  youtubeId: "bRpmHY2Q91c",
  referenceNote: "p. 5",
  verified: true,
};

const NT_PRINCIPLE: LifeEssentialsPrinciple = {
  code: "JHN",
  book: "John",
  startChapter: 3,
  startVerse: 16,
  endChapter: 3,
  endVerse: 16,
  principleNumber: 40,
  principleTitle: "The Deity of Christ",
  shortPrincipleSummary: "God so loved the world.",
  officialVideoUrl: "https://ssl.bhpublishinggroup.com/QR/GetzBible/0040/",
  youtubeId: "abc123",
  referenceNote: "p. 40",
  verified: true,
};

const GROUPS = [
  { book: "Genesis", items: [OT_PRINCIPLE] },
  { book: "John", items: [NT_PRINCIPLE] },
];

const LANGUAGE_PILL = /^(Hebrew|Greek|Hebrew\/Greek|Greek\/Hebrew|…)$/;

afterEach(cleanup);

async function openBookAndPrinciple(
  user: ReturnType<typeof userEvent.setup>,
  book: string,
  principleTitle: string,
) {
  await user.click(screen.getByText(book));
  const item = screen.getByText(principleTitle).closest("li");
  if (!item) throw new Error(`No <li> for "${principleTitle}"`);
  await user.click(within(item).getByText(principleTitle));
  return item;
}

describe("Life Essentials carries no Deep Dive pill", () => {
  it("shows no language pill on a collapsed principle", async () => {
    const user = userEvent.setup();
    render(<GeneGetzFullIndex groups={GROUPS} />);

    await user.click(screen.getByText("Genesis"));

    expect(screen.queryByRole("button", { name: LANGUAGE_PILL })).toBeNull();
  });

  it("shows no language pill once the principle is expanded either", async () => {
    const user = userEvent.setup();
    render(<GeneGetzFullIndex groups={GROUPS} />);

    const item = await openBookAndPrinciple(user, "Genesis", "Chosen in Christ");

    // The principle really is open — its summary text is showing.
    expect(
      within(item).getByText("To have an abundant life now and eternally."),
    ).toBeTruthy();
    expect(within(item).queryByRole("button", { name: LANGUAGE_PILL })).toBeNull();
    expect(screen.queryByRole("button", { name: LANGUAGE_PILL })).toBeNull();
  });

  it("shows no language pill for a New Testament principle", async () => {
    const user = userEvent.setup();
    render(<GeneGetzFullIndex groups={GROUPS} />);

    const item = await openBookAndPrinciple(user, "John", "The Deity of Christ");
    expect(within(item).queryByRole("button", { name: LANGUAGE_PILL })).toBeNull();
  });

  it("never renders the words Hebrew or Greek as an action on the index", async () => {
    const user = userEvent.setup();
    render(<GeneGetzFullIndex groups={GROUPS} />);

    await openBookAndPrinciple(user, "Genesis", "Chosen in Christ");

    expect(screen.queryByText("Hebrew/Greek")).toBeNull();
    expect(screen.queryByText("Hebrew")).toBeNull();
    expect(screen.queryByText("Greek")).toBeNull();
  });
});

describe("Read and Watch are untouched", () => {
  it("keeps exactly two actions on a principle row: Read and Watch", async () => {
    const user = userEvent.setup();
    render(<GeneGetzFullIndex groups={GROUPS} />);

    await user.click(screen.getByText("Genesis"));
    const item = screen.getByText("Chosen in Christ").closest("li")!;

    const actions = within(item)
      .getAllByRole("button")
      .map((b) => b.textContent?.trim() ?? "")
      // Drop the row's own expand/collapse control, which carries the title.
      .filter((t) => !t.includes("Chosen in Christ"));

    expect(actions).toEqual(["Read", "▶ Watch"]);
  });

  it("still opens the Watch modal", async () => {
    const user = userEvent.setup();
    render(<GeneGetzFullIndex groups={GROUPS} />);

    await user.click(screen.getByText("Genesis"));
    const item = screen.getByText("Chosen in Christ").closest("li")!;
    await user.click(within(item).getByRole("button", { name: "▶ Watch" }));

    expect(
      screen.getByTitle(/Principle 1 · Chosen in Christ|Chosen in Christ/),
    ).toBeTruthy();
  });

  it("still offers Read for the principle's passage", async () => {
    const user = userEvent.setup();
    render(<GeneGetzFullIndex groups={GROUPS} />);

    await user.click(screen.getByText("Genesis"));
    const item = screen.getByText("Chosen in Christ").closest("li")!;

    expect(within(item).getByRole("button", { name: /Read Genesis/i })).toBeTruthy();
  });
});

describe("the Life Essentials-specific Deep Dive implementation is gone for good", () => {
  const source = readFileSync(
    join(process.cwd(), "src/components/GeneGetzFullIndex.tsx"),
    "utf8",
  );

  it("does not re-implement word studies inside the index", () => {
    for (const symbol of [
      "OriginalWordStudyModal",
      "fetchVerifiedWordStudies",
      "hasVerifiedWordStudies",
      "getDefaultWordStudy",
      "openDeepDive",
    ]) {
      expect(source, symbol).not.toContain(symbol);
    }
  });

  it("names no original language as an action label", () => {
    expect(source).not.toMatch(/"(Hebrew|Greek|Hebrew\/Greek)"/);
  });

  // Deep Dive still reaches Life Essentials readers — through Read, which
  // opens the shared reader where dotted words are the interaction.
  it("still routes readers into the shared reader via Read", () => {
    expect(source).toContain("CardReadMenu");

    const readMenu = readFileSync(
      join(process.cwd(), "src/components/CardReadMenu.tsx"),
      "utf8",
    );
    expect(readMenu).toContain("KindleReaderModal");

    const reader = readFileSync(
      join(process.cwd(), "src/components/scripture/ScriptureReader.tsx"),
      "utf8",
    );
    expect(reader).toContain("VerifiedVerseText");

    const verseText = readFileSync(
      join(process.cwd(), "src/components/VerifiedVerseText.tsx"),
      "utf8",
    );
    expect(verseText).toContain("decoration-dotted");
  });
});
