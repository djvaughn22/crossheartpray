import DailyHopeRoutine from "../../components/DailyHopeRoutine";
import {
  dailyHopeClosingPrayer,
  dailyHopeOpeningPrayers,
  getDailyHopeDays,
  getDailyHopeMissingReferences,
} from "../../lib/dailyHopeRoutine";

export const metadata = {
  title: "Daily Hope | Cross Heart Pray",
  description: "Use a fixed Daily Hope prayer and Scripture routine connected to Bible Bingo, the Bible Reading Plan, and source-backed Deep Dive.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DailyHopePage() {
  const days = getDailyHopeDays();
  const missingReferences = getDailyHopeMissingReferences();

  return (
    <DailyHopeRoutine
      openingPrayers={dailyHopeOpeningPrayers}
      closingPrayer={dailyHopeClosingPrayer}
      days={days}
      missingReferences={missingReferences}
    />
  );
}
