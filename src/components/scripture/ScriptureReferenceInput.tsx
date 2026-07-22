"use client";

// Shared Scripture reference picker — the one search box every Bible feature
// uses. Accessible combobox (ARIA 1.2 pattern): typed text produces instant
// local suggestions ("John 3" → John 3 / John 30 / John 31…), arrow keys +
// Enter select, Escape closes, taps work on touch. Selecting returns a
// structured ScriptureReference — callers never parse raw strings.

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { getScriptureProvider, type ScriptureSuggestion } from "../../lib/scripture";

const provider = getScriptureProvider();

type ScriptureReferenceInputProps = {
  onSelect: (suggestion: ScriptureSuggestion) => void;
  /**
   * Controlled value. When provided, the host owns the text (pass
   * onQueryChange to receive edits) — used by search boxes that mirror the
   * canonical selected reference back into the field.
   */
  value?: string;
  /** Raw text as typed — lets a host form keep its own submit button working. */
  onQueryChange?: (query: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  initialValue?: string;
  className?: string;
  inputClassName?: string;
  /** Clear the input after a pick (useful for "jump to" boxes). */
  clearOnSelect?: boolean;
  /**
   * How picking a book-only suggestion behaves:
   * - "navigate" (default): fires onSelect immediately (the reader's go-to
   *   box opens the book at chapter 1).
   * - "refine": commits the book name into the field, keeps focus, and keeps
   *   suggesting so the person can continue typing a chapter or verse
   *   ("Revelation" → "Revelation 21:4"). Search boxes use this.
   */
  bookSelection?: "navigate" | "refine";
};

export default function ScriptureReferenceInput({
  onSelect,
  value,
  onQueryChange,
  placeholder = "John 3:16",
  ariaLabel = "Search for a Bible reference",
  initialValue = "",
  className = "",
  inputClassName = "",
  clearOnSelect = false,
  bookSelection = "navigate",
}: ScriptureReferenceInputProps) {
  const listboxId = useId();
  const [internalQuery, setInternalQuery] = useState(initialValue);
  const query = value ?? internalQuery;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const suggestions = useMemo(
    () => (query.trim() ? provider.suggestReferences(query) : []),
    [query],
  );

  const updateQuery = useCallback(
    (next: string) => {
      setInternalQuery(next);
      onQueryChange?.(next);
    },
    [onQueryChange],
  );

  const pick = useCallback(
    (suggestion: ScriptureSuggestion) => {
      // In "refine" mode a book-only pick commits the book name and keeps
      // the person typing toward a chapter/verse instead of searching yet.
      if (bookSelection === "refine" && suggestion.reference.chapter === undefined) {
        updateQuery(`${suggestion.label} `);
        setOpen(true);
        setActiveIndex(-1);
        inputRef.current?.focus();
        return;
      }
      updateQuery(clearOnSelect ? "" : suggestion.label);
      setOpen(false);
      setActiveIndex(-1);
      onSelect(suggestion);
    },
    [bookSelection, clearOnSelect, updateQuery, onSelect],
  );

  // Keep the active option visible while arrowing through a scrolled list.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    document
      .getElementById(`${listboxId}-option-${activeIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex, listboxId]);

  // Close when focus/taps land outside (covers touch without blur races).
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (suggestions.length === 0) return;
      setOpen(true);
      setActiveIndex((index) => (index + 1) % suggestions.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (suggestions.length === 0) return;
      setOpen(true);
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
      return;
    }
    if (event.key === "Enter") {
      const active = activeIndex >= 0 ? suggestions[activeIndex] : suggestions[0];
      if (open && active) {
        event.preventDefault();
        pick(active);
        return;
      }
      // No open suggestion: accept exact typed references ("John 3:16").
      if (provider.resolveReference(query)) {
        event.preventDefault();
        const fallback = provider.suggestReferences(query)[0];
        if (fallback) pick(fallback);
      }
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (event.key === "Tab") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const showList = open && suggestions.length > 0;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listboxId}
        aria-activedescendant={
          showList && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
        }
        aria-autocomplete="list"
        aria-label={ariaLabel}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        inputMode="text"
        enterKeyHint="search"
        placeholder={placeholder}
        value={query}
        onChange={(event) => {
          updateQuery(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className={
          inputClassName ||
          "min-h-14 w-full rounded-2xl border border-white/15 bg-black/25 px-5 text-lg font-semibold text-white placeholder:text-white/35 outline-none ring-0 focus:border-white/40"
        }
      />

      {showList && (
        <ul
          id={listboxId}
          role="listbox"
          data-scripture-listbox=""
          aria-label="Bible reference suggestions"
          className="absolute left-0 right-0 top-full z-40 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-white/15 bg-zinc-900/95 p-1.5 text-left shadow-2xl shadow-black/40 backdrop-blur"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.label}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              // pointerdown so selection wins the race against input blur.
              onPointerDown={(event) => {
                event.preventDefault();
                pick(suggestion);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={`flex min-h-11 cursor-pointer items-baseline justify-between gap-3 rounded-xl px-4 py-2.5 ${
                index === activeIndex ? "bg-white/15" : "hover:bg-white/10"
              }`}
            >
              <span className="text-base font-bold text-white">{suggestion.label}</span>
              <span className="shrink-0 text-xs font-semibold text-zinc-400">
                {suggestion.detail}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
