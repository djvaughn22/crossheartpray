"use client";

// Translation choices come from the active capability list and stay
// truthful: "read here" marks text that genuinely renders inside
// CrossHeartPray (local WEB, or a YouVersion translation this application is
// licensed for); everything else is labeled as opening on Bible.com. When
// both kinds are present they are grouped so the split is obvious.
//
// Compact mode shows a quiet abbreviation pill ("WEB ▾") while keeping the
// full native select underneath — the platform picker stays accessible and
// familiar, the reader top bar stays calm.

import type { ScriptureTranslation } from "../../lib/scripture";

type TranslationPickerProps = {
  translations: ScriptureTranslation[];
  selectedId: number;
  onChange: (translation: ScriptureTranslation) => void;
  /** Render as a compact abbreviation pill (reader top bar). */
  compact?: boolean;
  className?: string;
  ariaLabel?: string;
};

function optionFor(translation: ScriptureTranslation) {
  return (
    <option key={translation.id} value={translation.id} className="bg-zinc-900 text-white">
      {translation.label}
      {translation.access === "readHere" ? " — read here" : " — on Bible.com"}
    </option>
  );
}

export default function TranslationPicker({
  translations,
  selectedId,
  onChange,
  compact = false,
  className = "",
  ariaLabel = "Translation",
}: TranslationPickerProps) {
  const readHere = translations.filter((translation) => translation.access === "readHere");
  const external = translations.filter((translation) => translation.access === "bibleComLink");
  const selected = translations.find((translation) => translation.id === selectedId);

  const select = (
    <select
      value={selectedId}
      aria-label={ariaLabel}
      onChange={(event) => {
        const picked = translations.find(
          (translation) => translation.id === Number(event.target.value),
        );
        if (picked) onChange(picked);
      }}
      className={
        compact
          ? "absolute inset-0 h-full w-full cursor-pointer opacity-0"
          : className ||
            "min-h-11 rounded-xl border border-white/15 bg-black/25 px-3 text-sm font-bold text-white outline-none focus:border-white/40"
      }
    >
      {readHere.length > 0 && external.length > 0 ? (
        <>
          <optgroup label="Read here">{readHere.map(optionFor)}</optgroup>
          <optgroup label="Open on Bible.com">{external.map(optionFor)}</optgroup>
        </>
      ) : (
        translations.map(optionFor)
      )}
    </select>
  );

  if (!compact) return select;

  return (
    <div
      className={`relative inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-4 transition focus-within:border-white/45 hover:bg-white/15 ${className}`}
    >
      <span aria-hidden="true" className="text-sm font-black text-white">
        {selected?.label ?? "WEB"}
      </span>
      <span aria-hidden="true" className="text-[0.6rem] text-zinc-400">
        ▼
      </span>
      {select}
    </div>
  );
}
