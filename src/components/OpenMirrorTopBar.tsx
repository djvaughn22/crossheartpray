// Family-standard Open Mirror bar — visually matches the satellite sites'
// wordmark header (see hub packages/openmirror-ui/OpenMirrorNav.tsx) so every
// Open Mirror site opens the same way. Mounted once in layout.tsx; CHP's own
// SiteHeader (✝️ ❤️ 🙏 + menu) stays below it on every page.

import VisualThemeIconButton from "./VisualThemeIconButton";

export default function OpenMirrorTopBar() {
  return (
    <header
      className="print:hidden"
      style={{ position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid #26324c", background: "#0b1220" }}
    >
      <div style={{ maxWidth: 1152, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px" }}>
        <a href="https://openmirrorllc.com" style={{ display: "inline-flex", alignItems: "baseline", gap: 8, fontSize: 16, fontWeight: 900, letterSpacing: "-0.01em", color: "#e8edf5", textDecoration: "none" }}>
          <span>Open Mirror LLC</span>
        </a>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2em", color: "#94a3b8" }}>
            CrossHeartPray.com
          </span>
          <VisualThemeIconButton />
        </span>
      </div>
    </header>
  );
}
