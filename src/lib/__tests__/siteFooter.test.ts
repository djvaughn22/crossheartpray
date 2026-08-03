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
