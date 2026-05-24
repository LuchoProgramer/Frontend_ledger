import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware para detectar el tenant desde el subdominio
 * Ejemplo: yanett.localhost:3000 → tenant = yanett
 */
export default function middleware(request: NextRequest) {
  // IMPORTANTE: Nunca interceptar rutas /api/* - dejar que los rewrites las manejen
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith('/api/')) {
    console.log('[Proxy] 🚫 Saltando ruta API:', pathname);
    return NextResponse.next();
  }

  console.log('[Proxy] ✅ Procesando ruta:', pathname);

  // Obtener el host (ejemplo: yanett.localhost:3000)
  const host = request.headers.get('host') || '';

  // Extraer el subdominio
  const parts = host.split('.');
  let tenant = 'public';

  // Si hay subdominio (más de 1 parte antes del .localhost o dominio principal)
  if (parts.length > 1) {
    // Para desarrollo: yanett.localhost:3000
    // Para producción: yanett.ledgerxpertz.com
    tenant = parts[0];
  }

  // Agregar el tenant a los headers del REQUEST forwarded — así los Server
  // Components pueden leerlo vía `headers().get('x-tenant')`.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant', tenant);
  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // También lo guardamos en una cookie para acceso fácil desde el cliente
  if (!request.cookies.get('tenant')?.value) {
    response.cookies.set('tenant', tenant, {
      httpOnly: false, // Accesible desde JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }

  return response;
}

// Configurar en qué rutas se ejecuta el proxy
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
