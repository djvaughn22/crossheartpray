"use client";

// Keeps an entitled account's reading progress moving in both directions.
//
// Mounted once at the root so a reading marked on the Reading Plan board or
// the Bingo page reaches the server without either of those surfaces knowing
// an account exists. When nobody is signed in, or the account has no Sync
// entitlement, this does nothing at all and CrossHeartPray stays local-first.
//
// Failures are silent here on purpose: the About card is where Sync explains
// itself. A page in the middle of someone's reading should never interrupt
// them because the network was unavailable.

import { useEffect, useRef } from "react";
import { fetchSyncAccount, syncProgressNow } from "../lib/syncClient";
import { READING_PLAN_PROGRESS_EVENT } from "../lib/readingPlanProgress";
import { READING_PLAN_104_PROGRESS_EVENT } from "../lib/readingPlan104Progress";

const SETTLE_MS = 1500;

export default function SyncBridge() {
  const userId = useRef<string | null>(null);
  const running = useRef(false);
  const again = useRef(false);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    // Writing merged progress back fires the same progress events this
    // listens to. Without the re-entry guard a sync would schedule itself
    // forever.
    async function run() {
      const id = userId.current;
      if (!id || !active) return;

      if (running.current) {
        again.current = true;
        return;
      }

      running.current = true;

      try {
        await syncProgressNow(id);
      } catch {
        // Offline or unavailable — local progress is untouched and the next
        // change or tab focus tries again.
      } finally {
        running.current = false;

        if (again.current && active) {
          again.current = false;
          schedule();
        }
      }
    }

    function schedule() {
      if (!userId.current || !active) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(run, SETTLE_MS);
    }

    function onFocus() {
      if (document.visibilityState === "visible") schedule();
    }

    fetchSyncAccount().then((account) => {
      if (!active || !account?.syncActive) return;

      userId.current = account.id;

      window.addEventListener(READING_PLAN_PROGRESS_EVENT, schedule);
      window.addEventListener(READING_PLAN_104_PROGRESS_EVENT, schedule);
      window.addEventListener("focus", schedule);
      document.addEventListener("visibilitychange", onFocus);

      run();
    });

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      window.removeEventListener(READING_PLAN_PROGRESS_EVENT, schedule);
      window.removeEventListener(READING_PLAN_104_PROGRESS_EVENT, schedule);
      window.removeEventListener("focus", schedule);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  return null;
}
