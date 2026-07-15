"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/daily-hope", label: "Daily Hope" },
  { href: "/explorebible", label: "Bible Bingo 7" },
  { href: "/bible-reading-plan", label: "Reading Plan" },
  { href: "/life-essentials", label: "Life Essentials" },
  { href: "/about", label: "About" },
];

export default function ChpProductNav() {
  const pathname = usePathname() || "/";
  const isActive = (href: string) => pathname.startsWith(href);
  return (
    <nav
      aria-label="CrossHeartPray"
      className="chp-product-nav sticky top-0 z-40 border-b border-[#26324c] bg-[#0b1220]/95 backdrop-blur print:hidden"
    >
      {/* Same 680px centered container as the Open Mirror bar above, so the
          brand mark lines up under "Open Mirror LLC" and the links under Menu. */}
      <div className="mx-auto flex max-w-[680px] items-center justify-between gap-3 overflow-x-auto px-4 py-2 sm:px-5">
        <Link
          href="/"
          aria-label="CrossHeartPray home"
          className="shrink-0 text-sm font-black tracking-tight text-[#e8edf5]"
        >
          ✝️ ❤️ 🙏
        </Link>
        <div className="flex items-center gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                isActive(l.href)
                  ? "chp-pnav-active bg-[#4ADE80] text-[#06131a]"
                  : "text-[#94a3b8] hover:bg-[#141d2e] hover:text-[#e8edf5]"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
