/**
 * Utilidades para manejo de multi-tenant (Client-side)
 * Para Server Components, usar utils/tenant-server.ts
 */

/**
 * Detecta el tenant actual basado en el subdominio de la URL (CLIENT-SIDE)
 * 
 * Ejemplos:
 * - yanett.localhost:3000 -> "yanett"
 * - empresa2.localhost:3000 -> "empresa2"
 * - localhost:3000 -> "public"
 * - yanett.midominio.com -> "yanett"
 */
export function getTenant(): string {
  // Solo funciona en el cliente
  if (typeof window === 'undefined') return 'public';

  const hostname = window.location.hostname;
  const parts = hostname.split('.');

  // localhost sin subdominio -> tenant público
  if (parts.length === 1 || hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'public';
  }

  // Si el primer segmento es 'www', tratarlo como público
  if (parts[0] === 'www') {
    return 'public';
  }

  // Retornar el subdominio
  return parts[0];
}

/**
 * Verifica si el tenant actual es el público (sin subdominio)
 */
export function isPublicTenant(): boolean {
  return getTenant() === 'public';
}

/**
 * @deprecated Usar getTenant() en su lugar
 */
export function getTenantFromHostname(hostname?: string): string {
  if (hostname) {
    const parts = hostname.split('.');
    if (parts.length === 1 || hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'public';
    }
    return parts[0];
  }
  return getTenant();
}

/**
 * Obtiene la URL base del API según el tenant
 * 
 * En desarrollo usa rutas relativas para aprovechar el proxy de Next.js
 * y compartir cookies entre frontend y backend
 */
export function getApiUrl(hostname?: string): string {
  // En desarrollo (localhost), usamos rutas relativas para proxy si se desea,
  // PERO para la migración a Cloudflare (y testing local similar),
  // es mejor apuntar directo al backend si estamos en la rama de feature.

  // Para esta migración, forzamos el uso del Backend Centralizado
  // Esto permitirá probar la "SPA Pura" incluso en local
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.ledgerxpertz.com/api';

  // Eliminamos lógica de reemplazo de {tenant} en URL porque el backend
  // centralizado usa Headers (X-Tenant) para diferenciar, no subdominios en la API.
  return API_URL;
}

/**
 * Hook para obtener el tenant actual en componentes React
 */
export function useTenant(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_DEFAULT_TENANT || 'public';
  }
  return getTenantFromHostname();
}
