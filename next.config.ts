import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  async rewrites() {
    return [
      {
        source: "/",
        has: [{ type: "host", value: "aprendeavotar.jesusmaldonadooficial.com" }],
        destination: "/aprende-a-votar",
      },
    ];
  },
};

export default nextConfig;
