// Client-side Instagram card generator. Pure native <canvas> — no dependencies,
// no external service, no upload. Renders a Cross Heart Pray share card and
// triggers a PNG download at Instagram's two standard sizes.

export type InstagramCardSize = "square" | "portrait";

export type InstagramCardContent = {
  eyebrow: string; // e.g. "Bible Bingo 7" or "Daily Hope"
  title: string; // e.g. "Romans 15:7" (reference) or the card title
  body: string; // verse text / main content
  tagline?: string; // e.g. "Context matters. One verse is the doorway. Read the chapter."
  footer?: string; // e.g. "crossheartpray.com"
  fileBase: string; // filename stem
};

const SIZES: Record<InstagramCardSize, { w: number; h: number }> = {
  square: { w: 1080, h: 1080 },
  portrait: { w: 1080, h: 1350 },
};

function safeFileName(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "crossheartpray-card"
  );
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) lines.push(current);
  return lines;
}

// Pick the largest body font size (within bounds) that fits the available box.
function fitBody(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  fontFamily: string,
  maxFont: number,
  minFont: number,
) {
  for (let size = maxFont; size >= minFont; size -= 2) {
    ctx.font = `600 ${size}px ${fontFamily}`;
    const lineHeight = size * 1.34;
    const lines = wrapLines(ctx, text, maxWidth);
    if (lines.length * lineHeight <= maxHeight) {
      return { size, lineHeight, lines };
    }
  }

  ctx.font = `600 ${minFont}px ${fontFamily}`;
  const lineHeight = minFont * 1.34;
  return { size: minFont, lineHeight, lines: wrapLines(ctx, text, maxWidth) };
}

export function renderInstagramCard(
  canvas: HTMLCanvasElement,
  content: InstagramCardContent,
  size: InstagramCardSize,
) {
  const { w, h } = SIZES[size];
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const serif = "Georgia, 'Times New Roman', serif";
  const sans = "Arial, Helvetica, sans-serif";
  const padX = 96;
  const contentWidth = w - padX * 2;

  // Background gradient — dark emerald → slate → rose, matching the app card.
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#052e26");
  bg.addColorStop(0.5, "#0b1220");
  bg.addColorStop(1, "#3f0d1d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle inner border frame.
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 3;
  const m = 44;
  const r = 56;
  ctx.beginPath();
  ctx.moveTo(m + r, m);
  ctx.arcTo(w - m, m, w - m, h - m, r);
  ctx.arcTo(w - m, h - m, m, h - m, r);
  ctx.arcTo(m, h - m, m, m, r);
  ctx.arcTo(m, m, w - m, m, r);
  ctx.closePath();
  ctx.stroke();

  ctx.textAlign = "center";
  const cx = w / 2;

  // ✝️ ❤️ 🙏
  ctx.font = `72px ${sans}`;
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  const topY = size === "portrait" ? 180 : 150;
  ctx.fillText("✝️   ❤️   🙏", cx, topY);

  // Eyebrow.
  ctx.font = `900 30px ${sans}`;
  ctx.fillStyle = "#a7f3d0";
  ctx.fillText(content.eyebrow.toUpperCase(), cx, topY + 96);

  // Title / reference.
  ctx.font = `800 76px ${serif}`;
  ctx.fillStyle = "#ffffff";
  const titleY = topY + 190;
  wrapLines(ctx, content.title, contentWidth).forEach((line, i) => {
    ctx.fillText(line, cx, titleY + i * 86);
  });

  // Body verse — auto-fit into the middle region.
  const bodyTop = titleY + 150;
  const footerReserve = content.tagline ? 260 : 180;
  const bodyMaxHeight = h - bodyTop - footerReserve;
  const fitted = fitBody(
    ctx,
    content.body,
    contentWidth,
    bodyMaxHeight,
    serif,
    size === "portrait" ? 58 : 52,
    30,
  );
  ctx.fillStyle = "#f1f5f9";
  ctx.font = `600 ${fitted.size}px ${serif}`;
  const bodyBlockHeight = fitted.lines.length * fitted.lineHeight;
  let bodyY = bodyTop + (bodyMaxHeight - bodyBlockHeight) / 2 + fitted.lineHeight / 2;
  for (const line of fitted.lines) {
    ctx.fillText(line, cx, bodyY);
    bodyY += fitted.lineHeight;
  }

  // Tagline.
  if (content.tagline) {
    ctx.font = `italic 500 32px ${serif}`;
    ctx.fillStyle = "#cbd5e1";
    const tagY = h - 148;
    wrapLines(ctx, content.tagline, contentWidth).forEach((line, i, arr) => {
      ctx.fillText(line, cx, tagY - (arr.length - 1 - i) * 44);
    });
  }

  // Footer.
  ctx.font = `900 26px ${sans}`;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText(
    (content.footer || "crossheartpray.com").toUpperCase(),
    cx,
    h - 78,
  );
}

export function downloadInstagramCard(
  content: InstagramCardContent,
  size: InstagramCardSize,
) {
  if (typeof document === "undefined") return;

  const canvas = document.createElement("canvas");
  renderInstagramCard(canvas, content, size);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFileName(content.fileBase)}-${
      size === "portrait" ? "1080x1350" : "1080x1080"
    }.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, "image/png");
}
