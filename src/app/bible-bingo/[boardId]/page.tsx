import { notFound } from "next/navigation";
import BibleBingoShareBoard from "../../../components/BibleBingoShareBoard";
import BibleBingoShareMenu from "../../../components/BibleBingoShareMenu";
import { passagesForBibleBingoBoardId } from "../../../lib/bibleRandom";
import { BIBLE_BINGO_SECTIONS } from "../../../lib/dailyBibleBingo";
import SiteHeader from "../../../components/SiteHeader";
import SiteFooter from "../../../components/SiteFooter";
import { bibleComUrlForPassage } from "../../../lib/scripture";

type PageProps = {
  params: Promise<{
    boardId: string;
  }>;
  searchParams?: Promise<{
    card?: string | string[];
  }>;
};

type PassageForUrl = {
  code: string;
  chapter: string | number;
  verse: string | number;
};

// Canonical lane definitions shared with the daily system.
const shareSections = BIBLE_BINGO_SECTIONS;

const cardTones = [
  "border-emerald-200/15 bg-emerald-300/10",
  "border-yellow-200/15 bg-yellow-200/10",
  "border-red-200/15 bg-red-300/10",
  "border-sky-200/15 bg-sky-300/10",
  "border-lime-200/15 bg-lime-300/10",
  "border-orange-200/15 bg-orange-300/10",
  "border-violet-200/15 bg-violet-300/10",
];

function verseUrl(passage: PassageForUrl) {
  return bibleComUrlForPassage(passage);
}

function chapterUrl(passage: Omit<PassageForUrl, "verse">) {
  return bibleComUrlForPassage(passage);
}

function escapeHtmlForEmail(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export default async function BibleBingoSharePage({ params, searchParams }: PageProps) {
  const { boardId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const rawCardParam = Array.isArray(resolvedSearchParams.card)
    ? resolvedSearchParams.card[0]
    : resolvedSearchParams.card;

  const passages = passagesForBibleBingoBoardId(boardId);

  if (!passages) {
    notFound();
  }

  const requestedCardNumber = rawCardParam ? Number(rawCardParam) : NaN;
  const selectedCardIndex =
    Number.isInteger(requestedCardNumber) &&
    requestedCardNumber >= 1 &&
    requestedCardNumber <= passages.length
      ? requestedCardNumber - 1
      : null;

  const selectedCard =
    selectedCardIndex === null
      ? null
      : {
          number: selectedCardIndex + 1,
          passage: passages[selectedCardIndex],
          section: shareSections[selectedCardIndex],
          tone: cardTones[selectedCardIndex],
        };

  const isSingleCardView =
    selectedCard !== null &&
    selectedCard.passage !== undefined &&
    selectedCard.section !== undefined &&
    selectedCard.tone !== undefined;

  const boardPath = `/bible-bingo/${encodeURIComponent(boardId)}`;
  const boardUrl = `https://crossheartpray.com${boardPath}`;
  const cardPath = isSingleCardView ? `${boardPath}?card=${selectedCard.number}` : boardPath;
  const cardUrl = `https://crossheartpray.com${cardPath}`;

  const shareText = isSingleCardView
    ? [
        `I dealt this ${selectedCard.section.title} Bible Bingo card on Cross Heart Pray.`,
        "",
        selectedCard.passage.label,
        selectedCard.passage.text,
        "",
        "Open this card:",
        cardUrl,
        "",
        "Open all 7 cards:",
        boardUrl,
      ].join("\n")
    : [
        "I dealt 7 Bible Bingo cards through the weekly Bible rhythm.",
        "",
        "Which day should we explore?",
        "",
        boardUrl,
      ].join("\n");

  const shareSubject = isSingleCardView
    ? `${selectedCard.passage.label} Bible Bingo card`
    : "My Bible Bingo board";

  const htmlEmail = `
    <div style="margin:0; padding:0; background:#eef2f7;">
      <div style="font-family: Arial, Helvetica, sans-serif; background:#eef2f7; color:#0f172a; padding:28px 10px;">
        <div style="max-width:760px; margin:0 auto;">
          <div style="text-align:center; margin:0 0 22px;">
            <div style="font-size:34px; line-height:1; margin-bottom:12px;">✝️ ❤️ 🙏</div>
            <div style="font-size:12px; font-weight:800; letter-spacing:0.22em; text-transform:uppercase; color:#047857; margin-bottom:8px;">Cross Heart Pray</div>
            <h1 style="font-family: Georgia, 'Times New Roman', serif; margin:0; font-size:36px; line-height:1.12; color:#0f172a;">Bible Bingo 7</h1>
            <p style="margin:12px auto 0; max-width:560px; color:#475569; font-size:16px; line-height:1.6; font-weight:600;">
              I dealt 7 Bible Bingo cards through the weekly Bible rhythm. Which day should we explore?
            </p>
            <p style="text-align:center; margin:22px 0 0;">
              <a href="${boardUrl}" style="display:inline-block; background:#047857; color:#ffffff; padding:13px 22px; border-radius:999px; text-decoration:none; font-weight:800; font-size:15px;">
                Open the 7-card board
              </a>
            </p>
          </div>

          <div style="font-size:0; text-align:center;">
            ${passages.map((passage, index) => `
              <div style="display:inline-block; width:100%; max-width:336px; vertical-align:top; margin:8px; font-size:16px;">
                <div style="min-height:315px; border:1px solid #dbe3ee; border-radius:22px; padding:22px; background:#ffffff; box-shadow:0 12px 30px rgba(15,23,42,0.10);">
                  <div style="font-size:30px; text-align:center; margin:0 0 10px;">${shareSections[index].emoji}</div>
                  <div style="text-align:center; font-size:11px; line-height:1.4; letter-spacing:0.18em; text-transform:uppercase; color:#047857; font-weight:900; margin:0 0 8px;">Card ${index + 1} · ${escapeHtmlForEmail(shareSections[index].title)}</div>
                  <h2 style="font-family: Georgia, 'Times New Roman', serif; text-align:center; color:#0f172a; font-size:23px; line-height:1.2; margin:8px 0 14px;">${escapeHtmlForEmail(passage.label)}</h2>
                  <p style="font-family: Georgia, 'Times New Roman', serif; color:#334155; line-height:1.65; font-size:17px; margin:0 0 18px;">${escapeHtmlForEmail(passage.text)}</p>
                  <p style="text-align:center; margin:0;">
                    <a href="${verseUrl(passage)}" style="color:#065f46; font-weight:800; text-decoration:none;">Verse</a>
                    &nbsp; | &nbsp;
                    <a href="${chapterUrl(passage)}" style="color:#065f46; font-weight:800; text-decoration:none;">Chapter</a>
                    &nbsp; | &nbsp;
                    <a href="${boardUrl}?card=${index + 1}" style="color:#065f46; font-weight:800; text-decoration:none;">Open card</a>
                  </p>
                </div>
              </div>
            `).join("")}
          </div>

          <p style="text-align:center; color:#64748b; font-size:13px; line-height:1.6; margin:22px 0 0;">
            Bible Bingo 7 · Open the link to flip through the same 7 cards.
          </p>
        </div>
      </div>
    </div>
  `;

  const singleCardHtmlEmail = isSingleCardView
    ? `
      <div style="margin:0; padding:0; background:#eef2f7;">
        <div style="font-family: Arial, Helvetica, sans-serif; background:#eef2f7; color:#0f172a; padding:28px 10px;">
          <div style="max-width:560px; margin:0 auto;">
            <div style="border:1px solid #dbe3ee; border-radius:24px; padding:26px 22px; background:#ffffff; box-shadow:0 12px 30px rgba(15,23,42,0.10);">
              <p style="font-size:34px; text-align:center; margin:0 0 12px;">${selectedCard.section.emoji}</p>
              <p style="text-align:center; font-size:11px; line-height:1.4; letter-spacing:0.18em; text-transform:uppercase; color:#047857; font-weight:900; margin:0 0 10px;">${escapeHtmlForEmail(selectedCard.section.title)} Bible Bingo Card</p>
              <h1 style="font-family: Georgia, 'Times New Roman', serif; text-align:center; margin:0 0 16px; font-size:30px; line-height:1.15; color:#0f172a;">${escapeHtmlForEmail(selectedCard.passage.label)}</h1>
              <p style="font-family: Georgia, 'Times New Roman', serif; color:#334155; line-height:1.7; font-size:18px; margin:0 0 22px;">${escapeHtmlForEmail(selectedCard.passage.text)}</p>
              <p style="text-align:center; margin:0;">
                <a href="${cardUrl}" style="color:#065f46; font-weight:800; text-decoration:none;">Open live card</a>
                &nbsp; | &nbsp;
                <a href="${boardUrl}" style="color:#065f46; font-weight:800; text-decoration:none;">All 7 cards</a>
              </p>
            </div>
            <p style="text-align:center; color:#64748b; font-size:13px; line-height:1.6; margin:18px 0 0;">
              Bible Bingo 7 · Cross Heart Pray
            </p>
          </div>
        </div>
      </div>
    `
    : "";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <SiteHeader />

        <section className="mx-auto max-w-4xl py-16 text-center">
          <p className="mb-8 flex items-center justify-center gap-8 text-5xl md:gap-14 md:text-6xl">
            <span>✝️</span>
            <span>❤️</span>
            <span>🙏</span>
          </p>

          <p className="text-center justify-center items-center mb-5 inline-flex rounded-full border border-white/15 bg-black/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100">
            {isSingleCardView ? "Shared Bible Bingo Card" : "Shared Bible Bingo Board"}
          </p>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            {isSingleCardView ? "Bible Bingo Card" : "7 Bible Bingo Cards"}
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-zinc-300">
            {isSingleCardView
              ? "Share this card."
              : "Share this board."}
          </p>

          <div className="mx-auto mt-8 flex flex-col items-center justify-center gap-3">
            {isSingleCardView ? (
              <>
                <a
                  href={boardPath}
                  className="inline-flex rounded-full border border-emerald-200/25 bg-emerald-300/10 px-5 py-2 text-sm font-bold text-emerald-50 shadow-sm transition hover:bg-emerald-300/15"
                >
                  Back to all 7 Bible Bingo cards
                </a>

                <a
                  href="/explorebible"
                  className="inline-flex rounded-full border border-emerald-200/25 bg-emerald-300/10 px-5 py-2 text-sm font-bold text-emerald-50 shadow-sm transition hover:bg-emerald-300/15"
                >
                  Back to Bible Bingo
                </a>
              </>
            ) : (
              <a
                href="/explorebible"
                className="inline-flex rounded-full border border-emerald-200/25 bg-emerald-300/10 px-5 py-2 text-sm font-bold text-emerald-50 shadow-sm transition hover:bg-emerald-300/15"
              >
                Back to Bible Bingo
              </a>
            )}

            <BibleBingoShareMenu
              boardHref={isSingleCardView ? cardPath : boardPath}
              boardUrl={isSingleCardView ? cardUrl : boardUrl}
              shareText={shareText}
              emailSubject={shareSubject}
              htmlEmail={isSingleCardView ? singleCardHtmlEmail : htmlEmail}
              itemLabel={isSingleCardView ? "card" : "board"}
              buttonLabel="Share"
              enableSignature
            />

            <a
              href="/explorebible"
              className="text-sm font-semibold text-slate-400 underline decoration-white/20 underline-offset-4 hover:text-white"
            >
              Deal 7
            </a>
          </div>
        </section>

        {isSingleCardView ? (
          <section className="mx-auto max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 md:p-8">
            <div className="single-card-server-view">
              <BibleBingoShareBoard
                passages={[selectedCard.passage]}
                shareSections={[selectedCard.section]}
                cardTones={[selectedCard.tone]}
              />
            </div>
          </section>
        ) : (
          <BibleBingoShareBoard
            passages={passages}
            shareSections={shareSections}
            cardTones={cardTones}
          />
        )}
</div>
          <SiteFooter />
    </main>
  );
}
