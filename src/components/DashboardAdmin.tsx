'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getApiClient } from '@/lib/api'

interface DashboardAdminProps {
  tenant: string
}

export default function DashboardAdmin({ tenant }: DashboardAdminProps) {
  const router = useRouter()
  const { user, logout, loading: authLoading } = useAuth()
  const [verificandoSucursales, setVerificandoSucursales] = useState(true)
  const [branchCount, setBranchCount] = useState<string>('-')

  // Verificar si hay sucursales al cargar
  useEffect(() => {
    // No verificar sucursales si aún se está cargando la autenticación
    if (authLoading) {
      return
    }

    // Si no hay usuario autenticado, no intentar verificar sucursales
    if (!user) {
      setVerificandoSucursales(false)
      return
    }

    const verificarSucursales = async () => {
      try {
        const api = getApiClient()
        const response = await api.getSucursalesList({ page_size: 1 })

        const isSuccess = response.success || (response.results && Array.isArray(response.results))

        // Si no hay sucursales, redirigir a onboarding
        if (isSuccess && (response.count ?? 0) === 0) {
          router.push('/onboarding')
        } else {
          if (isSuccess && response.count !== undefined) {
            setBranchCount(response.count.toString())
          }
          setVerificandoSucursales(false)
        }
      } catch (error: any) {
        console.error('Error verificando sucursales:', error?.message || 'Error desconocido')
        // Continuar mostrando el dashboard aunque falle la verificación
        setVerificandoSucursales(false)
      }
    }

    verificarSucursales()
  }, [router, authLoading, user])

  const menuItems = [
    {
      title: 'Productos',
      icon: '📦',
      items: [
        { name: 'Listar Productos', href: '/productos', icon: '📋' },
        { name: 'Agregar Producto', href: '/productos/nuevo', icon: '➕' },
        { name: 'Categorías', href: '/categorias', icon: '🏷️' },
      ]
    },
    {
      title: 'Ventas',
      icon: '💰',
      items: [
        { name: 'Punto de Venta (POS)', href: '/pos', icon: '🛒' },
        { name: 'Historial de Ventas', href: '/ventas', icon: '📊' },
        { name: 'Reportes de Ventas', href: '/reportes/ventas', icon: '📈' },
      ]
    },
    {
      title: 'Compras',
      icon: '🚚',
      items: [
        { name: 'Registrar Compra', href: '/compras/nueva', icon: '➕' },
        { name: 'Historial de Compras', href: '/compras', icon: '📋' },
        { name: 'Proveedores', href: '/proveedores', icon: '👥' },
      ]
    },
    {
      title: 'Inventario',
      icon: '📊',
      items: [
        { name: 'Estado de Inventario', href: '/inventario', icon: '📦' },
        { name: 'Ajustes de Inventario', href: '/inventario/ajustes', icon: '⚙️' },
        { name: 'Transferencias', href: '/inventario/transferencias', icon: '🔄' },
      ]
    },
    {
      title: 'Facturación Electrónica SRI',
      icon: '📄',
      items: [
        { name: 'Dashboard Facturas', href: '/facturacion', icon: '🧾' },
        { name: 'Notas de Crédito', href: '/facturacion/notas-credito', icon: '📝' },
        { name: 'Notas de Débito', href: '/facturacion/notas-debito', icon: '📝' },
        { name: 'Retenciones', href: '/facturacion/retenciones', icon: '💵' },
        { name: 'Gestionar Impuestos', href: '/impuestos', icon: '📊' },
      ]
    },
    {
      title: 'Configuración',
      icon: '⚙️',
      items: [
        { name: 'Usuarios', href: '/usuarios', icon: '👤' },
        { name: 'Sucursales', href: '/sucursales', icon: '🏢' },
        { name: 'Certificados Digitales', href: '/certificados', icon: '🔐' },
        { name: 'Configuración General', href: '/configuracion', icon: '⚙️' },
      ]
    },
  ]

  const estadisticas = [
    { label: 'Usuarios', value: '-', icon: '👥', color: 'bg-blue-500' },
    { label: 'Productos', value: '-', icon: '📦', color: 'bg-green-500' },
    { label: 'Ventas Hoy', value: '-', icon: '💰', color: 'bg-yellow-500' },
    { label: 'Sucursales', value: branchCount, icon: '🏢', color: 'bg-purple-500' },
  ]

  if (verificandoSucursales) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">LX</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard Administrador</h1>
                <p className="text-sm text-gray-500">{tenant}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.first_name || user?.username}</p>
                <p className="text-xs text-gray-500">Administrador</p>
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {estadisticas.map((stat) => (
            <div key={stat.label} className="bg-white rounded-lg shadow-sm p-6 border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center text-2xl`}>
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Menú de opciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((section) => (
            <div key={section.title} className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-3">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <span className="mr-2">{section.icon}</span>
                  {section.title}
                </h2>
              </div>
              <div className="p-4">
                <ul className="space-y-2">
                  {section.items.map((item) => (
                    <li key={item.name}>
                      <button
                        onClick={() => router.push(item.href)}
                        className="w-full text-left px-4 py-3 rounded-lg hover:bg-indigo-50 transition-colors flex items-center space-x-3 text-gray-700 hover:text-indigo-600"
                      >
                        <span className="text-xl">{item.icon}</span>
                        <span className="font-medium">{item.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
