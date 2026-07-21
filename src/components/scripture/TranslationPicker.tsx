"use client";

// Translation choices come from the active Scripture provider and stay
// truthful: WEB is the only translation rendered inside CrossHeartPray
// ("read here"); every other choice is labeled as opening on Bible.com.
// Once the YouVersion SDK is enabled, the provider can mark licensed
// translations "readHere" and this component needs no changes.

import type { ScriptureTranslation } from "../../lib/scripture";

type TranslationPickerProps = {
  translations: ScriptureTranslation[];
  selectedId: number;
  onChange: (translation: ScriptureTranslation) => void;
  className?: string;
  ariaLabel?: string;
};

export default function TranslationPicker({
  translations,
  selectedId,
  onChange,
  className = "min-h-11 rounded-xl border border-white/15 bg-black/25 px-3 text-sm font-bold text-white outline-none focus:border-white/40",
  ariaLabel = "Translation",
}: TranslationPickerProps) {
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
      {translations.map((translation) => (
        <option key={translation.id} value={translation.id} className="bg-zinc-900 text-white">
          {translation.label}
          {translation.access === "readHere" ? " — read here" : " — on Bible.com"}
        </option>
      ))}
    </select>
  );
}
