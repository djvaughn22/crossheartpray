"use client";

// Opens Scripture internally in a modal reader instead of linking out.
// The reader provides translation picking, navigation, and a secondary
// "Open Bible.com" action at the bottom for those who want it.

import { useState } from "react";
import {
  formatScriptureReference,
  type ScriptureReference,
} from "../../lib/scripture";
import ScriptureReaderModal from "./ScriptureReaderModal";

type ReadInContextButtonProps = {
  reference: ScriptureReference;
  version?: { id: number; abbreviation: string; label: string };
  label?: string;
  className?: string;
};

export default function ReadInContextButton({
  reference,
  version,
  label,
  className = "inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-black text-white transition hover:bg-white/15",
}: ReadInContextButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={className}
        aria-label={`Read ${formatScriptureReference(reference)}`}
      >
        {label ?? "Read"} <span aria-hidden="true">↗</span>
      </button>
      {isOpen && <ScriptureReaderModal reference={reference} onClose={() => setIsOpen(false)} />}
    </>
  );
}
