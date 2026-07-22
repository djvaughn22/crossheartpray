// Tiny client-side event bus for the shared Scripture reader overlay.
//
// Any feature (a Bingo card, a Daily Hope card, a reading-plan cell…) calls
// openScriptureReader(reference) and the single overlay mounted in the root
// layout opens at that passage. A window event keeps this dependency-free:
// no context plumbing through server components, no state libraries.

import type { ScriptureReference } from "./reference";

export const SCRIPTURE_READER_OPEN_EVENT = "chp:scripture-reader-open";

export type ScriptureReaderOpenDetail = {
  reference: ScriptureReference;
};

/** Open the shared in-app Scripture reader at a passage. Client-side only. */
export function openScriptureReader(reference: ScriptureReference): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ScriptureReaderOpenDetail>(SCRIPTURE_READER_OPEN_EVENT, {
      detail: { reference },
    }),
  );
}
