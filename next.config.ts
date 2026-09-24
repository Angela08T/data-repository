import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  async rewrites() {
    return {
      // beforeFiles: se evalúa antes de que Next.js compare la ruta contra
      // las páginas ya existentes — necesario porque "/" ya es una página
      // real (el login), así que una reescritura normal nunca se aplicaría.
      beforeFiles: [
        {
          source: "/",
          has: [{ type: "host", value: "aprendeavotar.jesusmaldonadooficial.com" }],
          destination: "/aprende-a-votar",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
