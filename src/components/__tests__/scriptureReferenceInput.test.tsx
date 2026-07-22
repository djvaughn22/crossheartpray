// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ScriptureReferenceInput from "../scripture/ScriptureReferenceInput";

// jsdom has no scrollIntoView.
Element.prototype.scrollIntoView = vi.fn();

afterEach(cleanup);

describe("ScriptureReferenceInput — accessible Bible-reference combobox", () => {
  it('suggests Revelation for "rev"', async () => {
    const user = userEvent.setup();
    render(<ScriptureReferenceInput onSelect={vi.fn()} bookSelection="refine" />);

    const input = screen.getByRole("combobox");
    await user.type(input, "rev");

    const listbox = screen.getByRole("listbox");
    expect(listbox).toBeTruthy();
    const options = screen.getAllByRole("option");
    expect(options[0].textContent).toContain("Revelation");
    expect(input.getAttribute("aria-expanded")).toBe("true");
  });

  it("Arrow Down then Enter commits Revelation into the input and keeps focus (refine mode)", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ScriptureReferenceInput onSelect={onSelect} bookSelection="refine" />);

    const input = screen.getByRole("combobox") as HTMLInputElement;
    await user.type(input, "rev");
    await user.keyboard("{ArrowDown}");

    // The first option is active and referenced for screen readers.
    expect(input.getAttribute("aria-activedescendant")).toBeTruthy();

    await user.keyboard("{Enter}");

    expect(input.value).toBe("Revelation ");
    expect(document.activeElement).toBe(input);
    // A book-only commit refines the search — it does not run one.
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("continuing with a chapter:verse then Enter runs the search with the full reference", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ScriptureReferenceInput onSelect={onSelect} bookSelection="refine" />);

    const input = screen.getByRole("combobox") as HTMLInputElement;
    await user.type(input, "rev");
    await user.keyboard("{ArrowDown}{Enter}");
    await user.type(input, "21:4");
    await user.keyboard("{Enter}");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].reference).toEqual({
      book: "REV",
      chapter: 21,
      verse: 4,
    });
  });

  it("mouse selection commits before the list can close on blur", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ScriptureReferenceInput onSelect={onSelect} bookSelection="refine" />);

    const input = screen.getByRole("combobox") as HTMLInputElement;
    await user.type(input, "rev");

    // pointerdown commits ahead of any blur-driven close.
    await user.pointer({ keys: "[MouseLeft>]", target: screen.getAllByRole("option")[0] });

    expect(input.value).toBe("Revelation ");
    expect(document.activeElement).toBe(input);
  });

  it("Escape closes the list without corrupting the typed text", async () => {
    const user = userEvent.setup();
    render(<ScriptureReferenceInput onSelect={vi.fn()} bookSelection="refine" />);

    const input = screen.getByRole("combobox") as HTMLInputElement;
    await user.type(input, "rev");
    expect(screen.queryByRole("listbox")).toBeTruthy();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("listbox")).toBeNull();
    expect(input.value).toBe("rev");
  });

  it("selecting a complete suggestion fires onSelect with the structured reference", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ScriptureReferenceInput onSelect={onSelect} bookSelection="refine" />);

    const input = screen.getByRole("combobox");
    await user.type(input, "Revelation 21:4");
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].reference).toEqual({
      book: "REV",
      chapter: 21,
      verse: 4,
    });
  });

  it("navigate mode (the reader's go-to box) still selects a book immediately", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ScriptureReferenceInput onSelect={onSelect} />);

    const input = screen.getByRole("combobox");
    await user.type(input, "rev");
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].reference).toEqual({ book: "REV" });
  });
});
