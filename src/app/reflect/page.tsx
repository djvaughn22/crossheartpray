"use client";

import Link from "next/link";
import { useState } from "react";

function formatReflectionText(text: string) {
  return text
    .replace(/\s*##\s*(Reflection|✝️ Cross|❤️ Heart|🙏 Pray|📖 Scripture|Optional ACTS Scripture Guide|Next Faithful Step)\s*/g, "\n\n## $1\n\n")
    .replace(/\s*\*\*(Adoration|Confession|Thanksgiving|Supplication):\*\*\s*/g, "\n\n$1:\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const bibleBookCodes: Record<string, string> = {
  genesis: "GEN",
  exodus: "EXO",
  leviticus: "LEV",
  numbers: "NUM",
  deuteronomy: "DEU",
  joshua: "JOS",
  judges: "JDG",
  ruth: "RUT",
  "1 samuel": "1SA",
  "2 samuel": "2SA",
  "1 kings": "1KI",
  "2 kings": "2KI",
  "1 chronicles": "1CH",
  "2 chronicles": "2CH",
  ezra: "EZR",
  nehemiah: "NEH",
  esther: "EST",
  job: "JOB",
  psalm: "PSA",
  psalms: "PSA",
  proverbs: "PRO",
  ecclesiastes: "ECC",
  "song of solomon": "SNG",
  isaiah: "ISA",
  jeremiah: "JER",
  lamentations: "LAM",
  ezekiel: "EZK",
  daniel: "DAN",
  hosea: "HOS",
  joel: "JOL",
  amos: "AMO",
  obadiah: "OBA",
  jonah: "JON",
  micah: "MIC",
  nahum: "NAM",
  habakkuk: "HAB",
  zephaniah: "ZEP",
  haggai: "HAG",
  zechariah: "ZEC",
  malachi: "MAL",
  matthew: "MAT",
  mark: "MRK",
  luke: "LUK",
  john: "JHN",
  acts: "ACT",
  romans: "ROM",
  "1 corinthians": "1CO",
  "2 corinthians": "2CO",
  galatians: "GAL",
  ephesians: "EPH",
  philippians: "PHP",
  colossians: "COL",
  "1 thessalonians": "1TH",
  "2 thessalonians": "2TH",
  "1 timothy": "1TI",
  "2 timothy": "2TI",
  titus: "TIT",
  philemon: "PHM",
  hebrews: "HEB",
  james: "JAS",
  "1 peter": "1PE",
  "2 peter": "2PE",
  "1 john": "1JN",
  "2 john": "2JN",
  "3 john": "3JN",
  jude: "JUD",
  revelation: "REV",
};

function bibleSearchUrl(reference: string) {
  return `https://www.bible.com/search/bible?q=${encodeURIComponent(reference)}`;
}

function normalizeBibleBook(book: string) {
  return book.toLowerCase().replace(/\s+/g, " ").trim();
}

function parseBibleReference(reference: string) {
  const match = reference
    .trim()
    .match(/^([1-3]?\s?[A-Za-z]+(?:\s+of\s+[A-Za-z]+|\s+[A-Za-z]+)*)\s+(\d{1,3})(?::(\d{1,3})(?:-\d{1,3})?)?$/);

  if (!match) {
    return null;
  }

  const book = normalizeBibleBook(match[1]);
  const chapter = match[2];
  const verse = match[3] ?? "";
  const code = bibleBookCodes[book];

  if (!code) {
    return null;
  }

  return { code, chapter, verse };
}

function bibleChapterUrl(reference: string) {
  const parsed = parseBibleReference(reference);

  if (!parsed) {
    return bibleSearchUrl(reference);
  }

  return `https://www.bible.com/bible/111/${parsed.code}.${parsed.chapter}.NIV`;
}

function bibleVerseUrl(reference: string) {
  const parsed = parseBibleReference(reference);

  if (!parsed || !parsed.verse) {
    return bibleSearchUrl(reference);
  }

  return `https://www.bible.com/bible/111/${parsed.code}.${parsed.chapter}.${parsed.verse}.NIV`;
}

function findBibleReference(text: string) {
  const books =
    "Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1\\s*Samuel|2\\s*Samuel|1\\s*Kings|2\\s*Kings|1\\s*Chronicles|2\\s*Chronicles|Ezra|Nehemiah|Esther|Job|Psalm|Psalms|Proverbs|Ecclesiastes|Song\\s+of\\s+Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1\\s*Corinthians|2\\s*Corinthians|Galatians|Ephesians|Philippians|Colossians|1\\s*Thessalonians|2\\s*Thessalonians|1\\s*Timothy|2\\s*Timothy|Titus|Philemon|Hebrews|James|1\\s*Peter|2\\s*Peter|1\\s*John|2\\s*John|3\\s*John|Jude|Revelation";

  const versePattern = new RegExp(
    `\\b(${books})\\s+\\d{1,3}:\\d{1,3}(?:-\\d{1,3})?\\b`,
    "i"
  );

  return text.match(versePattern)?.[0] ?? "";
}

function renderReflectionWithBibleLinks(
  text: string,
  expandedVerse: string | null,
  verseExplanation: string,
  verseExplanationLoading: boolean,
  verseExplanationError: string,
  onExplainVerse: (reference: string) => void,
  isSafetyResponse: boolean
) {
  const books =
    "Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1\\s*Samuel|2\\s*Samuel|1\\s*Kings|2\\s*Kings|1\\s*Chronicles|2\\s*Chronicles|Ezra|Nehemiah|Esther|Job|Psalm|Psalms|Proverbs|Ecclesiastes|Song\\s+of\\s+Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1\\s*Corinthians|2\\s*Corinthians|Galatians|Ephesians|Philippians|Colossians|1\\s*Thessalonians|2\\s*Thessalonians|1\\s*Timothy|2\\s*Timothy|Titus|Philemon|Hebrews|James|1\\s*Peter|2\\s*Peter|1\\s*John|2\\s*John|3\\s*John|Jude|Revelation";

  const versePattern = new RegExp(
    `\\b(${books})\\s+\\d{1,3}:\\d{1,3}(?:-\\d{1,3})?\\b`,
    "gi"
  );

  const pieces = [];
  let lastIndex = 0;

  for (const match of text.matchAll(versePattern)) {
    const reference = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      pieces.push(text.slice(lastIndex, index));
    }

    pieces.push(
      <span
        key={`${reference}-${index}`}
        className="inline-flex max-w-full flex-wrap items-center gap-2 align-middle"
      >
        <a
          href={bibleVerseUrl(reference)}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-zinc-500 underline-offset-4 hover:text-white"
        >
          {reference}
        </a>

        {!isSafetyResponse && (
          <button
            type="button"
            onClick={() => onExplainVerse(reference)}
            className="inline-flex shrink-0 items-center rounded-full border border-yellow-400/40 bg-transparent px-3 py-1 text-xs font-semibold text-yellow-300 transition hover:border-yellow-300/70 hover:bg-yellow-400/10"
          >
            {expandedVerse === reference ? "Hide explanation" : "Why this verse?"}
          </button>
        )}

        {expandedVerse === reference && (
          <span className="mt-2 block w-full basis-full rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 text-left text-sm leading-7 text-zinc-300">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-yellow-400">
              Why this may connect
            </span>

            {verseExplanationLoading && "Looking at this one passage..."}

            {!verseExplanationLoading && verseExplanation && verseExplanation}

            {!verseExplanationLoading && verseExplanationError && (
              <span className="text-red-300">{verseExplanationError}</span>
            )}
          </span>
        )}
      </span>
    );

    lastIndex = index + reference.length;
  }

  pieces.push(text.slice(lastIndex));

  return pieces;
}


function renderStyledReflection(
  text: string,
  expandedVerse: string | null,
  verseExplanation: string,
  verseExplanationLoading: boolean,
  verseExplanationError: string,
  onExplainVerse: (reference: string) => void,
  isSafetyResponse: boolean
) {
  const blocks = text.split(/\n\n+/).map((block) => block.trim()).filter(Boolean);
  const rendered = [];

  for (let i = 0; i < blocks.length; i++) {
    const trimmed = blocks[i];

    if (trimmed === "✝️ ❤️ 🙏") {
      continue;
    }

    if (trimmed.startsWith("## ")) {
      rendered.push(
        <h2
          key={`heading-${i}`}
          className="mt-10 text-center text-sm font-bold uppercase tracking-[0.35em] text-yellow-400"
        >
          {trimmed.replace(/^##\s*/, "")}
        </h2>
      );
      continue;
    }

    if (trimmed.startsWith("### ")) {
      const title = trimmed.replace(/^###\s*/, "");
      const verseBlock = blocks[i + 1] ?? "";
      const startBlock = blocks[i + 2] ?? "";
      const chapter = startBlock.startsWith("Start reading:")
        ? startBlock.replace("Start reading:", "").trim()
        : title.replace(/^\d+\.\s*/, "").trim();
      const verseReference = findBibleReference(verseBlock);

      rendered.push(
        <div
          key={`scripture-card-${i}`}
          className="my-8 rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-yellow-400/30 bg-yellow-400/10 text-sm font-bold text-yellow-300">
              {title.split(".")[0]}
            </span>

            <h3 className="text-2xl font-bold text-white">
              {title.replace(/^\d+\.\s*/, "")}
            </h3>
          </div>

          <div className="mt-6 text-lg leading-9 text-zinc-200">
            {renderReflectionWithBibleLinks(
              verseBlock,
              expandedVerse,
              verseExplanation,
              verseExplanationLoading,
              verseExplanationError,
              onExplainVerse,
              isSafetyResponse
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {verseReference && (
              <a
                href={bibleVerseUrl(verseReference)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-full border border-yellow-400/40 bg-yellow-400/10 px-5 py-2 text-sm font-semibold text-yellow-200 transition hover:border-yellow-300/70 hover:bg-yellow-400/20 hover:text-white"
              >
                Read verse: {verseReference}
              </a>
            )}

            <a
              href={bibleChapterUrl(chapter)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-full border border-zinc-700 bg-zinc-900 px-5 py-2 text-sm font-semibold text-zinc-300 transition hover:border-yellow-400/40 hover:bg-zinc-800 hover:text-white"
            >
              Read chapter: {chapter}
            </a>
          </div>
        </div>
      );

      if (blocks[i + 2]?.startsWith("Start reading:")) {
        i += 2;
      } else {
        i += 1;
      }

      continue;
    }

    rendered.push(
      <p key={`text-${i}`} className="my-5 text-lg leading-9 text-zinc-300">
        {renderReflectionWithBibleLinks(
          trimmed,
          expandedVerse,
          verseExplanation,
          verseExplanationLoading,
          verseExplanationError,
          onExplainVerse,
          isSafetyResponse
        )}
      </p>
    );
  }

  return rendered;
}

export default function CrossHeartPrayReflectPage() {
  const [problem, setProblem] = useState("");
  const [reflection, setReflection] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSafetyResponse, setIsSafetyResponse] = useState(false);
  const [expandedVerse, setExpandedVerse] = useState<string | null>(null);
  const [verseExplanation, setVerseExplanation] = useState("");
  const [verseExplanationLoading, setVerseExplanationLoading] = useState(false);
  const [verseExplanationError, setVerseExplanationError] = useState("");

  const formattedReflection = reflection
    .replace(/\s*(#{2,4}\s+(Reflection|✝️ Cross|❤️ Heart|🙏 Pray|📖 Scripture|Optional ACTS Scripture Guide|Next Faithful Step))/g, "\n\n$1")
    .trim();

  async function explainVerse(reference: string) {
    if (expandedVerse === reference) {
      setExpandedVerse(null);
      setVerseExplanation("");
      setVerseExplanationError("");
      return;
    }

    setExpandedVerse(reference);
    setVerseExplanation("");
    setVerseExplanationError("");
    setVerseExplanationLoading(true);

    try {
      const response = await fetch("/api/verse-explanation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ problem, verse: reference }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to explain this verse.");
      }

      setVerseExplanation(data.explanation);
    } catch (err: any) {
      setVerseExplanationError(
        err?.message || "Unable to explain this verse right now."
      );
    } finally {
      setVerseExplanationLoading(false);
    }
  }

  async function beginReflection() {
    setError("");
    setReflection("");
    setIsSafetyResponse(false);
    setExpandedVerse(null);
    setVerseExplanation("");
    setVerseExplanationError("");

    if (!problem.trim()) {
      setError("Please share what you are carrying.");
      return;
    }

    if (problem.length > 250) {
      setError("Please keep your reflection to 250 characters or less.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/reflect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ problem }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to generate reflection.");
      }

      setIsSafetyResponse(Boolean(data.safety));
      setReflection(formatReflectionText(data.reflection));
    } catch (err: any) {
      setError(
        err?.message || "Reflection could not respond right now. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <nav className="mx-auto grid grid-cols-3 max-w-5xl items-center py-4">
        <a href="/home" className="justify-self-start font-bold">
          Cross Heart Pray
        </a>

        <span aria-hidden="true" />

        <div className="justify-self-end flex items-center gap-4">
          <a
            href="https://www.bible.com/app"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open YouVersion Bible App"
          >
            <img
              src="/brand/youversion-bible-app.png"
              alt="YouVersion Bible App"
              className="h-9 w-9 rounded-lg"
            />
          </a>

          <details className="relative text-sm text-zinc-400">
          <summary className=" list-none text-2xl leading-none">
            ☰
          </summary>

          <div className="absolute right-0 z-50 mt-4 flex w-56 flex-col gap-4 rounded-2xl border border-zinc-800 bg-black p-5 text-right shadow-2xl">
            <a href="/home">Home</a>
            <a href="/home">Cross Heart Pray</a>
            <a href="/reflect">Begin Reflection</a>
          </div>
          </details>
        </div>

      </nav>

      <section className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <div className="mb-6 text-6xl">🪞</div>

        <p className="mb-6 text-sm font-bold uppercase tracking-[0.35em] text-yellow-400">
          The Mirror
        </p>

        <h1 className="text-5xl font-bold tracking-tight md:text-7xl">
          Begin Reflection
        </h1>

        <p className="mt-6 max-w-2xl text-xl leading-9 text-zinc-300">
          Look honestly.
          <br />
          Tell the truth.
        </p>

        <p className="mx-auto mt-6 max-w-3xl text-center text-lg leading-8 text-zinc-400">
  The mirror helps you reflect. Cross Heart Pray helps you bring what you see
  to Jesus, receive God&apos;s truth through Scripture, and respond in prayer.
</p>

<p className="mx-auto mt-2 max-w-2xl text-center text-xs leading-5 text-zinc-500">
  * ACTS is a simple prayer guide: Adoration, Confession, Thanksgiving, and Supplication.
</p>

        <div className="mt-12 w-full rounded-3xl border border-zinc-800 bg-zinc-950 p-6 text-left shadow-2xl">
          <label className="text-sm font-semibold text-zinc-300">
            🪞 Reflection
          </label>

          <textarea
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();

                if (!isLoading) {
                  beginReflection();
                }
              }
            }}
            maxLength={250}
            className="mt-4 min-h-36 w-full rounded-2xl border border-zinc-800 bg-black p-4 text-white outline-none"
            placeholder="Describe how you picture yourself.

Your strengths. Your struggles.
Your questions. Your fears.
Your hopes. Your habits.

What do you see?"
          />

          <p className="mt-2 text-right text-sm text-zinc-500">
            {problem.length}/250 characters
          </p>

          <button
            onClick={beginReflection}
            disabled={isLoading}
            className="mt-5 rounded-full bg-white px-8 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Finding relevant Scripture..." : "Begin Reflection"}
          </button>

          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        </div>



        {reflection && (
          <div className="mt-10 w-full rounded-3xl border border-zinc-800 bg-zinc-950 p-6 text-left">
            <p className="mb-6 text-center text-sm italic leading-7 text-zinc-500">
              Turn from the mirror.
            </p>

            <div className="mt-2 text-center">
              <p className="text-sm text-zinc-400">
                ✝️ Lay it at the Cross
                <span className="mx-4 text-zinc-700">•</span>
                ❤️ Feel God&apos;s Love
                <span className="mx-4 text-zinc-700">•</span>
                🙏 Walk in Prayer
              </p>
            </div>

            <div className="mt-8 rounded-3xl border border-zinc-800 bg-black/40 p-6 text-left text-lg leading-9 text-zinc-200">
              {renderStyledReflection(formattedReflection, expandedVerse, verseExplanation, verseExplanationLoading, verseExplanationError, explainVerse, isSafetyResponse)}
            </div>

            <div className="mt-6 rounded-3xl border border-yellow-400/20 bg-yellow-400/10 p-6 text-sm italic leading-7 text-yellow-100">
              <p>These passages may be relevant to your reflection.</p>
              <p className="mt-3">
                Continue by exploring them directly in the Bible and reading the surrounding chapters for context.
              </p>
              <p className="mt-3">
                If these passages do not seem like a good fit, continue exploring Scripture or try another reflection. Open Mirror may not always identify the most relevant passages.
              </p>
            </div>

            <div className="mt-10 rounded-[2rem] border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black p-7 text-left shadow-2xl">
              <div className="text-center">
                <p className="text-4xl">📖</p>
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.35em] text-yellow-400">
                  Start Here Anytime
                </p>
                <p className="mx-auto mt-5 max-w-2xl text-sm italic leading-7 text-zinc-400">
                  If the passages above do not seem like a good fit, keep going.
                  Open Mirror may miss the best match, but Scripture is always worth opening.
                </p>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <a
                  href="https://www.bible.com/search/bible?q=John%201"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-3xl border border-zinc-800 bg-black/60 p-6 text-center transition hover:-translate-y-1 hover:border-yellow-400/50 hover:bg-zinc-950"
                >
                  <span className="text-3xl">✝️</span>
                  <span className="mt-4 block text-xl font-bold text-white">
                    John 1
                  </span>
                  <span className="mt-3 block text-sm leading-6 text-zinc-400 group-hover:text-zinc-300">
                    Start with Jesus, the Word, life, light, grace, and truth.
                  </span>
                </a>

                <a
                  href="https://www.bible.com/search/bible?q=Psalm%2033"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-3xl border border-zinc-800 bg-black/60 p-6 text-center transition hover:-translate-y-1 hover:border-yellow-400/50 hover:bg-zinc-950"
                >
                  <span className="text-3xl">❤️</span>
                  <span className="mt-4 block text-xl font-bold text-white">
                    Psalm 33
                  </span>
                  <span className="mt-3 block text-sm leading-6 text-zinc-400 group-hover:text-zinc-300">
                    Start with God&apos;s goodness, faithfulness, creation, and care.
                  </span>
                </a>

                <a
                  href="https://www.bible.com/search/bible?q=Romans%205"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-3xl border border-zinc-800 bg-black/60 p-6 text-center transition hover:-translate-y-1 hover:border-yellow-400/50 hover:bg-zinc-950"
                >
                  <span className="text-3xl">🙏</span>
                  <span className="mt-4 block text-xl font-bold text-white">
                    Romans 5
                  </span>
                  <span className="mt-3 block text-sm leading-6 text-zinc-400 group-hover:text-zinc-300">
                    Start with peace with God, grace, hope, and God&apos;s love.
                  </span>
                </a>
              </div>

              <div className="mt-8 rounded-3xl border border-yellow-400/30 bg-yellow-400/10 p-6 text-center">
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-yellow-300">
                  Jesus Loves You
                </p>
                <a
                  href="https://www.bible.com/search/bible?q=Ephesians%203%3A17-19"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-lg font-semibold text-white underline decoration-yellow-300/50 underline-offset-4 hover:text-yellow-100"
                >
                  Ephesians 3:17–19
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="mt-12 max-w-3xl text-center text-sm leading-7 text-zinc-500">
          CrossHeartPray provides biblical reflection and prayer guidance. It is
          not pastoral counseling, medical advice, legal advice, or a substitute
          for your local church, trusted relationships, or professional care
          when needed.
        </div>
      </section>
    </main>
  );
}
