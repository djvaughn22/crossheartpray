import BibleReadingPlanTracker from "../../components/BibleReadingPlanTracker";
import { BIBLE_READING_PLAN_WEEKS } from "../../lib/bibleReadingPlan";

export const metadata = {
  title: "Bible Reading Plan | Cross Heart Pray",
  description: "Follow a full-year Bible Reading Plan connected to Bible Bingo lanes, reading progress, chapters, and source-backed Deep Dive.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function BibleReadingPlanPage() {
  return <BibleReadingPlanTracker weeks={BIBLE_READING_PLAN_WEEKS} />;
}
