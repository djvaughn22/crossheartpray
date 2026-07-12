import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DailyBibleBingoPostView from "../../../components/DailyBibleBingoPostView";
import {
  absoluteSiteUrl,
  buildDailyBibleBingoPost,
  chicagoDateKey,
  DAILY_BIBLE_BINGO_START_DATE,
  isValidDateKey,
} from "../../../lib/dailyBibleBingo";

// Permanent dated archive: /today/2026-07-12. A previously shared Instagram
// post keeps linking to a stable page forever. Dates before the first public
// post, in the future, or malformed 404.
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ date: string }>;
};

function resolveArchiveDate(date: string): string | null {
  if (!isValidDateKey(date)) return null;
  if (date < DAILY_BIBLE_BINGO_START_DATE) return null;
  if (date > chicagoDateKey()) return null;
  return date;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { date } = await params;
  const resolved = resolveArchiveDate(date);
  if (!resolved) return { title: "Daily Bible Bingo" };

  const post = buildDailyBibleBingoPost(resolved);

  return {
    title: post.title,
    description: `Seven Scripture cards for ${post.fullDate}: ${post.references.join(", ")}.`,
    openGraph: {
      title: post.title,
      description: "Seven Scripture cards — one for each lane of the week.",
      images: [
        {
          url: absoluteSiteUrl(post.imagePath),
          width: 1080,
          height: 1350,
        },
      ],
    },
  };
}

export default async function TodayArchivePage({ params }: PageProps) {
  const { date } = await params;
  const resolved = resolveArchiveDate(date);

  if (!resolved) {
    notFound();
  }

  const post = buildDailyBibleBingoPost(resolved);
  const isToday = resolved === chicagoDateKey();

  return <DailyBibleBingoPostView post={post} isArchive={!isToday} />;
}
