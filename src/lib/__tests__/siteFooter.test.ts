// Family footer standard guard (owner, 2026-08-02), CrossHeartPray edition:
//   OpenMirrorLLC.com · About · ✝️ ❤️ 🙏
//   Contact · Disclaimer      (anchors into /about's own sections)
//   Open Mirror LLC is a small independent company.
// On CrossHeartPray the icon group IS the "Love God, love your neighbor"
// interaction — one accessible control opening Matthew 22:35–40 in the
// internal KindleReaderModal. Locked Scripture rule: the footer never links
// to an external Bible resource.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const footer = readFileSync(
  join(__dirname, "../../components/SiteFooter.tsx"),
  "utf8",
);
const about = readFileSync(
  join(__dirname, "../../app/about/page.tsx"),
  "utf8",
);

describe("CrossHeartPray family footer", () => {
  it("line one: OpenMirrorLLC.com · About · the icon control", () => {
    expect(footer).toContain("OpenMirrorLLC.com");
    expect(footer).toContain('"https://openmirrorllc.com"');
    expect(footer).toContain('href="/about"');
    expect(footer).toContain('<span aria-hidden="true">✝️ ❤️ 🙏</span>');
  });

  it("the icon group opens Scripture internally, never an external Bible", () => {
    expect(footer).toContain("KindleReaderModal");
    expect(footer).toMatch(/aria-label="Love God, love your neighbor/);
    expect(footer).toContain('book: "MAT", chapter: 22, verse: 35');
    for (const banned of ["bible.com", "biblehub", "youversion"]) {
      expect(footer.toLowerCase()).not.toContain(banned);
    }
  });

  it("line two anchors into this site's own About sections", () => {
    expect(footer).toContain('href="/about#contact"');
    expect(footer).toContain('href="/about#disclaimer"');
    expect(footer).not.toContain("mailto:");
    expect(about).toContain('id="contact"');
    expect(about).toContain('id="disclaimer"');
  });

  it("the About page has exactly one #contact and one #disclaimer section with real content, not duplicated", () => {
    expect(about.match(/id="contact"/g) ?? []).toHaveLength(1);
    expect(about.match(/id="disclaimer"/g) ?? []).toHaveLength(1);

    const contactSection = about.slice(
      about.indexOf('id="contact"'),
      about.indexOf('id="disclaimer"'),
    );
    expect(contactSection).toContain("ask@openmirrorllc.com");

    const start = about.indexOf('id="disclaimer"');
    const disclaimerSection = about
      .slice(start, about.indexOf("</section>", start))
      .replace(/\s+/g, " ");
    expect(disclaimerSection).toContain("independently owned and operated");
    expect(disclaimerSection).toContain("current or former employers");
    expect(disclaimerSection).toContain("https://openmirrorllc.com/disclaimer");
  });

  it("the disclaimer sets Scripture apart and never files it under generic warnings", () => {
    const start = about.indexOf('id="disclaimer"');
    const flat = about
      .slice(start, about.indexOf("</section>", start))
      .replace(/\s+/g, " ")
      .replace(/&rsquo;/g, "’");
    // Owner brief (2026-11-03): Scripture is God's Word, quoted and never
    // rewritten; the helps around it are named as helps, not Scripture.
    expect(flat).toContain("Scripture on CrossHeartPray is God’s Word");
    expect(flat).toContain("never rewritten");
    expect(flat).toContain("they are not Scripture");
    for (const banned of [/entertainment/i, /\bAI\b/, /artificial intelligence/i, /informational/i]) {
      expect(flat).not.toMatch(banned);
    }
  });

  it("line three is the plain ownership sentence, old clutter stays gone", () => {
    expect(footer).toContain("Open Mirror LLC is a small independent company.");
    for (const banned of [
      "©",
      "About Open Mirror",
      ">CrossHeartPray</a>",
      'target="_blank"',
    ]) {
      expect(footer).not.toContain(banned);
    }
  });
});
