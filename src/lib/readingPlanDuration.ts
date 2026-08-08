// Which pacing of the Bible Reading Plan is showing: 1 Year (52 weeks) or
// 2 Years (104 weeks). Same plan, same order, same lanes — only the pace.
//
// The choice lives in one tiny store rather than in page state because two
// separate places on the page need it: the reading board and the PDF buttons
// up in the hero. A store keeps them in agreement without rearranging the
// page around a shared React parent.
//
// 52 is the default and stays the default. A person who has never touched the
// switch sees exactly the plan they have always seen.

export type ReadingPlanDuration = 52 | 104;

export const READING_PLAN_DURATIONS: readonly ReadingPlanDuration[] = [52, 104];

export const DEFAULT_READING_PLAN_DURATION: ReadingPlanDuration = 52;

export const READING_PLAN_DURATION_KEY = "crossheartpray:bible-reading-plan-duration";
export const READING_PLAN_DURATION_EVENT =
  "crossheartpray:bible-reading-plan-duration-change";

export function isReadingPlanDuration(value: unknown): value is ReadingPlanDuration {
  return value === 52 || value === 104;
}

/** The saved pacing, or 52 when nothing is saved or storage is unreadable. */
export function loadReadingPlanDuration(): ReadingPlanDuration {
  if (typeof window === "undefined") return DEFAULT_READING_PLAN_DURATION;
  try {
    const raw = Number(window.localStorage.getItem(READING_PLAN_DURATION_KEY));
    return isReadingPlanDuration(raw) ? raw : DEFAULT_READING_PLAN_DURATION;
  } catch {
    return DEFAULT_READING_PLAN_DURATION;
  }
}

export function saveReadingPlanDuration(duration: ReadingPlanDuration): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(READING_PLAN_DURATION_KEY, String(duration));
  } catch {
    // Private mode / quota — the in-memory choice still drives this session.
  }
  window.dispatchEvent(new Event(READING_PLAN_DURATION_EVENT));
}

/** Follow the pacing choice from anywhere on the page. Returns a cleanup. */
export function subscribeToReadingPlanDuration(
  listener: (duration: ReadingPlanDuration) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const notify = () => listener(loadReadingPlanDuration());

  window.addEventListener(READING_PLAN_DURATION_EVENT, notify);
  window.addEventListener("storage", notify);
  notify();

  return () => {
    window.removeEventListener(READING_PLAN_DURATION_EVENT, notify);
    window.removeEventListener("storage", notify);
  };
}
