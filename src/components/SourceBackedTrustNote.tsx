const sourceLinks = [
  {
    label: "Bible.com / YouVersion",
    href: "https://www.bible.com/",
    description: "Bible reading, sharing, and full chapter context.",
  },
  {
    label: "World English Bible",
    href: "https://worldenglish.bible/",
    description: "Public-facing information for the WEB / WEBUS Bible text.",
  },
  {
    label: "STEP Bible",
    href: "https://www.stepbible.org/",
    description: "Original-language Bible study tools, lexicons, Strong’s numbers, and interlinear references.",
  },
  {
    label: "Open Scriptures Hebrew Bible",
    href: "https://hb.openscriptures.org/",
    description: "Hebrew Bible lemma and morphology reference project.",
  },
  {
    label: "MorphGNT",
    href: "https://morphgnt.org/",
    description: "Greek New Testament morphology and linguistic reference data.",
  },
];

export default function SourceBackedTrustNote() {
  return (
    <section
      aria-labelledby="source-backed-trust-note"
      className="mx-auto mt-12 w-full max-w-3xl rounded-3xl border border-white/15 bg-white/8 px-5 py-6 text-left shadow-sm sm:px-7"
    >
      <p className="text-center text-2xl" aria-hidden="true">
        ✝️ ❤️ 🙏
      </p>

      <h2
        id="source-backed-trust-note"
        className="mt-3 text-center text-xl font-semibold tracking-tight text-white"
      >
        No AI Bible interpretation.
      </h2>

      <div className="mt-4 space-y-3 text-sm leading-6 text-white/82 sm:text-base">
        <p>
          Cross Heart Pray does not use AI to explain what Scripture means.
        </p>

        <p>
          Bible Bingo uses local Bible verse data so the experience is fast,
          simple, and consistent. Verse links open to Bible.com so you can read
          the full chapter in context.
        </p>

        <p>
          Deep Dive only shows original-language word study when Hebrew or Greek
          data is source-backed: original word, transliteration, lemma, Strong’s
          number, morphology, gloss, lexicon meaning, and source links when
          available.
        </p>

        <p className="font-semibold text-white">
          If a word cannot be verified, Cross Heart Pray does not guess.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/15 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
          7-second version
        </p>
        <p className="mt-2 text-sm leading-6 text-white/86 sm:text-base">
          Bible Bingo is local. Deep Dive is sourced. AI does not interpret
          Scripture here. Verified original words are shown with sources.
          Unverified words are left alone.
        </p>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-white/60">
          Sources &amp; References
        </h3>

        <ul className="mt-3 space-y-3 text-sm leading-6 text-white/78">
          {sourceLinks.map((source) => (
            <li key={source.href}>
              <a
                href={source.href}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-white underline decoration-white/35 underline-offset-4 transition hover:decoration-white"
              >
                {source.label}
              </a>
              <span className="text-white/55"> — {source.description}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
