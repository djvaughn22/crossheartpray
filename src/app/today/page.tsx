import type { Metadata } from "next";
import DailyBibleBingoPostView from "../../components/DailyBibleBingoPostView";
import {
  absoluteSiteUrl,
  buildDailyBibleBingoPost,
  chicagoDateKey,
} from "../../lib/dailyBibleBingo";

// /today is the permanent Instagram bio link. It must always resolve to the
// current America/Chicago calendar day, so it can never be statically cached.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const post = buildDailyBibleBingoPost(chicagoDateKey());

  return {
    title: "Today’s Daily Bible Bingo",
    description: `${post.fullDate} — seven Scripture cards, one for each lane of the week: ${post.references.join(", ")}.`,
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

export default function TodayPage() {
  const post = buildDailyBibleBingoPost(chicagoDateKey());

  return <DailyBibleBingoPostView post={post} isArchive={false} />;
}
