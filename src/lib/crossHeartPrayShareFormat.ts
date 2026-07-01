export type ChpShareLink = {
  label: string;
  url: string;
};

export function chpPlainTextWithLinks(title: string, lines: string[], links: ChpShareLink[] = []) {
  const cleanLines = lines.filter(Boolean);
  const linkLines = links.map((link) => `${link.label}: ${link.url}`);
  return [title, ...cleanLines, ...linkLines].filter(Boolean).join("\n");
}

export function chpHtmlWithLinks(title: string, lines: string[], links: ChpShareLink[] = []) {
  const esc = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  const body = lines.filter(Boolean).map((line) => `<p>${esc(line)}</p>`).join("");
  const linkBody = links
    .map((link) => `<p><a href="${esc(link.url)}">${esc(link.label)}</a></p>`)
    .join("");

  return `<article><h2>${esc(title)}</h2>${body}${linkBody}</article>`;
}
