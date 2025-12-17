'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getApiClient } from '@/lib/api'
import {
  Package,
  TrendingUp,
  Users,
  Store,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Box,
  CreditCard,
  FileText,
  Settings,
  ShoppingCart,
  Truck,
  Activity
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

interface DashboardAdminProps {
  tenant: string
}

export default function DashboardAdmin({ tenant }: DashboardAdminProps) {
  const router = useRouter()
  const { user, logout, loading: authLoading } = useAuth()
  const [verificandoSucursales, setVerificandoSucursales] = useState(true)
  const [branchCount, setBranchCount] = useState<string>('-')

  const [salesData, setSalesData] = useState<any[]>([])
  const [kpiData, setKpiData] = useState({
    total_ventas: 0,
    transacciones: 0,
    ticket_promedio: 0
  })

  // Cargar datos reales
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setVerificandoSucursales(false)
      return
    }

    const cargarDatos = async () => {
      try {
        const api = getApiClient()

        // 1. Verificar Sucursales
        const sucursalRes = await api.getSucursalesList({ page_size: 1 })
        const isSuccess = sucursalRes.success || (sucursalRes.results && Array.isArray(sucursalRes.results))

        if (isSuccess && (sucursalRes.count ?? 0) === 0) {
          router.push('/onboarding')
          return
        }

        if (isSuccess && sucursalRes.count !== undefined) {
          setBranchCount(sucursalRes.count.toString())
        }

        // 2. Cargar Gráfica de Ventas (Diario)
        // Nota: Asegurarse de que el backend soporte 'diario'
        try {
          const chartRes = await api.getVentasChart({ periodo: 'diario' })
          if (Array.isArray(chartRes)) {
            // Mapear respuesta del backend al formato de Recharts
            // Backend retorna: { name: 'DD/MM', venta: 123.45 }
            setSalesData(chartRes.map(item => ({
              name: item.name,
              ventas: item.venta
            })))
          }
        } catch (e) {
          console.error('Error cargando grafica ventas', e)
        }

        // 3. Cargar KPIs Generales
        try {
          const kpiRes = await api.getResumenGeneral()
          if (kpiRes) {
            setKpiData({
              total_ventas: kpiRes.total_ventas || 0,
              transacciones: kpiRes.transacciones || 0,
              ticket_promedio: kpiRes.ticket_promedio || 0
            })
          }
        } catch (e) {
          console.error('Error cargando KPIs', e)
        }

        setVerificandoSucursales(false)

      } catch (error: any) {
        console.error('Error general cargando dashboard:', error?.message || 'Error desconocido')
        setVerificandoSucursales(false)
      }
    }

    cargarDatos()
  }, [router, authLoading, user])

  const menuItems = [
    {
      title: 'Productos',
      icon: <Box className="w-5 h-5" />,
      description: 'Gestión de catálogo',
      href: '/productos',
      color: 'bg-blue-50 text-blue-600',
      items: [
        { name: 'Nuevo Producto', href: '/productos/nuevo' },
        { name: 'Categorías', href: '/categorias' },
      ]
    },
    {
      title: 'Ventas',
      icon: <TrendingUp className="w-5 h-5" />,
      description: 'POS y Reportes',
      href: '/ventas',
      color: 'bg-green-50 text-green-600',
      items: [
        { name: 'Ir al POS', href: '/pos' },
        { name: 'Historial', href: '/ventas' },
      ]
    },
    {
      title: 'Compras',
      icon: <Truck className="w-5 h-5" />,
      description: 'Proveedores y Stock',
      href: '/compras',
      color: 'bg-orange-50 text-orange-600',
      items: [
        { name: 'Nueva Compra', href: '/compras/nueva' },
        { name: 'Proveedores', href: '/proveedores' },
      ]
    },
    {
      title: 'Facturación SRI',
      icon: <FileText className="w-5 h-5" />,
      description: 'Emisión y Control',
      href: '/facturacion',
      color: 'bg-indigo-50 text-indigo-600',
      items: [
        { name: 'Dashboard SRI', href: '/facturacion' },
        { name: 'Retenciones', href: '/facturacion/retenciones' },
      ]
    },
    {
      title: 'Inventario',
      icon: <Package className="w-5 h-5" />,
      description: 'Ajustes y Kárdex',
      href: '/inventario',
      color: 'bg-purple-50 text-purple-600',
      items: [
        { name: 'Ver Stock', href: '/inventario' },
        { name: 'Auditoría', href: '/inventario/auditoria' },
      ]
    },
    {
      title: 'Configuración',
      icon: <Settings className="w-5 h-5" />,
      description: 'Sistema y Usuarios',
      href: '/configuracion',
      color: 'bg-slate-50 text-slate-600',
      items: [
        { name: 'Usuarios', href: '/usuarios' },
        { name: 'Sucursales', href: '/sucursales' },
      ]
    }
  ]

  const estadisticas = [
    {
      label: 'Ventas Totales',
      value: kpiData.total_ventas ? `$${kpiData.total_ventas.toFixed(2)}` : '$0.00',
      change: '', // TODO: Calcular % cambio vs mes anterior
      trend: 'up',
      icon: <DollarSign className="w-6 h-6 text-emerald-600" />,
      bg: 'bg-emerald-100'
    },
    {
      label: 'Transacciones',
      value: kpiData.transacciones.toString(),
      change: '',
      trend: 'up',
      icon: <ShoppingCart className="w-6 h-6 text-blue-600" />,
      bg: 'bg-blue-100'
    },
    {
      label: 'Ticket Promedio',
      value: kpiData.ticket_promedio ? `$${kpiData.ticket_promedio.toFixed(2)}` : '$0.00',
      change: '',
      trend: 'neutral',
      icon: <CreditCard className="w-6 h-6 text-amber-600" />,
      bg: 'bg-amber-100'
    },
    {
      label: 'Sucursales',
      value: branchCount,
      change: '',
      trend: 'neutral',
      icon: <Store className="w-6 h-6 text-purple-600" />,
      bg: 'bg-purple-100'
    },
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
    <div className="space-y-8">

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {estadisticas.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${stat.bg}`}>
                {stat.icon}
              </div>
              {stat.trend === 'up' && <span className="flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full"><ArrowUpRight className="w-3 h-3 mr-1" />{stat.change}</span>}
              {stat.trend === 'down' && <span className="flex items-center text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-1 rounded-full"><ArrowDownRight className="w-3 h-3 mr-1" />{stat.change}</span>}
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Sección Principal con Gráfica y Accesos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Columna Izquierda: Gráfica de Ventas */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Resumen de Ventas</h2>
              <p className="text-sm text-gray-500">Comportamiento de los últimos 7 días</p>
            </div>
            <button className="text-sm text-indigo-600 font-medium hover:text-indigo-700">Ver reporte completo</button>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ stroke: '#6366f1', strokeWidth: 2 }}
                />
                <Area type="monotone" dataKey="ventas" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorVentas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Columna Derecha: Accesos Rápidos Verticales */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Accesos Directos</h2>
            <div className="grid grid-cols-1 gap-4">
              {menuItems.map((item, idx) => (
                <div key={idx} className="border-b border-gray-50 last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-1.5 rounded-md ${item.color} bg-opacity-20`}>
                      {item.icon}
                    </div>
                    <h3 className="font-semibold text-gray-700 text-sm">{item.title}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pl-2">
                    {item.items.map((subItem, subIdx) => (
                      <button
                        key={subIdx}
                        onClick={() => router.push(subItem.href)}
                        className="text-left text-xs text-gray-500 hover:text-indigo-600 hover:bg-gray-50 px-2 py-1 rounded transition-colors flex items-center gap-1 group"
                      >
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px]">▶</span>
                        {subItem.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
}
