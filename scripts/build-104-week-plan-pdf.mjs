// Builds public/resources/104-week-bible-reading-plan.pdf from the SAME
// derived 104-week data the site renders — never from a hand-typed table, so
// the printed plan and the on-screen plan can't drift.
//
//   node scripts/build-104-week-plan-pdf.mjs
//
// Two pages: weeks 1-52, then weeks 53-104. Landscape US Letter, seven
// reading columns, printed with the base-14 Helvetica fonts every PDF reader
// carries — which is why this needs no PDF dependency at all.
//
// The 52-week PDF is the original source file and is never touched by this.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = join(ROOT, "public/resources/104-week-bible-reading-plan.pdf");

// ---------------------------------------------------------------------------
// Plan data: read straight out of the TypeScript sources, so this script and
// the app share one definition of the split.
// ---------------------------------------------------------------------------

function loadSourceWeeks() {
  const source = readFileSync(join(ROOT, "src/lib/bibleReadingPlan.ts"), "utf8");
  const declaration = source.indexOf("export const BIBLE_READING_PLAN_WEEKS");
  // "...: BibleReadingPlanWeek[] = [" — the array opens after the "=", not at
  // the "[]" in the type annotation.
  const arrayStart = source.indexOf("[", source.indexOf("=", declaration));

  let depth = 0;
  let arrayEnd = -1;
  for (let index = arrayStart; index < source.length; index += 1) {
    if (source[index] === "[") depth += 1;
    if (source[index] === "]") {
      depth -= 1;
      if (depth === 0) {
        arrayEnd = index;
        break;
      }
    }
  }

  return JSON.parse(source.slice(arrayStart, arrayEnd + 1));
}

function loadBookChapters() {
  const source = readFileSync(join(ROOT, "src/lib/scripture/books.ts"), "utf8");
  const chapters = new Map();
  for (const match of source.matchAll(
    /\{\s*usfm:\s*"([A-Z0-9]+)"[^}]*?chapters:\s*(\d+)/g,
  )) {
    chapters.set(match[1], Number(match[2]));
  }
  return chapters;
}

function loadBookCodes() {
  const source = readFileSync(join(ROOT, "src/lib/bibleReadingPlan.ts"), "utf8");
  const start = source.indexOf("BIBLE_READING_PLAN_BOOK_CODES");
  const body = source.slice(start, source.indexOf("};", start));
  const codes = new Map();
  for (const match of body.matchAll(/(?:"([^"]+)"|([A-Za-z]+)):\s*"([A-Z0-9]+)"/g)) {
    codes.set(match[1] ?? match[2], match[3]);
  }
  return codes;
}

const BOOK_CHAPTERS = loadBookChapters();
const BOOK_CODES = loadBookCodes();
const BOOK_NAMES = [...BOOK_CODES.keys()].sort((a, b) => b.length - a.length);

const CATCH_UP_READING = "Catch-up";

// Mirrors splitPlanReading() in src/lib/bibleReadingPlan104.ts. The vitest
// suite asserts the two agree reading-for-reading.
function splitPlanReading(reading) {
  const label = reading.trim().replace(/\s+/g, " ");
  const numbered = label.match(/^(.*?)\s+(\d+)(?:\s*[-–—]\s*(\d+))?$/);

  let token;
  let startChapter;
  let endChapter;

  if (numbered) {
    token = numbered[1].trim();
    startChapter = Number(numbered[2]);
    endChapter = numbered[3] ? Number(numbered[3]) : startChapter;
  } else {
    const bookName = BOOK_NAMES.find(
      (name) => label === name || label.startsWith(`${name} `),
    );
    if (!bookName) return [label, CATCH_UP_READING];
    const chapters = BOOK_CHAPTERS.get(BOOK_CODES.get(bookName));
    if (!chapters) return [label, CATCH_UP_READING];
    token = label;
    startChapter = 1;
    endChapter = chapters;
  }

  const chapterCount = endChapter - startChapter + 1;
  if (chapterCount <= 1) return [label, CATCH_UP_READING];

  const firstEnd = startChapter + Math.ceil(chapterCount / 2) - 1;
  const format = (from, to) => (from === to ? `${token} ${from}` : `${token} ${from}-${to}`);

  return [format(startChapter, firstEnd), format(firstEnd + 1, endChapter)];
}

function buildWeeks104() {
  const weeks = [];
  loadSourceWeeks().forEach((sourceWeek, index) => {
    const first = { week: index * 2 + 1, days: [] };
    const second = { week: index * 2 + 2, days: [] };
    for (const day of sourceWeek.days) {
      const [a, b] = splitPlanReading(day.reading);
      first.days.push({ ...day, week: first.week, reading: a });
      second.days.push({ ...day, week: second.week, reading: b });
    }
    weeks.push(first, second);
  });
  return weeks;
}

// ---------------------------------------------------------------------------
// Minimal PDF writer (base-14 fonts, no external dependency).
// ---------------------------------------------------------------------------

const PAGE_WIDTH = 792; // US Letter landscape
const PAGE_HEIGHT = 612;

function escapeText(value) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

class Content {
  constructor() {
    this.parts = [];
  }
  text(x, y, value, { font = "F1", size = 7, gray = 0 } = {}) {
    this.parts.push(
      `BT /${font} ${size} Tf ${gray} g 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${escapeText(value)}) Tj ET`,
    );
  }
  line(x1, y1, x2, y2, { width = 0.4, gray = 0.75 } = {}) {
    this.parts.push(
      `${width} w ${gray} G ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`,
    );
  }
  rect(x, y, w, h, gray) {
    this.parts.push(
      `${gray} g ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`,
    );
  }
  toString() {
    return this.parts.join("\n");
  }
}

const LANES = [
  ["Sun", "Epistles"],
  ["Mon", "The Law"],
  ["Tue", "History"],
  ["Wed", "Psalms"],
  ["Thu", "Poetry"],
  ["Fri", "Prophecy"],
  ["Sat", "Gospels"],
];

const MARGIN_X = 26;
const TOP = PAGE_HEIGHT - 30;
const WEEK_COL = 26;
const TABLE_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const LANE_WIDTH = (TABLE_WIDTH - WEEK_COL) / 7;

function drawPage(weeks, pageIndex) {
  const content = new Content();
  const firstWeek = weeks[0].week;
  const lastWeek = weeks[weeks.length - 1].week;

  // Title block
  content.text(MARGIN_X, TOP, "CrossHeartPray", { font: "F2", size: 13 });
  content.text(MARGIN_X + 108, TOP, "104 Week Bible Reading Plan", {
    font: "F2",
    size: 13,
  });
  content.text(
    MARGIN_X,
    TOP - 13,
    `2 Years - Weeks ${firstWeek}-${lastWeek}  (page ${pageIndex + 1} of 2)`,
    { size: 8, gray: 0.35 },
  );
  content.text(
    PAGE_WIDTH - MARGIN_X - 268,
    TOP - 13,
    "The same 52 Week Bible Reading Plan, paced across two years.",
    { size: 8, gray: 0.35 },
  );

  const headerY = TOP - 30;
  // The table ends well clear of the footer lines at y=20 and y=12.
  const TABLE_BOTTOM = 38;
  const rowHeight = (headerY - 12 - TABLE_BOTTOM) / 52;

  // Header row
  content.rect(MARGIN_X, headerY - 12, TABLE_WIDTH, 12, 0.9);
  content.text(MARGIN_X + 6, headerY - 9, "Wk", { font: "F2", size: 7 });
  LANES.forEach(([short, lane], index) => {
    const x = MARGIN_X + WEEK_COL + index * LANE_WIDTH + 4;
    content.text(x, headerY - 9, `${short}  ${lane}`, { font: "F2", size: 7 });
  });

  // Column rules
  for (let index = 0; index <= 7; index += 1) {
    const x = MARGIN_X + WEEK_COL + index * LANE_WIDTH;
    content.line(x, headerY, x, headerY - 12 - 52 * rowHeight, { gray: 0.8 });
  }
  content.line(MARGIN_X, headerY, MARGIN_X, headerY - 12 - 52 * rowHeight, { gray: 0.8 });
  content.line(
    MARGIN_X + TABLE_WIDTH,
    headerY,
    MARGIN_X + TABLE_WIDTH,
    headerY - 12 - 52 * rowHeight,
    { gray: 0.8 },
  );

  // Rows
  weeks.forEach((week, rowIndex) => {
    const rowTop = headerY - 12 - rowIndex * rowHeight;
    const baseline = rowTop - rowHeight + 2.6;

    if (rowIndex % 2 === 1) {
      content.rect(MARGIN_X, rowTop - rowHeight, TABLE_WIDTH, rowHeight, 0.96);
    }

    content.text(MARGIN_X + 6, baseline, String(week.week), { font: "F2", size: 6.6 });

    week.days.forEach((day, laneIndex) => {
      const x = MARGIN_X + WEEK_COL + laneIndex * LANE_WIDTH + 4;
      const isCatchUp = day.reading === CATCH_UP_READING;
      content.text(x, baseline, day.reading, {
        size: 6.6,
        gray: isCatchUp ? 0.55 : 0,
        font: isCatchUp ? "F3" : "F1",
      });
    });

    content.line(
      MARGIN_X,
      rowTop - rowHeight,
      MARGIN_X + TABLE_WIDTH,
      rowTop - rowHeight,
      { gray: 0.85 },
    );
  });

  content.line(MARGIN_X, headerY, MARGIN_X + TABLE_WIDTH, headerY, { gray: 0.6 });
  content.line(MARGIN_X, headerY - 12, MARGIN_X + TABLE_WIDTH, headerY - 12, {
    gray: 0.6,
  });

  // Footer / attribution — the original plan's provenance is preserved.
  content.text(
    MARGIN_X,
    20,
    "Weekly lanes: Sunday Epistles - Monday The Law - Tuesday History - Wednesday Psalms - Thursday Poetry - Friday Prophecy - Saturday Gospels.",
    { size: 6.4, gray: 0.45 },
  );
  content.text(
    MARGIN_X,
    12,
    "Derived from the 52 Week Bible Reading Plan by dividing each week's readings at chapter boundaries. Catch-up = a rest day where a single chapter could not be divided.   crossheartpray.com",
    { size: 6.4, gray: 0.45 },
  );

  return content.toString();
}

function buildPdf(pages) {
  const objects = [];
  const add = (body) => {
    objects.push(body);
    return objects.length; // 1-based object number
  };

  const pageObjectNumbers = [];
  const contentNumbers = pages.map((stream) =>
    add(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`),
  );

  const fontRegular = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontBold = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const fontOblique = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>");

  const pagesNumber = objects.length + pages.length + 1;

  contentNumbers.forEach((contentNumber) => {
    pageObjectNumbers.push(
      add(
        `<< /Type /Page /Parent ${pagesNumber} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
          `/Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R /F3 ${fontOblique} 0 R >> >> ` +
          `/Contents ${contentNumber} 0 R >>`,
      ),
    );
  });

  add(
    `<< /Type /Pages /Kids [${pageObjectNumbers.map((n) => `${n} 0 R`).join(" ")}] /Count ${pageObjectNumbers.length} >>`,
  );

  const infoNumber = add(
    "<< /Title (104 Week Bible Reading Plan) /Author (CrossHeartPray) " +
      "/Subject (The 52 Week Bible Reading Plan paced across two years) " +
      "/Creator (CrossHeartPray) >>",
  );
  const catalogNumber = add(`<< /Type /Catalog /Pages ${pagesNumber} 0 R >>`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf +=
    `trailer\n<< /Size ${objects.length + 1} /Root ${catalogNumber} 0 R /Info ${infoNumber} 0 R >>\n` +
    `startxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}

const weeks = buildWeeks104();
if (weeks.length !== 104) {
  throw new Error(`expected 104 weeks, built ${weeks.length}`);
}

const pdf = buildPdf([drawPage(weeks.slice(0, 52), 0), drawPage(weeks.slice(52), 1)]);
writeFileSync(OUTPUT, pdf);

console.log(
  `Wrote ${OUTPUT} (2 pages, weeks ${weeks[0].week}-${weeks[51].week} and ${weeks[52].week}-${weeks[103].week}, ${pdf.length} bytes)`,
);
