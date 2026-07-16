"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import OpenMirrorThemeToggle from "./OpenMirrorTheme";

// The one CrossHeartPray header: brand on the left (links home), the existing
// YouVersion Bible link centered, and the ☀️/🌙 switch + a single accessible
// menu button on the right — the same compact treatment on desktop and mobile.
// Menu destinations are the site's real current pages (the stable navigation),
// reached via their existing routes. Home is the brand and the first item.
const LINKS = [
  { href: "/", label: "Home" },
  { href: "/daily-hope", label: "Daily Hope" },
  { href: "/bible-reading-plan", label: "Reading Plan" },
  { href: "/life-essentials", label: "Life Essentials" },
  { href: "/explorebible", label: "Bible Bingo 7" },
  { href: "/about", label: "About" },
];

export default function ChpProductNav() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const menuId = useId();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const closeMenu = () => setOpen(false);

  // Close on Escape (focus returns to the button) and on any click/tap
  // outside the header.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open]);

  // On phones, lock the page behind the open menu so it can't drift or scroll
  // awkwardly. Desktop keeps its normal scroll — the dropdown is compact there.
  useEffect(() => {
    if (!open) return;
    if (!window.matchMedia("(max-width: 640px)").matches) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Move focus into the menu when it opens so keyboard users land on the first
  // item; Tab/Shift+Tab then walk the list naturally.
  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLElement>("a")?.focus();
  }, [open]);

  return (
    <header className="chp-header sticky top-0 z-50 border-b border-[#26324c] bg-[#0b1220]/95 backdrop-blur print:hidden">
      <div
        ref={containerRef}
        className="relative mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3"
      >
        <Link
          href="/"
          aria-label="CrossHeartPray home"
          className="justify-self-start inline-flex min-w-0 items-center gap-2 rounded-lg text-[#e8edf5] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60"
        >
          <span aria-hidden="true" className="text-base leading-none tracking-normal">
            ✝️ ❤️ 🙏
          </span>
          <span className="hidden truncate text-sm font-black tracking-tight sm:inline sm:text-base">
            CrossHeartPray
          </span>
        </Link>

        <a
          href="https://www.bible.com/verse-of-the-day"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open YouVersion Bible App"
          className="justify-self-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60"
        >
          <img
            src="/brand/youversion-bible-app.png"
            alt="Holy Bible"
            className="h-9 w-9 rounded-lg sm:h-10 sm:w-10"
          />
        </a>

        <div className="justify-self-end flex items-center gap-2">
          <OpenMirrorThemeToggle />

          <button
            ref={buttonRef}
            type="button"
            aria-label="Menu"
            aria-haspopup="true"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#26324c] bg-[#141d2e] px-3.5 py-2 text-sm font-black text-[#e8edf5] transition-colors hover:bg-[#1c2740] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60 sm:px-4"
          >
            <span aria-hidden="true" className="text-base leading-none">
              {open ? "✕" : "☰"}
            </span>
            <span className="hidden sm:inline">Menu</span>
          </button>

          {open ? (
            <nav
              id={menuId}
              ref={menuRef}
              aria-label="CrossHeartPray"
              className="absolute right-4 top-[calc(100%+8px)] z-[60] w-64 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-[#26324c] bg-[#141d2e] p-2 shadow-2xl shadow-black/40 sm:right-6"
              style={{ maxHeight: "min(70vh, 30rem)" }}
            >
              {LINKS.map((l) => {
                const active = isActive(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    onClick={closeMenu}
                    className={`flex min-h-11 items-center rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60 ${
                      active
                        ? "bg-[#4ADE80] text-[#06131a]"
                        : "text-[#e8edf5] hover:bg-[#1c2740]"
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>
          ) : null}
        </div>
      </div>
    </header>
  );
}
