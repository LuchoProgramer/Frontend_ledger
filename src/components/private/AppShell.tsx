'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardAdmin from '@/components/DashboardAdmin'
import DashboardVendedor from '@/components/DashboardVendedor'
import { getTenant } from '@/lib/tenant'

/**
 * AppShell - Componente para tenants privados
 * 
 * Este componente solo se renderiza cuando AuthProvider está montado
 * (es decir, en tenants privados como yanett.localhost:3000)
 * 
 * Responsabilidades:
 * - Verificar autenticación del usuario
 * - Redirigir a login si no hay sesión
 * - Renderizar el dashboard correspondiente según el rol
 */
export default function AppShell() {
  const { user, loading, isAdmin, isVendedor } = useAuth()
  const router = useRouter()
  const tenant = getTenant()

  useEffect(() => {
    // Si terminó de cargar y no hay usuario, redirigir a login
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  // Mostrar loading mientras verifica sesión
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  // Esperando redirección a login
  if (!user) {
    return null
  }

  // Renderizar dashboard según rol
  if (isAdmin) {
    return <DashboardAdmin tenant={tenant} />
  }

  if (isVendedor) {
    return <DashboardVendedor tenant={tenant} />
  }

  // Fallback: usuario sin rol específico
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Acceso no autorizado</h1>
        <p className="text-gray-600 mb-4">Tu usuario no tiene un rol asignado.</p>
        <button
          onClick={() => router.push('/login')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  )
}
