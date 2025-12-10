'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * Componente que protege rutas privadas.
 * Redirige a /login si el usuario no está autenticado.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Esperar a que termine de cargar la sesión
    if (loading) return

    // Si no está autenticado y no está en una ruta pública, redirigir a login
    const publicRoutes = ['/login', '/registro', '/registro/exitoso']
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

    if (!isAuthenticated && !isPublicRoute) {
      router.push('/login')
    }
  }, [isAuthenticated, loading, pathname, router])

  // Mostrar loading mientras verifica la sesión
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  // Si está autenticado o es ruta pública, mostrar el contenido
  return <>{children}</>
}
