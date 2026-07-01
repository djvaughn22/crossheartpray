"use client";

import { useEffect, useState } from "react";
import type { VisualTheme } from "./VisualThemeProvider";

const STORAGE_KEY = "crossheartpray-visual-theme";

function cleanTheme(value: string | null | undefined): VisualTheme {
  if (
    value === "light" ||
    value === "bright" ||
    value === "fresh" ||
    value === "medium" ||
    value === "warm"
  ) {
    return "light";
  }

  return "dark";
}

function updateUrlTheme(theme: VisualTheme) {
  const url = new URL(window.location.href);

  if (theme === "dark") {
    url.searchParams.delete("color");
    url.searchParams.delete("theme");
  } else {
    url.searchParams.set("color", "light");
    url.searchParams.delete("theme");
  }

  window.history.replaceState(null, "", url.toString());
}

export default function VisualThemePicker() {
  const [theme, setTheme] = useState<VisualTheme>("dark");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initial = cleanTheme(
      params.get("color") ||
        params.get("theme") ||
        document.documentElement.dataset.chpVisualTheme ||
        window.localStorage.getItem(STORAGE_KEY),
    );

    setTheme(initial);
  }, []);

  function chooseTheme(nextTheme: VisualTheme) {
    setTheme(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    updateUrlTheme(nextTheme);

    window.dispatchEvent(
      new CustomEvent("crossheartpray-visual-theme", {
        detail: { theme: nextTheme },
      }),
    );
  }

  return (
    <div className="theme-toggle-wrap">
      <p className="theme-toggle-label">Color Theme</p>

      <div className="theme-toggle" role="group" aria-label="Color Theme">
        <button
          type="button"
          onClick={() => chooseTheme("dark")}
          aria-pressed={theme === "dark"}
          className="theme-toggle-option"
        >
          Dark
        </button>

        <button
          type="button"
          onClick={() => chooseTheme("light")}
          aria-pressed={theme === "light"}
          className="theme-toggle-option"
        >
          Light
        </button>
      </div>
    </div>
  );
}
