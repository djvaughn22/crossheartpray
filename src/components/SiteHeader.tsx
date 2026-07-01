"use client";

import { useEffect, useRef, useState } from "react";
import FlowStepButtons from "./FlowStepButtons";
import VisualThemePicker from "./VisualThemePicker";

type SiteHeaderProps = {
  className?: string;
};

const menuLinks = [
  { href: "/crossheartpray", label: "Home" },
  { href: "/bible-reading-plan", label: "Bible Reading" },
  { href: "/daily-hope", label: "Daily Hope" },
  { href: "/explorebible", label: "Bible Bingo 7" },
  { href: "/reflect", label: "Reflect" },
  { href: "/about", label: "About" },
  { href: "/", label: "← Open Mirror LLC" },
];

export default function SiteHeader({ className = "mb-16" }: SiteHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isMenuOpen) return;

    function closeOnOutsideClick(event: MouseEvent | TouchEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;

      if (!menuRef.current?.contains(target)) {
        setIsMenuOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsMenuOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("touchstart", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("touchstart", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMenuOpen]);

  return (
    <header className={className}>
      <nav className="grid grid-cols-3 items-center">
        <a
          href="/"
          aria-label="Open CrossHeartPray"
          className="justify-self-start font-bold text-slate-100"
        >
          ✝️ ❤️ 🙏
        </a>

        <a
          href="https://www.bible.com/verse-of-the-day"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open YouVersion Bible App"
          className="justify-self-center"
        >
          <img
            src="/brand/youversion-bible-app.png"
            alt="Holy Bible"
            className="h-10 w-10 rounded-lg"
          />
        </a>

        <div ref={menuRef} className="relative justify-self-end text-right">
          <button
            type="button"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-slate-500/45 bg-slate-900 text-xl font-semibold leading-none text-slate-100 transition hover:bg-slate-800"
          >
            <span aria-hidden="true">☰</span>
          </button>

          {isMenuOpen ? (
            <div className="absolute right-0 z-50 mt-4 flex w-64 flex-col rounded-2xl border border-slate-700 bg-slate-950 p-4 text-right text-sm font-semibold text-slate-100 shadow-2xl shadow-slate-950/40">
              <div className="flex flex-col gap-3">
                {menuLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="rounded-xl px-3 py-1.5 transition hover:bg-slate-900 hover:text-emerald-100"
                  >
                    {link.label}
                  </a>
                ))}
              </div>

              <div className="mt-4 border-t border-slate-700 pt-4">
                <VisualThemePicker />
              </div>
            </div>
          ) : null}
        </div>
      </nav>

      <FlowStepButtons />
    </header>
  );
}
