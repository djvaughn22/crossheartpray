import type { NextConfig } from "next";
import {
  FALLBACK_BIBLE_TRANSLATION,
  parseConfiguredTranslation,
} from "./src/lib/scripture/translationConfig";

const nextConfig: NextConfig = {
  env: {
    // Site-wide Bible translation, normalized against the supported registry
    // (invalid/missing values fall back to BSB) and inlined into both server
    // and client bundles so every surface agrees. Changing it requires a
    // redeploy — which is also what lets the bundler drop the inactive
    // dataset from src/lib/localBibleVerses.ts.
    BIBLE_TRANSLATION:
      parseConfiguredTranslation(process.env.BIBLE_TRANSLATION) ??
      FALLBACK_BIBLE_TRANSLATION,
  },
  async redirects() {
    return [
      {
        source: "/gene-getz",
        destination: "/life-essentials",
        permanent: true,
      },
      // The original standalone Cross / Heart scaffold pages are no longer
      // part of the public site. Redirect any old inbound links home rather
      // than leave them discoverable as active products. /pray is removed
      // outright (404) by owner decision — not redirected.
      { source: "/cross", destination: "/", permanent: true },
      { source: "/heart", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
