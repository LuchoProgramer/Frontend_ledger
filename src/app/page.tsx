import { isPublicTenantServer } from '@/utils/tenant-server'
import LandingPage from '@/components/LandingPage'
import AppShell from '@/components/private/AppShell'

/**
 * Página principal - Router de alto nivel
 * 
 * Este es un Server Component que decide qué renderizar basándose
 * en el tenant detectado desde el servidor (headers HTTP).
 * 
 * Flujo:
 * 1. Tenant Público (localhost:3000) -> Renderiza LandingPage
 *    - NO hay AuthContext
 *    - NO hay verificación de sesión
 *    - NO hay redirecciones
 * 
 * 2. Tenant Privado (yanett.localhost:3000) -> Renderiza AppShell
 *    - SÍ hay AuthContext (montado en layout)
 *    - SÍ verifica sesión
 *    - SÍ redirige a login si no autenticado
 */
export default async function Page() {
  // Detectar tenant en el servidor
  const isPublic = await isPublicTenantServer()

  if (isPublic) {
    // Tenant Público: Renderizar Landing Page directamente
    // Sin autenticación, sin verificaciones, sin redirects
    return <LandingPage />
  }

  // Tenant Privado: Renderizar App Shell
  // Este componente usa useAuth() que está disponible porque
  // AuthProvider fue montado condicionalmente en el layout
  return <AppShell />
}
