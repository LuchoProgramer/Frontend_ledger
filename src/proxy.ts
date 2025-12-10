import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Proxy middleware para detectar el tenant desde el subdominio
 * Ejemplo: yanett.localhost:3000 → tenant = yanett
 * 
 * Migrado de middleware.ts a proxy.ts para Next.js 16+
 */
export default function proxy(request: NextRequest) {
  // IMPORTANTE: Nunca interceptar rutas /api/* - dejar que los rewrites las manejen
  const pathname = request.nextUrl.pathname;
  
  if (pathname.startsWith('/api/')) {
    console.log('[Proxy] 🚫 Saltando ruta API:', pathname);
    return NextResponse.next();
  }

  console.log('[Proxy] ✅ Procesando ruta:', pathname);

  const response = NextResponse.next();

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

  // Agregar el tenant a los headers para que esté disponible en las páginas
  response.headers.set('x-tenant', tenant);

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
