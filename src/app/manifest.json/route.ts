import { NextResponse } from 'next/server';
import { getTenantFromServer } from '@/utils/tenant-server';

// Force dynamic so each request reads the host header —
// prevents Cloudflare from caching one tenant's manifest for another.
export const dynamic = 'force-dynamic';

export async function GET() {
  const tenant = await getTenantFromServer();
  const isPublic = tenant === 'public';

  // Capitalize first letter for display: "yanett" → "Yanett"
  const tenantLabel = isPublic
    ? 'LedgerXpertz'
    : tenant.charAt(0).toUpperCase() + tenant.slice(1);

  const manifest = {
    name: isPublic ? 'LedgerXpertz' : `LedgerXpertz - ${tenantLabel}`,
    short_name: tenantLabel,
    description: 'Sistema de facturación electrónica y ERP multi-tenant',
    start_url: '/',
    display: 'standalone',
    background_color: '#4F46E5',
    theme_color: '#4F46E5',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      // Never cache — each tenant gets its own manifest at runtime.
      'Cache-Control': 'no-store',
    },
  });
}
