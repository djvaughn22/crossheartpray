// @vitest-environment jsdom

// Life Essentials must reuse the exact shared Deep Dive architecture the
// Reading Plan already proved out (fetchVerifiedWordStudies,
// hasVerifiedWordStudies/getDefaultWordStudy, OriginalWordStudyModal). This
// guards the regression where the original-language pill got permanently stuck
// disabled/"…" because its own loading effect depended on the state it wrote.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import GeneGetzFullIndex from "../GeneGetzFullIndex";
import type { LifeEssentialsPrinciple } from "../../lib/geneGetzLifeEssentials";
import type { VerifiedWordStudy } from "../../lib/originalLanguageWordStudy";

Element.prototype.scrollIntoView = vi.fn();

const HEBREW_CREATED: VerifiedWordStudy = {
  reference: "Genesis 1:1",
  code: "GEN",
  chapter: "1",
  verse: "1",
  englishWord: "created",
  language: "hebrew",
  originalWord: "בָּרָ֣א",
  transliteration: "ba.Ra'",
  strongs: "H1254",
  lemma: "בָּרָ֣א",
  morphology: "HVqp3ms",
  sourceGloss: "he created",
  lexiconMeaning: "to create",
  sourceName: "STEPBible TAHOT Hebrew alignment",
  lexiconSourceName: "STEPBible TBESH Hebrew brief lexicon",
  sourceUrl: "https://github.com/STEPBible/STEPBible-Data",
};

const GREEK_LOVED: VerifiedWordStudy = {
  reference: "John 3:16",
  code: "JHN",
  chapter: "3",
  verse: "16",
  englishWord: "loved",
  language: "greek",
  originalWord: "ἠγάπησεν",
  transliteration: "agapao",
  strongs: "G25",
  lemma: "ἀγαπάω",
  morphology: "V-AAI-3S",
  sourceGloss: "he loved",
  lexiconMeaning: "to love",
  sourceName: "MACULA Greek SBLGNT alignment",
  lexiconSourceName: "STEPBible TBESG Greek brief lexicon",
  sourceUrl: "https://github.com/Clear-Bible/macula-greek",
};

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

function wordStudiesFor(code: string | null, chapter: string | null, verse: string | null) {
  if (code === "GEN" && chapter === "1" && verse === "1") return [HEBREW_CREATED];
  if (code === "JHN" && chapter === "3" && verse === "16") return [GREEK_LOVED];
  return [];
}

let fetchCalls: string[] = [];
let deepDiveStatus = 200;

beforeEach(() => {
  fetchCalls = [];
  deepDiveStatus = 200;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("deep-dive-word-studies")) {
        fetchCalls.push(url);
        if (deepDiveStatus !== 200) {
          return new Response(JSON.stringify({}), { status: deepDiveStatus });
        }
        const params = new URL(url).searchParams;
        return new Response(
          JSON.stringify({
            wordStudies: wordStudiesFor(
              params.get("code"),
              params.get("chapter"),
              params.get("verse"),
            ),
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({}), { status: 200 });
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function expandAndFindPill(user: ReturnType<typeof userEvent.setup>, principleTitle: string) {
  const titleNode = screen.getByText(principleTitle);
  const item = titleNode.closest("li");
  if (!item) throw new Error(`Could not find <li> for principle "${principleTitle}"`);
  await user.click(within(item).getByText(principleTitle));
  return within(item).findByRole("button", { name: /^(Hebrew|Greek|…)$/ });
}

describe("the original-language control is quiet until a principle is opened", () => {
  it("is absent while the principle is collapsed", async () => {
    const user = userEvent.setup();
    render(<GeneGetzFullIndex groups={GROUPS} />);

    await user.click(screen.getByText("Genesis"));

    const item = screen.getByText("Chosen in Christ").closest("li");
    expect(item).not.toBeNull();
    expect(
      within(item!).queryByRole("button", { name: /^(Hebrew|Greek|…)$/ }),
    ).toBeNull();
  });

  it("appears once the principle is expanded, and names the right language", async () => {
    const user = userEvent.setup();
    render(<GeneGetzFullIndex groups={GROUPS} />);

    await user.click(screen.getByText("Genesis"));
    const oldTestament = await expandAndFindPill(user, "Chosen in Christ");
    expect(oldTestament.textContent).toBe("Hebrew");

    await user.click(screen.getByText("John"));
    const newTestament = await expandAndFindPill(user, "The Deity of Christ");
    expect(newTestament.textContent).toBe("Greek");
  });

  it("never offers both languages at once", async () => {
    const user = userEvent.setup();
    render(<GeneGetzFullIndex groups={GROUPS} />);

    await user.click(screen.getByText("Genesis"));
    await expandAndFindPill(user, "Chosen in Christ");

    expect(screen.queryByText("Hebrew/Greek")).toBeNull();
  });
});

describe("Life Essentials Deep Dive reuses the shared architecture", () => {
  it("an Old Testament Life Essentials verse enables Hebrew", async () => {
    const user = userEvent.setup();
    render(<GeneGetzFullIndex groups={GROUPS} />);

    await user.click(screen.getByText("Genesis"));
    const pill = await expandAndFindPill(user, "Chosen in Christ");

    await waitFor(() => expect((pill as HTMLButtonElement).disabled).toBe(false));
    expect(pill.textContent).toBe("Hebrew");
  });

  it("a New Testament Life Essentials verse enables Greek", async () => {
    const user = userEvent.setup();
    render(<GeneGetzFullIndex groups={GROUPS} />);

    await user.click(screen.getByText("John"));
    const pill = await expandAndFindPill(user, "The Deity of Christ");

    await waitFor(() => expect((pill as HTMLButtonElement).disabled).toBe(false));
    expect(pill.textContent).toBe("Greek");
  });

  it("the enabled control opens the shared Deep Dive UI", async () => {
    const user = userEvent.setup();
    render(<GeneGetzFullIndex groups={GROUPS} />);

    await user.click(screen.getByText("Genesis"));
    const pill = await expandAndFindPill(user, "Chosen in Christ");
    await waitFor(() => expect((pill as HTMLButtonElement).disabled).toBe(false));

    await user.click(pill);
    await screen.findByRole("dialog", { name: "Behind the Verse" });
    expect(screen.getAllByText("H1254").length).toBeGreaterThan(0);
  });

  it("the exact book, chapter, and verse reach the shared request", async () => {
    const user = userEvent.setup();
    render(<GeneGetzFullIndex groups={GROUPS} />);

    await user.click(screen.getByText("John"));
    await expandAndFindPill(user, "The Deity of Christ");

    await waitFor(() =>
      expect(fetchCalls.some((url) => url.includes("code=JHN") && url.includes("chapter=3") && url.includes("verse=16"))).toBe(true),
    );
  });

  it("closing Deep Dive preserves the selected principle and verse", async () => {
    const user = userEvent.setup();
    render(<GeneGetzFullIndex groups={GROUPS} />);

    await user.click(screen.getByText("Genesis"));
    const pill = await expandAndFindPill(user, "Chosen in Christ");
    await waitFor(() => expect((pill as HTMLButtonElement).disabled).toBe(false));

    await user.click(pill);
    await screen.findByRole("dialog", { name: "Behind the Verse" });

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Behind the Verse" })).toBeNull();
    // The principle stays expanded and its text is still shown.
    expect(screen.getByText("To have an abundant life now and eternally.")).toBeTruthy();
  });

  it("a loading state does not remain disabled forever", async () => {
    const user = userEvent.setup();
    render(<GeneGetzFullIndex groups={GROUPS} />);

    const pill = await expandAndFindPill(user, "Chosen in Christ");
    // It must not still say "…" (stuck checking) once the fetch has settled.
    await waitFor(() => expect(pill.textContent).toBe("Hebrew"), { timeout: 3000 });
    expect((pill as HTMLButtonElement).disabled).toBe(false);
  });

  it("a real error produces an honest unavailable state, not a permanently decorative control", async () => {
    deepDiveStatus = 500;
    const user = userEvent.setup();
    render(<GeneGetzFullIndex groups={GROUPS} />);

    const pill = await expandAndFindPill(user, "Chosen in Christ");
    await waitFor(() => expect(pill.title).toBe("Deep Dive opens when this verse has verified underlined word links."));
    // Disabled honestly (no data), but reached a final state instead of hanging on "…".
    expect((pill as HTMLButtonElement).disabled).toBe(true);
    expect(pill.textContent).not.toBe("…");
  });

  it("no external Bible link is rendered", async () => {
    const user = userEvent.setup();
    render(<GeneGetzFullIndex groups={GROUPS} />);

    const pill = await expandAndFindPill(user, "Chosen in Christ");
    await waitFor(() => expect((pill as HTMLButtonElement).disabled).toBe(false));

    const links = screen.queryAllByRole("link");
    for (const link of links) {
      const href = link.getAttribute("href") ?? "";
      expect(href).not.toMatch(/bible\.com|biblehub/i);
    }
  });
});
