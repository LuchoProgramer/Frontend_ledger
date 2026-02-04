import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true, // Optimización desactivada temporalmente para Cloudflare
  },
  // Rewrites eliminados para migración a SPA pura en Cloudflare
  // El frontend hablará directo con https://api.ledgerxpertz.com/api
};

export default nextConfig;
