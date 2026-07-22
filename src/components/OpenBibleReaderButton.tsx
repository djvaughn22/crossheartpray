"use client";

import type { CSSProperties, ReactNode } from "react";
import { openScriptureReader, type ScriptureReference } from "../lib/scripture";

// A button that opens the shared in-site Scripture reader — the same overlay
// every "Read here" control uses. Defaults to John 1, a natural first chapter.
export default function OpenBibleReaderButton({
  reference = { book: "JHN", chapter: 1 },
  className,
  style,
  children,
}: {
  reference?: ScriptureReference;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => openScriptureReader(reference)}
      className={className}
      style={style}
    >
      {children}
    </button>
  );
}
