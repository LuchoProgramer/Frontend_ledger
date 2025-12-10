import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";

    return [
      {
        // Caso 1: La URL ya tiene slash (ej: /api/empresas/estadisticas/)
        source: "/api/:path*/",
        destination: `${backendUrl}/api/:path*/`,
      },
      {
        // Caso 2: La URL NO tiene slash (ej: /api/empresas/estadisticas)
        // Solución: Lo enviamos al destino CON slash explícito
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*/`,
      },
      {
        source: "/wizard/:path*",
        destination: `${backendUrl}/wizard/:path*`,
      },
      {
        source: "/core/:path*",
        destination: `${backendUrl}/core/:path*`,
      },
    ];
  },
};

export default nextConfig;
