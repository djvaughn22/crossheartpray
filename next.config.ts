import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/gene-getz",
        destination: "/life-essentials",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
