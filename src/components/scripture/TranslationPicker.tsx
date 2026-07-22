"use client";

// Choosing a Bible — not decoding a developer dropdown.
//
// The trigger is a quiet pill in the reader top bar; tapping it opens a
// portaled "Choose a Bible" dialog (bottom sheet on phones, centered card on
// larger screens). Every translation renders as a card: full name first
// ("World English Bible"), short code second, and one plain line saying what
// happens — "Reads inside CrossHeartPray" or "Opens in YouVersion".
//
// The default view stays small (Recommended + a "More translations" reveal),
// search matches full names and abbreviations, the current Bible is clearly
// marked, and a tiny legend at the bottom explains the two access kinds.
//
// Presentation only: translations come from the same capability list as
// before, onChange fires the same way, and nothing here touches licensing,
// providers, or API logic. Tab and Escape stop propagating so the Scripture
// reader overlay's own focus trap never fights this dialog.

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  isRecommendedTranslation,
  matchesTranslationSearch,
  recommendedRank,
  translationDisplayName,
  type ScriptureTranslation,
} from "../../lib/scripture";

type TranslationPickerProps = {
  translations: ScriptureTranslation[];
  selectedId: number;
  onChange: (translation: ScriptureTranslation) => void;
  /** Render the trigger as a compact pill (reader top bar). */
  compact?: boolean;
  className?: string;
  ariaLabel?: string;
};

const SECTION_LABEL_CLASS =
  "px-1 text-[0.65rem] font-black uppercase tracking-[0.18em] text-zinc-500";

export default function TranslationPicker({
  translations,
  selectedId,
  onChange,
  compact = false,
  className = "",
  ariaLabel = "Choose a Bible",
}: TranslationPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const selected = translations.find((translation) => translation.id === selectedId);

  const recommended = useMemo(
    () =>
      translations
        .filter(isRecommendedTranslation)
        .sort((a, b) => recommendedRank(a) - recommendedRank(b)),
    [translations],
  );
  const more = useMemo(
    () => translations.filter((translation) => !isRecommendedTranslation(translation)),
    [translations],
  );

  const searching = query.trim().length > 0;
  const results = searching
    ? translations.filter((translation) => matchesTranslationSearch(translation, query))
    : [];

  function openPicker() {
    setQuery("");
    // The current Bible must be on screen when the picker opens.
    setMoreOpen(selected ? !isRecommendedTranslation(selected) : false);
    setOpen(true);
  }

  function closePicker() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  // While open: lock page scroll (save/restore nests safely inside the
  // reader overlay's own lock) and move focus into the dialog.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function onDialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      // Close only the picker — not the Scripture reader behind it.
      event.stopPropagation();
      event.preventDefault();
      closePicker();
      return;
    }
    if (event.key === "Tab") {
      event.stopPropagation();
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>("button:not([disabled]), input"),
      ).filter((element) => element.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  function bibleCard(translation: ScriptureTranslation) {
    const isSelected = translation.id === selectedId;
    const readsHere = translation.access === "readHere";
    return (
      <button
        key={translation.id}
        type="button"
        aria-current={isSelected ? "true" : undefined}
        onClick={() => {
          onChange(translation);
          closePicker();
        }}
        className={`w-full rounded-2xl border p-4 text-left transition ${
          isSelected
            ? "chp-bible-card-selected border-emerald-300/45 bg-emerald-300/10"
            : "border-white/10 bg-white/5 hover:bg-white/10"
        }`}
      >
        <span className="flex items-baseline justify-between gap-3">
          <span className="chp-scripture-serif min-w-0 text-[1.05rem] font-bold leading-6 text-white">
            {translationDisplayName(translation)}
          </span>
          <span className="shrink-0 text-[0.65rem] font-black tracking-wide text-zinc-500">
            {translation.label}
          </span>
        </span>
        <span
          className={`mt-1.5 flex items-center gap-1.5 text-xs font-semibold ${
            readsHere ? "text-emerald-200/90" : "text-zinc-400"
          }`}
        >
          <span aria-hidden="true">{readsHere ? "📖" : "↗"}</span>
          {readsHere ? "Reads inside CrossHeartPray" : "Opens in YouVersion"}
          {isSelected ? (
            <span className="ml-auto shrink-0 rounded-full border border-emerald-200/35 bg-emerald-300/10 px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-[0.12em] text-emerald-100">
              ✓ Selected
            </span>
          ) : null}
        </span>
      </button>
    );
  }

  const triggerAria = selected
    ? `${ariaLabel} — currently ${translationDisplayName(selected)}`
    : ariaLabel;

  const trigger = compact ? (
    <button
      ref={triggerRef}
      type="button"
      onClick={openPicker}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={triggerAria}
      className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-4 text-sm font-black text-white transition hover:bg-white/15 focus:border-white/45 ${className}`}
    >
      <span aria-hidden="true">📖</span>
      <span aria-hidden="true">{selected?.label ?? "WEB"}</span>
      <span aria-hidden="true" className="text-[0.6rem] text-zinc-400">
        ▼
      </span>
    </button>
  ) : (
    <button
      ref={triggerRef}
      type="button"
      onClick={openPicker}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={triggerAria}
      className={
        className ||
        "flex w-full flex-col items-start gap-0.5 rounded-2xl border border-white/15 bg-black/25 px-4 py-3 text-left transition hover:bg-black/35"
      }
    >
      <span className="chp-scripture-serif text-base font-bold text-white">
        {selected ? translationDisplayName(selected) : "Choose a Bible"}
      </span>
      <span className="text-xs font-semibold text-zinc-400">Choose a Bible ▾</span>
    </button>
  );

  const dialog =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            onClick={closePicker}
            onKeyDown={onDialogKeyDown}
            className="chp-picker-backdrop fixed inset-0 z-[950] flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
          >
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Choose a Bible"
              tabIndex={-1}
              onClick={(event) => event.stopPropagation()}
              className="chp-picker-panel flex max-h-[min(85dvh,44rem)] w-full flex-col overflow-hidden rounded-t-[1.75rem] border border-white/15 bg-slate-950 pb-[env(safe-area-inset-bottom)] shadow-2xl shadow-black/60 outline-none sm:max-w-md sm:rounded-[1.75rem]"
            >
              <div className="flex shrink-0 items-center justify-between gap-3 px-5 pt-4">
                <h2 className="chp-scripture-serif text-xl font-bold tracking-tight text-white">
                  Choose a Bible
                </h2>
                <button
                  type="button"
                  onClick={closePicker}
                  aria-label="Close Bible picker"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-base font-black text-white transition hover:bg-white/20"
                >
                  ✕
                </button>
              </div>

              <div className="shrink-0 px-5 pt-3">
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder='Search — try "King James" or "NIV"'
                  aria-label="Search Bibles by name or abbreviation"
                  className="min-h-11 w-full rounded-xl border border-white/10 bg-black/25 px-4 text-sm font-semibold text-white placeholder:text-white/30 outline-none focus:border-white/40"
                />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {searching ? (
                  results.length > 0 ? (
                    <div className="space-y-2.5">{results.map(bibleCard)}</div>
                  ) : (
                    <p className="px-2 py-8 text-center text-sm font-semibold leading-6 text-zinc-400">
                      No Bibles match &ldquo;{query.trim()}&rdquo;. Try a name like
                      &ldquo;King James&rdquo;.
                    </p>
                  )
                ) : (
                  <>
                    <p className={SECTION_LABEL_CLASS}>Recommended</p>
                    <div className="mt-2 space-y-2.5">{recommended.map(bibleCard)}</div>

                    {more.length > 0 ? (
                      moreOpen ? (
                        <>
                          <p className={`mt-5 ${SECTION_LABEL_CLASS}`}>More translations</p>
                          <div className="mt-2 space-y-2.5">{more.map(bibleCard)}</div>
                        </>
                      ) : (
                        <button
                          type="button"
                          aria-expanded={false}
                          onClick={() => setMoreOpen(true)}
                          className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-bold text-zinc-300 transition hover:bg-white/10"
                        >
                          More translations ▾
                        </button>
                      )
                    ) : null}
                  </>
                )}
              </div>

              {/* Tiny legend — the whole idea in two lines. */}
              <div className="shrink-0 space-y-1 border-t border-white/10 px-5 py-3">
                <p className="text-[11px] leading-4 text-zinc-400">
                  <span className="font-bold text-zinc-200">
                    <span aria-hidden="true">📖</span> Read Here
                  </span>
                  {" — "}Read the Bible without leaving CrossHeartPray.
                </p>
                <p className="text-[11px] leading-4 text-zinc-400">
                  <span className="font-bold text-zinc-200">
                    <span aria-hidden="true">↗</span> Open in YouVersion
                  </span>
                  {" — "}Opens the official YouVersion Bible.
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {trigger}
      {dialog}
    </>
  );
}
