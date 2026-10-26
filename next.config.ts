import type { NextConfig } from "next";

const longCache = [
  {
    key: "Cache-Control",
    value: "public, max-age=86400, stale-while-revalidate=604800",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/key-visual.mp4", headers: longCache },
      { source: "/emblem.svg", headers: longCache },
      { source: "/wall-ribbons.svg", headers: longCache },
      { source: "/decor-lantern.svg", headers: longCache },
      { source: "/decor-flower.svg", headers: longCache },
      { source: "/wish-ornament.svg", headers: longCache },
    ];
  },
};

export default nextConfig;
