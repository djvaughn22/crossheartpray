"use client";

import { useEffect, useState } from "react";
import BibleReadingPlanProgress from "./BibleReadingPlanProgress";
import { type BibleReadingPlanWeek } from "../lib/bibleReadingPlan";
import {
  DEFAULT_READING_PLAN_DURATION,
  subscribeToReadingPlanDuration,
  type ReadingPlanDuration,
} from "../lib/readingPlanDuration";

type BibleReadingPlanBoardProps = {
  weeks52: BibleReadingPlanWeek[];
  weeks104: BibleReadingPlanWeek[];
};

// The table half of the pace switch. The tabs themselves live above this
// component (ReadingPlanDurationTabs) so they escape the compact-table CSS;
// the two halves stay in agreement through the shared duration store rather
// than through props, which keeps the page structure as it was.
export default function BibleReadingPlanBoard({
  weeks52,
  weeks104,
}: BibleReadingPlanBoardProps) {
  const [duration, setDuration] = useState<ReadingPlanDuration>(
    DEFAULT_READING_PLAN_DURATION,
  );

  useEffect(() => subscribeToReadingPlanDuration(setDuration), []);

  return (
    <BibleReadingPlanProgress
      key={duration}
      weeks={duration === 104 ? weeks104 : weeks52}
      duration={duration}
    />
  );
}
