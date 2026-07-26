// The person's current Bible Bingo 7 board, persisted locally so a refresh
// brings back the SAME seven cards instead of silently dealing new ones.
//
// Only card identity is stored (board-reference strings, "JHN.3.16") — a
// card's completion state is never duplicated here; it is always derived
// live from the canonical annual Reading Plan progress
// (src/lib/readingPlanProgress.ts). A null card means the lane had no
// unfinished readings left when the board was dealt.
//
// Boards are per plan year: a saved board from a previous year is ignored
// (the new year starts fresh), never migrated and never deleted eagerly.

import { currentPlanYear } from "./readingPlanProgress";

export const BINGO_BOARD_STORAGE_KEY = "crossheartpray:bible-bingo:board:v1";

export type StoredBingoBoard = {
  year: number;
  /** One entry per lane, in BIBLE_BINGO_SECTIONS order; null = lane complete. */
  cards: Array<string | null>;
};

export function loadStoredBingoBoard(laneCount: number): StoredBingoBoard | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BINGO_BOARD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { year?: unknown; cards?: unknown };
    if (
      typeof parsed.year !== "number" ||
      parsed.year !== currentPlanYear() ||
      !Array.isArray(parsed.cards) ||
      parsed.cards.length !== laneCount
    ) {
      return null;
    }
    const cards = parsed.cards.map((card) =>
      typeof card === "string" && /^[A-Z0-9]{3}\.\d{1,3}\.\d{1,3}$/.test(card)
        ? card
        : null,
    );
    return { year: parsed.year, cards };
  } catch {
    return null;
  }
}

export function saveStoredBingoBoard(cards: Array<string | null>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      BINGO_BOARD_STORAGE_KEY,
      JSON.stringify({ year: currentPlanYear(), cards } satisfies StoredBingoBoard),
    );
  } catch {
    // Private mode / quota — the in-memory board still works this session.
  }
}
