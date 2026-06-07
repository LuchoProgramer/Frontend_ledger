import withSerwist from '@serwist/next';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: { ignoreDuringBuilds: true },
  webpack(config) {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    return config;
  },
};

export default withSerwist({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  exclude: [() => true], // Exclude all Next.js build chunks from precache to avoid CPU Limit loops
  additionalPrecacheEntries: [
    { url: '/calculos_sri_wasm_bg.wasm', revision: null },
    { url: '/icon-192.png',              revision: null },
    { url: '/icon-512.png',              revision: null },
    { url: '/apple-touch-icon.png',      revision: null },
    { url: '/favicon.ico',              revision: null },
  ],
  disable: process.env.NODE_ENV === 'development',
})(nextConfig);
