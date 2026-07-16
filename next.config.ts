import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/gene-getz",
        destination: "/life-essentials",
        permanent: true,
      },
      // The original standalone Cross / Heart / Pray scaffold pages are no
      // longer part of the public site. Redirect any old inbound links home
      // rather than leave them discoverable as active products.
      { source: "/cross", destination: "/", permanent: true },
      { source: "/heart", destination: "/", permanent: true },
      { source: "/pray", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
