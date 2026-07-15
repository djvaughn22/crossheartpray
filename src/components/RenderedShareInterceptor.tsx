"use client";

import { useEffect, useState } from "react";

type ShareKind = "daily-hope" | "bible-bingo-board" | "bible-bingo-card";

type ShareOptions = {
  title: string;
  fileBase: string;
  heading: string;
  subheading: string;
  kind: ShareKind;
};

type ShareContext = {
  root: HTMLElement;
  options: ShareOptions;
  url: string;
};

function norm(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "cross-heart-pray"
  );
}

function supportedPath() {
  const path = window.location.pathname;
  return path.includes("/daily-hope") || path.includes("/explorebible") || path.includes("/bible-bingo");
}

function cleanText(value: string) {
  return value
    .replace(/ShareHTML copies complete formatted content and opens text\/email\.?/gi, "")
    .replace(/URL copies link only\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getActionLabel(action: HTMLElement) {
  return norm(
    [
      action.innerText || "",
      action.textContent || "",
      action.getAttribute("aria-label") || "",
      action.getAttribute("title") || "",
    ].join(" ")
  );
}

function isShareTrigger(action: HTMLElement) {
  const label = getActionLabel(action);
  if (!label) return false;
  return label.includes("share") || label.includes("email") || label.includes("text") || label.includes("copy html");
}

function optionsFor(action: HTMLElement): ShareOptions {
  const path = window.location.pathname;
  const label = getActionLabel(action);
  const href = window.location.href.toLowerCase();

  if (path.includes("/daily-hope")) {
    return {
      title: "Daily Hope Card Stack",
      fileBase: "daily-hope-card-stack",
      heading: "Daily Hope",
      subheading: "FULL PRAYER CARD STACK",
      kind: "daily-hope",
    };
  }

  const focused = label.includes("card") || href.includes("card=");
  return {
    title: focused ? "Bible Bingo Card" : "Bible Bingo Board",
    fileBase: focused ? "bible-bingo-card" : "bible-bingo-board",
    heading: "Bible Bingo",
    subheading: focused ? "FOCUSED CARD" : "FULL BOARD",
    kind: focused ? "bible-bingo-card" : "bible-bingo-board",
  };
}

function dynamicUrl(action: HTMLElement, options: ShareOptions) {
  const href =
    action instanceof HTMLAnchorElement &&
    action.href &&
    !action.href.startsWith("mailto:") &&
    !action.href.startsWith("sms:")
      ? action.href
      : window.location.href;

  const url = new URL(href, window.location.origin);
  if (options.kind === "bible-bingo-board") url.searchParams.delete("card");
  return url.toString();
}

function scoreBoardRoot(el: HTMLElement) {
  const text = norm(el.textContent || "");
  if (!text) return 0;

  const terms = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "epistles",
    "law",
    "history",
    "psalms",
    "poetry",
    "prophecy",
    "gospels",
  ];

  let score = 0;
  for (const term of terms) {
    if (text.includes(term)) score += 1;
  }

  if (text.includes("bible bingo")) score += 2;
  if (text.includes("deal 7")) score += 1;
  if (text.includes("next:") || text.includes("back:")) score -= 2;

  return score;
}

function findBoardRoot() {
  const main = document.querySelector<HTMLElement>("main") || document.body;
  const candidates = Array.from(main.querySelectorAll<HTMLElement>("section,article,div"));
  let best: HTMLElement | null = null;
  let bestRank = -Infinity;

  for (const el of candidates) {
    const rect = el.getBoundingClientRect();
    const text = cleanText(el.textContent || "");
    if (rect.width < 260 || rect.height < 160 || text.length < 120) continue;

    const score = scoreBoardRoot(el);
    if (score < 5) continue;

    const area = Math.max(1, rect.width * rect.height);
    const rank = score * 100000 - area * 0.02 - text.length * 0.5;

    if (rank > bestRank) {
      best = el;
      bestRank = rank;
    }
  }

  return best || main;
}

function findCardRoot(action: HTMLElement) {
  let node: HTMLElement | null = action;

  while (node && node !== document.body) {
    const text = cleanText(node.textContent || "");
    const cls = String(node.className || "").toLowerCase();
    const tag = node.tagName.toLowerCase();
    const rect = node.getBoundingClientRect();

    if (
      text.length > 80 &&
      text.length < 4500 &&
      rect.width > 220 &&
      rect.height > 120 &&
      (tag === "article" ||
        tag === "section" ||
        cls.includes("card") ||
        cls.includes("hope") ||
        cls.includes("bingo") ||
        cls.includes("share"))
    ) {
      return node;
    }

    node = node.parentElement;
  }

  const main = document.querySelector<HTMLElement>("main") || document.body;
  const candidates = Array.from(main.querySelectorAll<HTMLElement>("article,section,div"));
  let best: HTMLElement | null = null;
  let bestLen = Infinity;

  for (const el of candidates) {
    const text = cleanText(el.textContent || "");
    const rect = el.getBoundingClientRect();
    if (text.length < 80 || text.length > 4500 || rect.width < 220 || rect.height < 120) continue;
    if (!/\b(?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalm|Psalms|Proverbs|Ecclesiastes|Song|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|Jude|Revelation)\s+\d+:\d+/.test(text)) continue;

    if (text.length < bestLen) {
      best = el;
      bestLen = text.length;
    }
  }

  return best || main;
}

function findDailyHopeRoot(action: HTMLElement, options: ShareOptions) {
  const main = document.querySelector<HTMLElement>("main") || document.body;
  const candidates = Array.from(main.querySelectorAll<HTMLElement>("section,article,div"));

  let best: HTMLElement | null = null;
  let bestScore = -Infinity;

  for (const el of candidates) {
    const text = norm(el.textContent || "");
    const rect = el.getBoundingClientRect();
    if (rect.width < 280 || rect.height < 180 || text.length < 120) continue;

    let score = 0;
    if (text.includes("daily hope")) score += 2;
    if (text.includes("sinner prayer")) score += 10;
    if (text.includes("salvation prayer")) score += 10;
    if (text.includes("live in the moment")) score += 10;
    if (text.includes("romans 5:")) score += 5;
    if (text.includes("prayer card")) score += 4;

    if (text.includes("share daily hope card")) score -= 8;
    if (text.includes("email/text shares")) score -= 8;
    if (text.includes("copy url is link only")) score -= 8;
    if (text.includes("bible reading plan today")) score -= 4;
    if (text.includes("expand all days")) score -= 4;

    const rank = score * 100000 - Math.abs(text.length - 2200);
    if (score > bestScore) {
      best = el;
      bestScore = score;
    }
  }

  return bestScore >= 10 && best ? best : main;
}

function bestShareRoot(action: HTMLElement, options: ShareOptions) {
  const explicit =
    action.closest<HTMLElement>("[data-render-share-root]") ||
    document.querySelector<HTMLElement>("[data-render-share-root]");
  if (explicit) return explicit;

  if (options.kind === "bible-bingo-board") return findBoardRoot();
  if (options.kind === "daily-hope") return findDailyHopeRoot(action, options);
  return findCardRoot(action);
}

function shouldRemoveControl(el: HTMLElement) {
  const tag = el.tagName.toLowerCase();
  const label = norm([el.textContent || "", el.getAttribute("aria-label") || "", el.getAttribute("title") || ""].join(" "));

  if (["script", "style", "input", "textarea", "select", "nav", "form", "video", "audio"].includes(tag)) return true;
  if (tag === "button") return true;
  if (el.getAttribute("role") === "button" || el.getAttribute("role") === "dialog") return true;

  if (
    tag === "a" &&
    (label.includes("share") ||
      label.includes("copy") ||
      label.includes("email") ||
      label.includes("text") ||
      label.includes("print") ||
      label.includes("back:") ||
      label.includes("next:") ||
      label === "today" ||
      /^[smtwtfs]$/.test(label))
  ) {
    return true;
  }

  return false;
}

function cleanClone(clone: HTMLElement) {
  Array.from(clone.querySelectorAll<HTMLElement>("*")).forEach((el) => {
    if (shouldRemoveControl(el)) el.remove();
  });

  Array.from(clone.querySelectorAll<HTMLElement>("*")).forEach((el) => {
    const text = norm(el.textContent || "");
    if (text.includes("sharehtml copies complete formatted content")) el.remove();
    if (text === "url copies link only") el.remove();
  });

  clone.style.maxWidth = "100%";
  clone.style.margin = "0 auto";
}

function createCaptureNode(context: ShareContext) {
  const width = context.options.kind === "bible-bingo-board" ? 1040 : 760;

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.width = `${width}px`;
  host.style.zIndex = "-1";
  host.style.pointerEvents = "none";

  const wrapper = document.createElement("div");
  wrapper.style.width = `${width}px`;
  wrapper.style.boxSizing = "border-box";
  wrapper.style.background = "#eef7ff";
  wrapper.style.color = "#263034";
  wrapper.style.fontFamily = "Arial, Helvetica, sans-serif";
  wrapper.style.padding = context.options.kind === "bible-bingo-board" ? "42px" : "34px";

  const header = document.createElement("div");
  header.style.margin = "0 0 26px 0";
  header.innerHTML = `
    <div style="font-size:42px;line-height:1.1;margin-bottom:14px;">✝️ ❤️ 🙏</div>
    <div style="color:#456f59;font-size:18px;font-weight:900;letter-spacing:8px;margin-bottom:12px;">CROSS HEART PRAY</div>
    <div style="color:#263034;font-size:56px;font-weight:900;line-height:1.05;margin-bottom:12px;">${context.options.heading}</div>
    <div style="color:#456f59;font-size:22px;font-weight:900;letter-spacing:6px;">${context.options.subheading}</div>
  `;

  const clone = context.root.cloneNode(true) as HTMLElement;
  cleanClone(clone);

  clone.style.width = "100%";
  clone.style.maxWidth = "100%";
  clone.style.margin = "0 auto";
  clone.style.boxSizing = "border-box";

  const footer = document.createElement("div");
  footer.style.marginTop = "24px";
  footer.style.color = "#315c49";
  footer.style.fontSize = "17px";
  footer.style.fontWeight = "700";
  footer.style.lineHeight = "1.35";
  footer.style.wordBreak = "break-word";
  footer.textContent = `Open: ${context.url}`;

  wrapper.appendChild(header);
  wrapper.appendChild(clone);
  wrapper.appendChild(footer);
  host.appendChild(wrapper);
  document.body.appendChild(host);

  return { host, wrapper };
}

async function makeRenderedPng(context: ShareContext) {
  const { toBlob } = await import("html-to-image");
  const { host, wrapper } = createCaptureNode(context);

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready.catch(() => undefined);
    }

    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

    const blob = await toBlob(wrapper, {
      backgroundColor: "#eef7ff",
      cacheBust: true,
      pixelRatio: 2,
      filter: (node) => {
        if (!(node instanceof HTMLElement)) return true;
        if (node.closest("[data-render-share-modal='true']")) return false;
        return !shouldRemoveControl(node);
      },
      style: {
        transform: "none",
        opacity: "1",
      },
    });

    if (!blob) throw new Error("Rendered PNG blob failed.");

    return new File([blob], `${slugify(context.options.fileBase)}.png`, { type: "image/png" });
  } finally {
    host.remove();
  }
}

async function copyImage(file: File) {
  const ClipboardItemCtor = window.ClipboardItem;
  if (!navigator.clipboard?.write || !ClipboardItemCtor) return false;

  try {
    await navigator.clipboard.write([new ClipboardItemCtor({ "image/png": file })]);
    return true;
  } catch {
    return false;
  }
}

async function nativeShareImage(file: File, title: string, url: string) {
  const nav = navigator;
  if (!nav.share) return false;

  const fileOnly = { title, files: [file] };
  const fileWithUrl = { title, text: url, files: [file] };

  try {
    if (nav.canShare && !nav.canShare({ files: [file] })) return false;
  } catch {
    return false;
  }

  try {
    await nav.share(fileWithUrl);
    return true;
  } catch {
    try {
      await nav.share(fileOnly);
      return true;
    } catch {
      return false;
    }
  }
}

async function copyUrl(url: string, setStatus: (value: string) => void) {
  await navigator.clipboard.writeText(url);
  setStatus("URL copied.");
}

export default function RenderedShareInterceptor() {
  const [context, setContext] = useState<ShareContext | null>(null);
  const [status, setStatus] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!context) return;

    let cancelled = false;
    let objectUrl: string | null = null;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the rendered file whenever the share context changes
    setFile(null);
    setPreviewUrl(null);
    setStatus("Rendering PNG…");

    void makeRenderedPng(context)
      .then((nextFile) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(nextFile);
        setFile(nextFile);
        setPreviewUrl(objectUrl);
        setStatus("Rendered PNG ready.");
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setStatus("Render failed in this browser.");
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [context]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!supportedPath()) return;

      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-render-share-modal='true']")) return;

      const action = target.closest<HTMLElement>("button,a,[role='button']");
      if (!action || !isShareTrigger(action)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const options = optionsFor(action);
      const root = bestShareRoot(action, options);
      const url = dynamicUrl(action, options);

      setStatus("");
      setContext({ root, options, url });
    };

    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);

  if (!context) return null;

  const item = context.options.kind === "bible-bingo-board" ? "board" : "card";
  const ready = Boolean(file);

  const shareRendered = async (target: "Mail" | "Messages") => {
    if (!file) {
      setStatus("Still rendering PNG…");
      return;
    }

    setStatus(`Opening share sheet. Choose ${target}.`);
    const shared = await nativeShareImage(file, context.options.title, context.url);

    if (shared) {
      setStatus("Rendered PNG shared.");
      return;
    }

    const copied = await copyImage(file);
    setStatus(
      copied
        ? `Browser blocked direct ${target} attachment. Rendered PNG copied — paste it into ${target}.`
        : `Browser blocked direct ${target} attachment. Rendered PNG preview is below.`
    );
  };

  return (
    <div
      data-render-share-modal="true"
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        background: "rgba(0,0,0,0.62)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
      }}
      onClick={() => setContext(null)}
    >
      <div
        style={{
          width: "min(430px, 100%)",
          maxHeight: "92vh",
          overflow: "auto",
          borderRadius: 28,
          background: "#eef7ff",
          color: "#263034",
          border: "1px solid rgba(184,225,213,0.95)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
          padding: 22,
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ fontSize: 30, lineHeight: 1, marginBottom: 10 }}>✝️ ❤️ 🙏</div>
        <div style={{ color: "#456f59", fontSize: 12, fontWeight: 900, letterSpacing: 4, marginBottom: 8 }}>
          CROSS HEART PRAY
        </div>

        <h2 style={{ margin: "0 0 6px 0", fontSize: 30, lineHeight: 1.1, fontWeight: 900 }}>
          Share {context.options.title}
        </h2>

        <p style={{ margin: "0 0 18px 0", color: "#526166", fontSize: 14, lineHeight: 1.35 }}>
          Email/Text shares the rendered PNG. Copy URL is link only.
        </p>

        <div style={{ display: "grid", gap: 10 }}>
          <button
            type="button"
            disabled={!ready}
            onClick={() => void shareRendered("Mail")}
            style={{
              width: "100%",
              border: 0,
              borderRadius: 18,
              padding: "14px 16px",
              fontSize: 16,
              fontWeight: 900,
              background: ready ? "#315c49" : "#9fb5ad",
              color: "white",
              cursor: ready ? "pointer" : "wait",
              textAlign: "left",
            }}
          >
            📧 Email rendered {item}
          </button>

          <button
            type="button"
            disabled={!ready}
            onClick={() => void shareRendered("Messages")}
            style={{
              width: "100%",
              border: 0,
              borderRadius: 18,
              padding: "14px 16px",
              fontSize: 16,
              fontWeight: 900,
              background: ready ? "#315c49" : "#9fb5ad",
              color: "white",
              cursor: ready ? "pointer" : "wait",
              textAlign: "left",
            }}
          >
            💬 Text rendered {item}
          </button>

          <button
            type="button"
            onClick={() => void copyUrl(context.url, setStatus)}
            style={{
              width: "100%",
              border: "2px solid #b8e1d5",
              borderRadius: 18,
              padding: "14px 16px",
              fontSize: 16,
              fontWeight: 900,
              background: "white",
              color: "#315c49",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            🔗 Copy URL only
          </button>
        </div>

        <div
          style={{
            marginTop: 14,
            minHeight: 20,
            color: "#315c49",
            fontSize: 13,
            fontWeight: 800,
            wordBreak: "break-word",
          }}
        >
          {status}
        </div>

        {previewUrl ? (
          <img
            src={previewUrl}
            alt={`${context.options.title} rendered preview`}
            style={{
              display: "block",
              width: "100%",
              height: "auto",
              marginTop: 14,
              borderRadius: 18,
              border: "1px solid #b8e1d5",
              background: "#eef7ff",
            }}
          />
        ) : null}

        <button
          type="button"
          onClick={() => setContext(null)}
          style={{
            marginTop: 14,
            width: "100%",
            border: 0,
            borderRadius: 16,
            padding: "11px 14px",
            fontSize: 14,
            fontWeight: 900,
            background: "rgba(49,92,73,0.09)",
            color: "#315c49",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
