import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  async redirects() {
    return [
      { source: "/newsflash", destination: "/board", permanent: false },
      { source: "/newsflash/:path*", destination: "/board", permanent: false },
      { source: "/portal/newsflash", destination: "/board", permanent: false },
      { source: "/brothers", destination: "/feed?section=brothers", permanent: false },
      { source: "/sgarlata", destination: "/messages/sgarlata", permanent: false },
    ];
  },
};

export default nextConfig;
