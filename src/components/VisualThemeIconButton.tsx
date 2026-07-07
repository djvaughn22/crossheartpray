"use client";

import { useEffect, useState } from "react";
import type { VisualTheme } from "./VisualThemeProvider";

const STORAGE_KEY = "crossheartpray-visual-theme";

// Compact ☀️/🌙 toggle for the Open Mirror bar — same storage, URL param, and
// event mechanics as VisualThemePicker so the two stay in sync.
export default function VisualThemeIconButton() {
  const [theme, setTheme] = useState<VisualTheme>("dark");

  useEffect(() => {
    function readTheme() {
      const current =
        document.documentElement.dataset.chpVisualTheme === "light" ? "light" : "dark";
      setTheme(current);
    }

    readTheme();
    window.addEventListener("crossheartpray-visual-theme", readTheme);
    return () => window.removeEventListener("crossheartpray-visual-theme", readTheme);
  }, []);

  function toggleTheme() {
    const nextTheme: VisualTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);

    const url = new URL(window.location.href);
    if (nextTheme === "dark") {
      url.searchParams.delete("color");
      url.searchParams.delete("theme");
    } else {
      url.searchParams.set("color", "light");
      url.searchParams.delete("theme");
    }
    window.history.replaceState(null, "", url.toString());

    window.dispatchEvent(
      new CustomEvent("crossheartpray-visual-theme", {
        detail: { theme: nextTheme },
      }),
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      style={{ background: "none", border: "1px solid #26324c", borderRadius: 50, padding: "4px 10px", fontSize: 13, lineHeight: 1, cursor: "pointer", color: "#94a3b8" }}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
