import type { MetadataRoute } from "next";

// Installable-app manifest — same app-readiness layer as thedjcares.com,
// stepinthering.com, and idontcry.com.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CrossHeartPray",
    short_name: "CrossHeartPray",
    description:
      "Daily Hope, a Bible reading plan, Gene Getz's Life Essentials, and Bible Bingo 7 — your daily faith routine.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b1220",
    theme_color: "#0b1220",
    icons: [
      { src: "/icons/chp-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/chp-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/chp-192-maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/chp-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
