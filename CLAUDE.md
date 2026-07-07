@AGENTS.md

# CrossHeartPray (crossheartpray.com)

Faith app — the heart of the Open Mirror LLC family. ✝️ Cross · ❤️ Heart ·
🙏 Pray. Christian, and stays that way. Baseline tag: `mvp-1`.

## Deploys — IMPORTANT
Pushing to `main` does NOT deploy this site. After pushing, run
`npx vercel --prod` from the repo root (project is CLI-linked via `.vercel`).

## Card system (DJ's rules — apply to any card work)
- Card face = share-image anatomy ONLY: ✝️❤️🙏, one eyebrow line, reference,
  verse. "Dynamic on cards, static on function."
- Instructions live ONCE in the "?" legend (`CardInfoLegend.tsx`), never on
  card faces.
- Extra data goes behind separate labeled expander buttons side by side
  ("More Life Essentials", "Books in this Lane") — `CardMore.tsx`.
- Share menu image options are social-generic ("Square image", "Portrait
  image") — never platform-branded.
- Verse words are tappable (original-language study). Never put `bg-*`
  classes on inline word buttons — the theme flattener turns them into boxes.

## Theming
- Own light/dark system: `data-chp-visual-theme` + `VisualThemePicker` /
  `VisualThemeIconButton` (☀️ in the top bar). The family `om-theme` is NOT
  used here.
- `CHP_LIVELY_DARK_THEME` block in `globals.css` restyles via class-substring
  selectors — prefer the family tokens, test both themes.

## Protected
- MVP flows, Daily Hope prayers, Bible Bingo lanes, and DJ's copy (including
  "RIP Travis - VTL" and the Gene Getz / Charlie Duke story on /about).
- Credits stay: Michael Coley (52-week plan) and Dr. Gene Getz Life Essentials
  (official links, Bible-first tone: open Scripture first).
- Site flow (FlowStepButtons): Home → Bible Reading → Daily Hope →
  Bible Bingo 7 → Life Essentials → About, wrapping back to Home.
- Footer: Love God line → OPEN MIRROR LLC · ABOUT → VTLT · ✝️ ❤️ 🙏 → © year.

## Family rules
Flat cool palette, no glass, no red, no wordy AI copy. The Open Mirror top
bar (`OpenMirrorTopBar.tsx`) matches the family; canonical shared components
live in the hub repo `open-mirror/packages/openmirror-ui/`.
