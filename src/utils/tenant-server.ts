/**
 * Utilidades de detección de tenant para Server Components
 * Estas funciones se ejecutan en el servidor (Next.js)
 */

import { headers } from 'next/headers';

/**
 * Obtiene el tenant actual desde los headers HTTP en el servidor
 * 
 * Ejemplos:
 * - yanett.localhost:3000 -> "yanett"
 * - localhost:3000 -> "public"
 * - empresa2.midominio.com -> "empresa2"
 */
export async function getTenantFromServer(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost';
  
  // Extraer el hostname sin el puerto
  const hostname = host.split(':')[0];
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
export async function isPublicTenantServer(): Promise<boolean> {
  const tenant = await getTenantFromServer();
  return tenant === 'public';
}
