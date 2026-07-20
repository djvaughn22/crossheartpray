"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  downloadInstagramCard,
  type InstagramCardContent,
} from "../lib/instagramCard";
import {
  computeSharePopoverPlacement,
  isShareCancel,
  SHARE_MESSAGES,
  sharePanelMode,
  shareSheetMaxHeight,
  type SharePanelMode,
  type SharePopoverPlacement,
} from "../lib/sharePanel";

import { track } from "../lib/analytics";
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
        "[role='dialog']",
        "[aria-haspopup='menu']",
        "[aria-haspopup='dialog']",
        ".print\\:hidden",
      ].join(","),
    )
    .forEach((node) => node.remove());

  const noisyLines = new Set([
    "Share",
    "Share using device",
    "Copy link",
    "Copy formatted email",
    "Email a link",
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

async function copyPlain(value: string) {
  track("share", { method: "copy" });
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
    } catch {
      return false;
    } finally {
      textarea.remove();
    }
  }
}

async function copyRich(html: string, plain: string) {
  track("share", { method: "copy_rich" });
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

// Only one share panel may be open at a time, app-wide. Opening a second one
// closes the first (Daily Hope renders several share buttons on one page).
let closeActiveShareMenu: (() => void) | null = null;

const actionItemClass =
  "block w-full min-h-[48px] rounded-xl px-4 py-3 text-left text-base font-black text-white break-words transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300 disabled:cursor-wait disabled:opacity-60";

const actionHintClass = "mt-0.5 block text-xs font-semibold leading-5 text-slate-300 break-words";

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
  void align; // Placement is now fully viewport-clamped; the prop is kept for compatibility.
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState<null | "device" | "square" | "portrait">(null);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [mode, setMode] = useState<SharePanelMode>("popover");
  const [placement, setPlacement] = useState<SharePopoverPlacement | null>(null);
  const [sheetMaxH, setSheetMaxH] = useState(480);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const statusTimer = useRef<number | null>(null);

  // Measure the viewport and trigger, pick sheet vs popover, clamp everything
  // inside the visible area. Re-run on resize/rotation while open.
  function applyLayout() {
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const nextMode = sharePanelMode(viewport);
    setMode(nextMode);
    setSheetMaxH(shareSheetMaxHeight(viewport));

    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setPlacement(
        computeSharePopoverPlacement(
          { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right },
          viewport,
        ),
      );
    }
  }

  function openMenu() {
    closeActiveShareMenu?.();
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    applyLayout();
    setStatus("");
    setOpen(true);
  }

  function closeMenu(restoreFocus = true) {
    setOpen(false);
    setStatus("");
    if (restoreFocus) triggerRef.current?.focus();
  }

  function toggleOpen() {
    if (open) closeMenu();
    else openMenu();
  }

  useEffect(() => {
    if (!open) return;

    const closeSelf = () => closeMenu(false);
    closeActiveShareMenu = closeSelf;

    // Move focus into the dialog. Effects run post-commit, so the panel exists;
    // rAF would be unreliable here (it never fires in backgrounded tabs).
    if (panelRef.current && !panelRef.current.contains(document.activeElement)) {
      panelRef.current.focus();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
        return;
      }
      if (event.key !== "Tab") return;

      // Keep keyboard focus cycling inside the dialog.
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]"),
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === first || active === panel || !panel.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    }

    function onScroll(event: Event) {
      // The bottom sheet is viewport-anchored; only the popover drifts on page scroll.
      if (mode === "sheet") return;
      if (
        panelRef.current &&
        event.target instanceof Node &&
        panelRef.current.contains(event.target)
      ) {
        return;
      }
      closeMenu(false);
    }

    function onResize() {
      // Rotation / zoom while open: re-pick sheet vs popover and re-clamp.
      applyLayout();
    }

    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    window.visualViewport?.addEventListener("resize", onResize);

    // The sheet dims and covers the page bottom; lock background scroll behind it.
    const previousOverflow = document.body.style.overflow;
    if (mode === "sheet") document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      document.body.style.overflow = previousOverflow;
      if (closeActiveShareMenu === closeSelf) closeActiveShareMenu = null;
    };
  }, [open, mode]);

  useEffect(() => {
    return () => {
      if (statusTimer.current) window.clearTimeout(statusTimer.current);
    };
  }, []);

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

  function flash(message: string) {
    setStatus(message);
    if (statusTimer.current) window.clearTimeout(statusTimer.current);
    statusTimer.current = window.setTimeout(() => setStatus(""), 2600);
  }

  async function shareViaDevice() {
    if (busy) return;
    setBusy("device");
    track("share", { method: "native" });
    try {
      await navigator.share({
        title: emailSubject,
        text: shareText.trim() || undefined,
        url: canonicalUrl,
      });
      setBusy(null);
      closeMenu();
    } catch (error) {
      setBusy(null);
      flash(isShareCancel(error) ? SHARE_MESSAGES.shareCanceled : SHARE_MESSAGES.shareFailed);
    }
  }

  async function copyLink() {
    const ok = await copyPlain(canonicalUrl);
    flash(ok ? SHARE_MESSAGES.linkCopied : SHARE_MESSAGES.copyBlocked);
  }

  async function copyEmailHtml() {
    const liveShareText = runtimeShareText(shareText, boardHref, canonicalUrl);
    const liveParsed = parseShare(liveShareText, canonicalUrl);
    const liveHtml = htmlEmail ?? cardShellHtml(liveParsed, emailSubject, itemLabel, true);
    const ok = await copyRich(liveHtml, shareText.trim() || canonicalUrl);
    flash(ok ? SHARE_MESSAGES.emailCopied : SHARE_MESSAGES.copyBlocked);
  }

  async function downloadCardImage(size: "square" | "portrait") {
    if (busy || !instagramContent) return;
    setBusy(size);
    flash(SHARE_MESSAGES.preparingCard);
    const ok = await downloadInstagramCard(instagramContent, size);
    setBusy(null);
    flash(ok ? SHARE_MESSAGES.cardDownloaded : SHARE_MESSAGES.cardFailed);
  }

  const kindName = titleNameFor(itemLabel);
  const visibleButtonLabel = buttonLabel || `Share ${kindName}`;
  const dialogLabel = `Share ${kindName}`;

  const panel = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={dialogLabel}
      ref={panelRef}
      tabIndex={-1}
      style={
        mode === "sheet"
          ? {
              // The dvh term self-clamps on rotation even if a resize event is missed.
              maxHeight: `min(${sheetMaxH}px, 88dvh)`,
              paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
            }
          : placement
            ? {
                position: "fixed",
                top: placement.top,
                left: placement.left,
                width: placement.width,
                maxHeight: placement.maxHeight,
              }
            : undefined
      }
      className={
        mode === "sheet"
          ? "fixed inset-x-0 bottom-0 z-[9999] mx-auto w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-3xl border border-white/15 bg-slate-950 p-2 pt-1 text-left shadow-2xl shadow-black/60 outline-none"
          : "z-[9999] overflow-y-auto overscroll-contain rounded-2xl border border-white/15 bg-slate-950 p-2 text-left shadow-2xl shadow-black/60 outline-none"
      }
    >
      {mode === "sheet" ? (
        <div aria-hidden className="mx-auto mb-1 mt-2 h-1 w-10 rounded-full bg-white/25" />
      ) : null}

      <div className="flex items-start justify-between gap-2 border-b border-white/10 px-3 py-2">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-emerald-100">
            {dialogLabel}
          </p>
          <p aria-live="polite" role="status" className="mt-1 min-h-5 text-xs font-black text-emerald-100">
            {status}
          </p>
        </div>
        <button
          type="button"
          onClick={() => closeMenu()}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-black text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"
        >
          <span aria-hidden>✕</span>
          <span className="sr-only">Close</span>
        </button>
      </div>

      {canNativeShare ? (
        <button
          type="button"
          onClick={shareViaDevice}
          disabled={busy === "device"}
          className={`${actionItemClass} mt-1 bg-emerald-400/15 hover:bg-emerald-400/25`}
        >
          Share using device
          <span className={actionHintClass}>Opens your device&rsquo;s own share options.</span>
        </button>
      ) : null}

      <button type="button" onClick={copyLink} className={actionItemClass}>
        Copy link
        <span className={actionHintClass}>Copies the link to this {kindName.toLowerCase()}.</span>
      </button>

      {instagramContent ? (
        <>
          <button
            type="button"
            onClick={() => downloadCardImage("square")}
            disabled={busy != null}
            className={actionItemClass}
          >
            {busy === "square" ? SHARE_MESSAGES.preparingCard : "Download card image"}
            <span className={actionHintClass}>Square 1080 × 1080 PNG for feed posts.</span>
          </button>

          <button
            type="button"
            onClick={() => downloadCardImage("portrait")}
            disabled={busy != null}
            className={actionItemClass}
          >
            {busy === "portrait" ? SHARE_MESSAGES.preparingCard : "Download portrait image"}
            <span className={actionHintClass}>Tall 1080 × 1350 PNG for stories and reels.</span>
          </button>
        </>
      ) : null}

      <button type="button" onClick={copyEmailHtml} className={actionItemClass}>
        Copy formatted email
        <span className={actionHintClass}>Paste into Gmail or any email to send the full {kindName.toLowerCase()}.</span>
      </button>

      <button
        type="button"
        onClick={() => {
          window.location.href = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(canonicalUrl)}`;
          closeMenu();
        }}
        className={actionItemClass}
      >
        Email a link
        <span className={actionHintClass}>Opens your email app with a plain link.</span>
      </button>
    </div>
  );

  return (
    <div className={`relative inline-flex ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        className={
          iconOnly
            ? "inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-sm font-black text-white shadow-lg shadow-black/20 transition hover:bg-white/15"
            : "inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-black/20 transition hover:bg-white/15"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        title={visibleButtonLabel}
      >
        {iconOnly ? "↗" : visibleButtonLabel}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <>
              {/* Full-screen click-catcher: tap anywhere off the panel to close. */}
              <button
                type="button"
                aria-label="Close share menu"
                onClick={() => closeMenu()}
                className={
                  mode === "sheet"
                    ? "fixed inset-0 z-[9998] cursor-default bg-black/60"
                    : "fixed inset-0 z-[9998] cursor-default"
                }
              />
              {panel}
            </>,
            document.body,
          )
        : null}
    </div>
  );
}
