"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  downloadInstagramCard,
  type InstagramCardContent,
} from "../lib/instagramCard";

export type ShareItemLabel = "board" | "card" | "dailyHope" | string;

export type CrossHeartPrayShareMenuProps = {
  boardHref: string;
  boardUrl?: string;
  shareText: string;
  emailSubject?: string;
  htmlEmail?: string;
  align?: "left" | "right" | "center";
  itemLabel?: ShareItemLabel;
  buttonLabel?: string;
  iconOnly?: boolean;
  className?: string;
  instagramContent?: InstagramCardContent;
  [key: string]: unknown;
};

type ParsedCard = {
  title: string;
  lines: string[];
  links: string[];
};

type ParsedShare = {
  metaLines: string[];
  cards: ParsedCard[];
  links: string[];
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value: string) {
  return escapeHtml(value);
}

function titleNameFor(itemLabel: ShareItemLabel) {
  if (itemLabel === "dailyHope") return "Daily Hope";
  if (itemLabel === "board") return "Board";
  return "Card";
}

function safeFileName(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72) || "crossheartpray-share"
  );
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function extractUrls(value: string): string[] {
  return Array.from(value.match(/https?:\/\/[^\s<>"')]+/g) ?? []);
}

function cleanTextLine(value: string) {
  return value
    .replace(/https?:\/\/[^\s<>"')]+/g, "")
    .replace(/\bOpen online:\s*/gi, "")
    .replace(/\bOpen:\s*/gi, "")
    .replace(/\bURL:\s*/gi, "")
    .replace(/\bLink:\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeReference(value: string) {
  return /^[1-3]?\s?[A-Za-z]+(?:\s+[A-Za-z]+)?\s+\d+(?::\d+)?(?:[-–]\d+)?/.test(value);
}

function looksLikeCardStart(value: string) {
  return (
    /^(card\s+\d+|verse card|prayer card|daily hope|sinner prayer|salvation prayer|live in the moment prayer|board)/i.test(value) ||
    looksLikeReference(value)
  );
}

function looksLikeMeta(value: string) {
  return /^(to:|from:|shared:|date:|section:|lane:|week:|day:)/i.test(value);
}

function lineKind(value: string) {
  if (looksLikeReference(value)) return "reference";
  if (/^(card\s+\d+|verse card|prayer card|daily hope|sinner prayer|salvation prayer|live in the moment prayer|board)/i.test(value)) {
    return "heading";
  }
  if (looksLikeMeta(value)) return "meta";
  if (value.length > 90) return "main";
  return "line";
}

function parseShare(shareText: string, canonicalUrl: string): ParsedShare {
  const rawLines = shareText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const metaLines: string[] = [];
  const cards: ParsedCard[] = [];
  const allLinks: string[] = [...extractUrls(shareText)];

  let currentTitle = "Card";
  let currentLines: string[] = [];
  let currentLinks: string[] = [];
  let hasCurrent = false;

  function startCard(title = "Card") {
    hasCurrent = true;
    currentTitle = title || "Card";
    currentLines = [];
    currentLinks = [];
  }

  function flushCard() {
    if (!hasCurrent) return;

    if (currentLines.length || currentLinks.length) {
      cards.push({
        title: currentTitle || "Card",
        lines: [...currentLines],
        links: unique(currentLinks),
      });
    }

    hasCurrent = false;
    currentTitle = "Card";
    currentLines = [];
    currentLinks = [];
  }

  for (const rawLine of rawLines) {
    const urls = extractUrls(rawLine);
    const clean = cleanTextLine(rawLine);

    if (!clean && urls.length) {
      if (!hasCurrent) startCard("Card");
      currentLinks.push(...urls);
      continue;
    }

    if (!clean) continue;

    const isEarlyMeta =
      !hasCurrent &&
      cards.length === 0 &&
      (looksLikeMeta(clean) || /^cross\s?heart\s?pray|^crossheartpray|^bible bingo 7/i.test(clean));

    if (isEarlyMeta) {
      metaLines.push(clean);
      allLinks.push(...urls);
      continue;
    }

    const startsCard = looksLikeCardStart(clean);

    if (startsCard && hasCurrent && currentLines.length > 0) {
      flushCard();
    }

    if (!hasCurrent) {
      startCard(startsCard ? clean : "Card");
    }

    if (startsCard && currentLines.length === 0) {
      currentTitle = clean;
    }

    currentLines.push(clean);
    currentLinks.push(...urls);
  }

  flushCard();

  if (!cards.length) {
    cards.push({
      title: "Card",
      lines: metaLines.length ? [...metaLines] : ["CrossHeartPray card details."],
      links: [],
    });
    metaLines.length = 0;
  }

  const links = unique([...allLinks, canonicalUrl].filter(Boolean));

  return {
    metaLines,
    cards,
    links,
  };
}
function paragraphHtml(line: string, allowLinks: boolean) {
  const kind = lineKind(line);
  const html = allowLinks ? linkify(line) : escapeHtml(cleanTextLine(line) || line);

  const styleByKind: Record<string, string> = {
    heading: "margin:0 0 8px;color:#065f46;font:900 13px Arial,sans-serif;text-transform:uppercase;letter-spacing:1.4px;",
    reference: "margin:0 0 8px;color:#065f46;font:900 14px Arial,sans-serif;text-transform:uppercase;letter-spacing:1.2px;",
    meta: "margin:0 0 8px;color:#475569;font:900 11px Arial,sans-serif;text-transform:uppercase;letter-spacing:1.2px;",
    main: "margin:0 0 10px;color:#0f172a;font-size:19px;line-height:1.52;",
    line: "margin:0 0 9px;color:#0f172a;font-size:16px;line-height:1.45;",
  };

  return `<p class="${kind}" style="${styleByKind[kind] ?? styleByKind.line}">${html}</p>`;
}

function linkify(value: string) {
  const urlPattern = /(https?:\/\/[^\s<>"')]+)/g;

  return value
    .split(urlPattern)
    .map((part) => {
      if (/^https?:\/\//i.test(part)) {
        const safeUrl = escapeAttr(part);
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color:#065f46;font-weight:900;text-decoration:underline;text-underline-offset:3px;">${escapeHtml(part)}</a>`;
      }

      return escapeHtml(part);
    })
    .join("");
}

function cardShellHtml(parsed: ParsedShare, title: string, itemLabel: ShareItemLabel, allowLinks: boolean) {
  const safeTitle = escapeHtml(title);
  const safeKind = escapeHtml(titleNameFor(itemLabel));

  const metaHtml = parsed.metaLines.length
    ? `<div style="margin:0 0 14px;padding:12px 14px;border:1px solid #cbd5e1;border-radius:18px;background:#f8fafc;">${parsed.metaLines
        .map((line) => paragraphHtml(line, allowLinks))
        .join("")}</div>`
    : "";

  const cardsHtml = parsed.cards
    .map((card, index) => {
      const body = card.lines.map((line) => paragraphHtml(line, allowLinks)).join("");

      const localLinks = unique([...card.links]);
      const linksHtml =
        allowLinks && localLinks.length
          ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid #e2e8f0;">${localLinks
              .map((url) => {
                const safeUrl = escapeAttr(url);
                return `<p style="margin:0 0 7px;color:#475569;font:800 11px Arial,sans-serif;text-transform:uppercase;letter-spacing:1px;">Open source: <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color:#065f46;font-weight:900;text-decoration:underline;text-underline-offset:3px;">${escapeHtml(url)}</a></p>`;
              })
              .join("")}</div>`
          : "";

      return `<article style="break-inside:avoid;margin:0 0 14px;border:1px solid #cbd5e1;border-radius:22px;background:#ffffff;padding:18px;box-shadow:0 8px 22px rgba(15,23,42,0.08);">
        <div style="margin:0 0 10px;color:#94a3b8;font:900 10px Arial,sans-serif;text-transform:uppercase;letter-spacing:1.4px;">${parsed.cards.length > 1 ? `Card ${index + 1}` : "Card"}</div>
        ${body}
        ${linksHtml}
      </article>`;
    })
    .join("");

  const allLinksHtml =
    allowLinks && parsed.links.length
      ? `<div style="margin-top:14px;padding:14px;border:1px solid #cbd5e1;border-radius:18px;background:#f8fafc;">
          <p style="margin:0 0 8px;color:#475569;font:900 11px Arial,sans-serif;text-transform:uppercase;letter-spacing:1.2px;">Links</p>
          ${parsed.links
            .map((url) => {
              const safeUrl = escapeAttr(url);
              return `<p style="margin:0 0 7px;color:#475569;font:800 11px Arial,sans-serif;letter-spacing:.4px;overflow-wrap:anywhere;"><a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color:#065f46;font-weight:900;text-decoration:underline;text-underline-offset:3px;">${escapeHtml(url)}</a></p>`;
            })
            .join("")}
        </div>`
      : "";

  return `<section style="font-family:Georgia,'Times New Roman',serif;color:#0f172a;background:#f8fafc;padding:22px;">
  <div style="max-width:880px;margin:0 auto;background:#ffffff;border:2px solid #0f172a;border-radius:28px;padding:24px;">
    <div style="text-align:center;font-size:28px;letter-spacing:8px;">✝️ ❤️ 🙏</div>
    <p style="text-align:center;margin:8px 0;color:#334155;font:900 11px Arial,sans-serif;text-transform:uppercase;letter-spacing:1.6px;">CrossHeartPray · ${safeKind}</p>
    <h1 style="margin:0 0 18px;text-align:center;font-size:30px;line-height:1.08;">${safeTitle}</h1>
    ${metaHtml}
    <div>${cardsHtml}</div>
    ${allLinksHtml}
    <p style="margin-top:16px;text-align:center;color:#475569;font:800 11px Arial,sans-serif;text-transform:uppercase;letter-spacing:1.3px;">Cross Heart Pray your way through it.</p>
  </div>
</section>`;
}

function documentHtml(parsed: ParsedShare, title: string, itemLabel: ShareItemLabel) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: letter portrait; margin: 0.38in; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #f8fafc; }
    @media print {
      body { background: #ffffff; }
      section { padding: 0 !important; }
      section > div { box-shadow: none !important; }
      article { box-shadow: none !important; }
    }
  </style>
</head>
<body>
${cardShellHtml(parsed, title, itemLabel, true)}
</body>
</html>`;
}

function plainText(parsed: ParsedShare, title: string) {
  const parts: string[] = [title, ""];

  if (parsed.metaLines.length) {
    parts.push(...parsed.metaLines, "");
  }

  parsed.cards.forEach((card, index) => {
    parts.push(parsed.cards.length > 1 ? `Card ${index + 1}` : "Card");
    parts.push(...card.lines);
    if (card.links.length) {
      parts.push("Links:");
      parts.push(...card.links);
    }
    parts.push("");
  });

  if (parsed.links.length) {
    parts.push("All links:");
    parts.push(...parsed.links);
  }

  return parts.join("\n").trim();
}


function shareTargetElement(boardHref: string, canonicalUrl: string) {
  if (typeof document === "undefined") return null;

  let hash = "";

  try {
    if (boardHref.startsWith("#")) {
      hash = boardHref;
    } else {
      hash = new URL(canonicalUrl || boardHref, window.location.href).hash;
    }
  } catch {
    hash = "";
  }

  if (hash) {
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (target) return target;
  }

  return document.querySelector("main");
}

function cleanedDomShareText(element: Element | null) {
  if (!element || typeof document === "undefined") return "";

  const clone = element.cloneNode(true) as HTMLElement;

  clone
    .querySelectorAll(
      [
        "script",
        "style",
        "button",
        "nav",
        "header",
        "footer",
        "[role='menu']",
        "[aria-haspopup='menu']",
        ".print\\:hidden",
      ].join(","),
    )
    .forEach((node) => node.remove());

  const noisyLines = new Set([
    "Share",
    "Copy rich email HTML",
    "Copy URL",
    "HTML copies complete formatted content and opens text/email. URL copies link only.",
    "Complete text first, links below, ready for text/email.",
    "Link only.",
    "Deep Dive",
    "Open",
    "Tools",
  ]);

  return (clone.innerText || clone.textContent || "")
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((line) => !noisyLines.has(line))
    .join("\n");
}

function targetLinks(element: Element | null, canonicalUrl: string) {
  const links: string[] = [];

  if (element) {
    element.querySelectorAll("a[href]").forEach((anchor) => {
      const href = anchor.getAttribute("href");
      if (!href) return;

      try {
        links.push(new URL(href, window.location.origin).toString());
      } catch {
        links.push(href);
      }
    });
  }

  if (canonicalUrl) links.push(canonicalUrl);

  return unique(links);
}

function runtimeShareText(shareText: string, boardHref: string, canonicalUrl: string) {
  if (typeof document === "undefined") return shareText;

  const target = shareTargetElement(boardHref, canonicalUrl);
  const domText = cleanedDomShareText(target);
  const links = targetLinks(target, canonicalUrl);

  const baseText =
    domText.length > shareText.length + 40 || shareText.length < 140
      ? domText || shareText
      : shareText;

  return [baseText, "", ...links].filter(Boolean).join("\n");
}


function menuPositionClass(align: CrossHeartPrayShareMenuProps["align"]) {
  if (align === "left") return "left-0";
  if (align === "center") return "left-1/2 -translate-x-1/2";
  return "right-0";
}

async function copyPlain(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand("copy");
      return true;
    } finally {
      textarea.remove();
    }
  }
}

async function copyRich(html: string, plain: string) {
  try {
    if (navigator.clipboard && "write" in navigator.clipboard && typeof ClipboardItem !== "undefined") {
      const item = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([plain], { type: "text/plain" }),
      });
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch {
    // Fall back below.
  }

  return copyPlain(plain);
}

function downloadHtml(fileName: string, html: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function printHtml(html: string) {
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=1100");

  if (!printWindow) {
    downloadHtml("crossheartpray-full-cards.html", html);
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  window.setTimeout(() => {
    printWindow.print();
  }, 350);
}

export default function CrossHeartPrayShareMenu({
  boardHref,
  boardUrl,
  shareText,
  emailSubject = "CrossHeartPray Share",
  htmlEmail,
  align = "right",
  itemLabel = "card",
  buttonLabel,
  iconOnly = false,
  className = "",
  instagramContent,
}: CrossHeartPrayShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState("");
  const [coords, setCoords] = useState<{
    top: number;
    left?: number;
    right?: number;
    center?: number;
  } | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  function toggleOpen() {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const top = rect.bottom + 8;
      if (align === "left") setCoords({ top, left: rect.left });
      else if (align === "center") setCoords({ top, center: rect.left + rect.width / 2 });
      else setCoords({ top, right: window.innerWidth - rect.right });
    }
    setOpen(true);
  }

  const canonicalUrl = useMemo(() => {
    if (boardUrl) return boardUrl;
    if (typeof window !== "undefined") {
      try {
        return new URL(boardHref || window.location.href, window.location.origin).toString();
      } catch {
        return window.location.href;
      }
    }
    return boardHref || "";
  }, [boardHref, boardUrl]);

  const parsed = useMemo(() => parseShare(shareText, canonicalUrl), [shareText, canonicalUrl]);
  const fullHtml = useMemo(() => documentHtml(parsed, emailSubject, itemLabel), [parsed, emailSubject, itemLabel]);
  const copyHtml = useMemo(() => cardShellHtml(parsed, emailSubject, itemLabel, true), [parsed, emailSubject, itemLabel]);
  const fullText = useMemo(() => plainText(parsed, emailSubject), [parsed, emailSubject]);
  const fileName = `${safeFileName(emailSubject)}.html`;

  // The menu is portaled to <body>, so it escapes card transforms/stacking and
  // is always the top layer. The backdrop handles outside-click; here we just
  // close on Escape and when the page scrolls/resizes (fixed coords would drift).
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onScrollOrResize() {
      setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  function flash(message: string) {
    setCopied(message);
    window.setTimeout(() => setCopied(""), 1800);
  }

  const visibleButtonLabel = buttonLabel || `Share ${titleNameFor(itemLabel)}`;

  return (
    <div ref={rootRef} className={`relative inline-flex ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        className={
          iconOnly
            ? "inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-sm font-black text-white shadow-lg shadow-black/20 transition hover:bg-white/15"
            : "inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-black/20 transition hover:bg-white/15"
        }
        aria-haspopup="menu"
        aria-expanded={open}
        title={visibleButtonLabel}
      >
        {iconOnly ? "↗" : visibleButtonLabel}
      </button>

      {open && coords && typeof document !== "undefined"
        ? createPortal(
            <>
              {/* Full-screen click-catcher: tap anywhere off the menu to close. */}
              <button
                type="button"
                aria-label="Close share menu"
                onClick={() => setOpen(false)}
                className="fixed inset-0 z-[9998] cursor-default"
              />
              <div
                role="menu"
                style={{
                  position: "fixed",
                  top: coords.top,
                  left: coords.left ?? coords.center,
                  right: coords.right,
                  transform: coords.center != null ? "translateX(-50%)" : undefined,
                }}
                className="z-[9999] w-72 max-w-[calc(100vw-1.5rem)] max-h-[75vh] overflow-y-auto overscroll-contain rounded-2xl border border-white/15 bg-slate-950 p-2 text-left shadow-2xl shadow-black/60"
              >
          <div className="border-b border-white/10 px-3 py-2">
            <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-emerald-100">
              Share
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-300">
              Copy HTML, then paste into Gmail. Or open your email app with a plain text link.
            </p>
            {copied ? (
              <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-100">{copied}</p>
            ) : null}
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              const liveShareText = runtimeShareText(shareText, boardHref, canonicalUrl);
              const liveParsed = parseShare(liveShareText, canonicalUrl);
              const liveHtml = htmlEmail ?? cardShellHtml(liveParsed, emailSubject, itemLabel, true);
              await copyRich(liveHtml, shareText.trim() || canonicalUrl);
              flash("Rich email HTML copied. Open Gmail/email and paste into the body.");
            }}
            className="block w-full rounded-xl px-3 py-4 text-left text-base font-black text-white hover:bg-white/10"
          >
            Copy rich email HTML
            <span className="mt-1 block text-xs font-semibold leading-5 text-slate-300">
              Paste into Gmail or any email to send formatted.
            </span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              window.location.href = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(canonicalUrl)}`;
              setOpen(false);
            }}
            className="block w-full rounded-xl px-3 py-4 text-left text-base font-black text-white hover:bg-white/10"
          >
            Open email with plain text link
            <span className="mt-1 block text-xs font-semibold leading-5 text-slate-300">
              Opens your email app with a plain text link.
            </span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              const ok = await copyPlain(canonicalUrl);
              flash(ok ? "URL copied" : "Copy blocked");
              setOpen(false);
            }}
            className="block w-full rounded-xl px-3 py-4 text-left text-base font-black text-white hover:bg-white/10"
          >
            Copy URL
            <span className="mt-1 block text-xs font-semibold leading-5 text-slate-300">
              Link only.
            </span>
          </button>

          {instagramContent ? (
            <div className="mt-1 border-t border-white/10 pt-1">
              <p className="px-3 pb-1 pt-2 text-[0.62rem] font-black uppercase tracking-[0.16em] text-emerald-100">
                Save as image
              </p>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  downloadInstagramCard(instagramContent, "square");
                  flash("Saved square image (1080 × 1080).");
                  setOpen(false);
                }}
                className="block w-full rounded-xl px-3 py-4 text-left text-base font-black text-white hover:bg-white/10"
              >
                Instagram square
                <span className="mt-1 block text-xs font-semibold leading-5 text-slate-300">
                  1080 × 1080 PNG for feed posts.
                </span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  downloadInstagramCard(instagramContent, "portrait");
                  flash("Saved portrait image (1080 × 1350).");
                  setOpen(false);
                }}
                className="block w-full rounded-xl px-3 py-4 text-left text-base font-black text-white hover:bg-white/10"
              >
                Instagram portrait
                <span className="mt-1 block text-xs font-semibold leading-5 text-slate-300">
                  1080 × 1350 PNG, story-safe.
                </span>
              </button>
            </div>
          ) : null}
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  );
}
