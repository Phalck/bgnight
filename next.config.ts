import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/game-nights',
        destination: '/community-bgn',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
