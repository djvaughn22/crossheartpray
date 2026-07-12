"use client";

import { useEffect, type ReactNode } from "react";

const STORAGE_KEY = "crossheartpray-visual-theme";

export type VisualTheme = "dark" | "light";

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

function applyTheme(theme: VisualTheme) {
  document.documentElement.dataset.chpVisualTheme = theme;
  // Keep the shared Open Mirror family theme (data-om-theme) in agreement so
  // om-styled chrome (nav bar, footer, family pages) follows the same choice.
  document.documentElement.dataset.omTheme = theme;
  window.localStorage.setItem("om-theme", theme);
}

export default function VisualThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = cleanTheme(params.get("color") || params.get("theme"));
    const fromStorage = cleanTheme(window.localStorage.getItem(STORAGE_KEY));
    const theme = params.has("color") || params.has("theme") ? fromUrl : fromStorage;

    window.localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);

    function handleThemeChange(event: Event) {
      const customEvent = event as CustomEvent<{ theme?: VisualTheme }>;
      const nextTheme = cleanTheme(customEvent.detail?.theme);

      window.localStorage.setItem(STORAGE_KEY, nextTheme);
      applyTheme(nextTheme);
    }

    window.addEventListener("crossheartpray-visual-theme", handleThemeChange);

    return () => {
      window.removeEventListener("crossheartpray-visual-theme", handleThemeChange);
    };
  }, []);

  return <>{children}</>;
}
