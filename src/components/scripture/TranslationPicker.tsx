"use client";

// Translation choices come from the active capability list and stay
// truthful: "read here" marks text that genuinely renders inside
// CrossHeartPray (local WEB, or a YouVersion translation this application is
// licensed for); everything else is labeled as opening on Bible.com. When
// both kinds are present they are grouped so the split is obvious.

import type { ScriptureTranslation } from "../../lib/scripture";

type TranslationPickerProps = {
  translations: ScriptureTranslation[];
  selectedId: number;
  onChange: (translation: ScriptureTranslation) => void;
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
  className = "min-h-11 rounded-xl border border-white/15 bg-black/25 px-3 text-sm font-bold text-white outline-none focus:border-white/40",
  ariaLabel = "Translation",
}: TranslationPickerProps) {
  const readHere = translations.filter((translation) => translation.access === "readHere");
  const external = translations.filter((translation) => translation.access === "bibleComLink");

  return (
    <select
      value={selectedId}
      aria-label={ariaLabel}
      onChange={(event) => {
        const picked = translations.find(
          (translation) => translation.id === Number(event.target.value),
        );
        if (picked) onChange(picked);
      }}
      className={className}
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
}
