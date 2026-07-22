// The one way CrossHeartPray links out to Bible.com. Renders an external
// link for a structured reference; the translation defaults to WEB like every
// existing deep link on the site.

import {
  BIBLE_COM_DEFAULT_VERSION,
  bibleComUrl,
  formatScriptureReference,
  type ScriptureReference,
} from "../../lib/scripture";

type ReadInContextButtonProps = {
  reference: ScriptureReference;
  version?: { id: number; abbreviation: string; label: string };
  label?: string;
  className?: string;
};

export default function ReadInContextButton({
  reference,
  version = BIBLE_COM_DEFAULT_VERSION,
  label,
  className = "inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-black text-white transition hover:bg-white/15",
}: ReadInContextButtonProps) {
  return (
    <a
      href={bibleComUrl(reference, version)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={`Open ${formatScriptureReference(reference)} on Bible.com in a new tab`}
    >
      {label ?? "Bible.com"} <span aria-hidden="true">↗</span>
    </a>
  );
}
