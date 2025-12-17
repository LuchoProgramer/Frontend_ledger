'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { getApiClient } from '@/lib/api'

interface DashboardVendedorProps {
  tenant: string
}

interface TurnoInfo {
  id: number
  hora_inicio: string
  sucursal: string | null
}

interface Sucursal {
  id: number
  nombre: string
}

export default function DashboardVendedor({ tenant }: DashboardVendedorProps) {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [turnoActivo, setTurnoActivo] = useState<TurnoInfo | null>(null)
  const [loadingTurno, setLoadingTurno] = useState(true)

  // Estado para gestión de turnos
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [showModal, setShowModal] = useState(false)
  const [selectedSucursal, setSelectedSucursal] = useState<string>('')
  const [processing, setProcessing] = useState(false)

  const api = getApiClient()

  const cargarDatos = async () => {
    setLoadingTurno(true)
    try {
      // 1. Cargar Turno Activo
      const response = await api.getTurnoActivo()

      // La API puede retornar 'activo', 'tiene_turno_activo', etc. dependiendo de la versión.
      // Estandarizamos revisando ambas propiedades.
      const isActivo = (response as any).activo || (response as any).tiene_turno_activo;

      if (response.success && isActivo) {
        const turnoData = (response as any).data || (response as any).turno
        if (turnoData) {
          setTurnoActivo({
            id: turnoData.id,
            hora_inicio: turnoData.inicio_turno || turnoData.hora_inicio,
            sucursal: turnoData.sucursal_nombre || turnoData.sucursal
          })
        }
      } else {
        setTurnoActivo(null)
      }

      // 2. Cargar Sucursales (para abrir turno si es necesario)
      const sucsRes = await api.getSucursalesList({ page_size: 100 })
      if (sucsRes && sucsRes.results) {
        setSucursales(sucsRes.results)
        // Pre-seleccionar la primera si hay
        if (sucsRes.results.length > 0) {
          setSelectedSucursal(sucsRes.results[0].id.toString())
        }
      }

    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoadingTurno(false)
    }
  }

  useEffect(() => {
    cargarDatos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleIniciarTurno = () => {
    // Si solo hay una sucursal, podemos pre-seleccionar o incluso auto-abrir si UX lo requiere.
    // Por seguridad, mostramos modal.
    setShowModal(true)
  }

  const confirmarInicioTurno = async () => {
    if (!selectedSucursal) return
    setProcessing(true)
    try {
      const res = await api.abrirTurno(parseInt(selectedSucursal))
      if (res) { // Asumiendo que el cliente lanza error si falla, o devuelve obj
        setShowModal(false)
        await cargarDatos() // Recargar todo
      }
    } catch (error) {
      console.error('Error abriendo turno', error)
      alert('Error al abrir el turno. Inténtelo de nuevo.')
    } finally {
      setProcessing(false)
    }
  }

  const handleFinalizarTurno = async () => {
    if (!confirm('¿Está seguro que desea cerrar su turno? Se realizará el cierre de caja.')) return

    setProcessing(true)
    try {
      // En un flujo real, aquí pediríamos el arqueo de caja (efectivo contado)
      // Por ahora cerramos simple.
      await api.cerrarTurno({
        efectivo_total: 0, // TODO: Pedir en modal aparte
        tarjeta_total: 0,
        transferencia_total: 0,
        salidas_caja: 0
      })
      await cargarDatos()
    } catch (error) {
      console.error('Error cerrando turno', error)
      alert('Error al cerrar el turno.')
    } finally {
      setProcessing(false)
    }
  }

  const handleItemClick = (item: any) => {
    if (item.requiresTurno && !turnoActivo) {
      alert('Necesitas iniciar un turno primero')
      return
    }

    if (item.action === 'finalizarTurno') {
      handleFinalizarTurno()
      return
    }

    if (item.action === 'verTurno') {
      // TODO: Mostrar detalles/reporte del turno
      return
    }

    router.push(item.href)
  }

  const formatearHora = (fecha: string) => {
    if (!fecha) return ''
    return new Date(fecha).toLocaleTimeString('es-EC', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const menuItems = [
    {
      title: 'Ventas',
      icon: '🛒',
      items: [
        { name: 'Punto de Venta (POS)', href: '/pos', icon: '💰', requiresTurno: true },
        { name: 'Consultar Productos', href: '/productos', icon: '📦', requiresTurno: false },
        { name: 'Mi Historial de Ventas', href: '/mis-ventas', icon: '📊', requiresTurno: false },
      ]
    },
    {
      title: 'Mi Turno',
      icon: '🕒',
      items: [
        { name: 'Ver Detalles del Turno', href: '#', icon: '📋', requiresTurno: true, action: 'verTurno' },
        { name: 'Finalizar Turno', href: '#', icon: '🔚', requiresTurno: true, action: 'finalizarTurno' },
      ]
    },
  ]

  return (
    <div className="space-y-8">

      {/* Modal Iniciar Turno */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Apertura de Caja</h3>
            <p className="text-gray-600 mb-6">Seleccione la sucursal donde iniciará su turno de trabajo.</p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Sucursal</label>
              <select
                className="w-full border rounded-lg p-3 text-gray-700 focus:ring-2 focus:ring-green-500 outline-none"
                value={selectedSucursal}
                onChange={(e) => setSelectedSucursal(e.target.value)}
              >
                {sucursales.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg"
                disabled={processing}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarInicioTurno}
                disabled={processing || !selectedSucursal}
                className={`px-6 py-2 bg-green-600 text-white font-bold rounded-lg ${processing ? 'opacity-70' : 'hover:bg-green-700'}`}
              >
                {processing ? 'Abriendo...' : 'Abrir Caja'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estado del turno */}
      <div className="mb-8">
        {loadingTurno ? (
          <div className="bg-white rounded-lg shadow-sm p-6 border animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ) : turnoActivo ? (
          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg shadow-sm p-6 border border-green-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-green-900 mb-2 flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                  Turno Activo
                </h2>
                <div className="space-y-1">
                  <p className="text-sm text-green-700">
                    <span className="font-semibold">Hora de inicio:</span> {formatearHora(turnoActivo.hora_inicio)}
                  </p>
                  {turnoActivo.sucursal && (
                    <p className="text-sm text-green-700">
                      <span className="font-semibold">Sucursal:</span> {turnoActivo.sucursal}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleFinalizarTurno}
                disabled={processing}
                className="px-6 py-3 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-semibold rounded-lg transition-colors shadow-sm"
              >
                {processing ? 'Cerrando...' : 'Finalizar Turno'}
              </button>
            </div>
            {/* Estadísticas del turno */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-green-200/60">
              <div className="text-center p-3 bg-white/50 rounded-lg">
                <p className="text-2xl font-bold text-green-900">0</p>
                <p className="text-xs font-medium uppercase text-green-700 tracking-wider">Ventas</p>
              </div>
              <div className="text-center p-3 bg-white/50 rounded-lg">
                <p className="text-2xl font-bold text-green-900">$0.00</p>
                <p className="text-xs font-medium uppercase text-green-700 tracking-wider">Total</p>
              </div>
              <div className="text-center p-3 bg-white/50 rounded-lg hidden md:block">
                <p className="text-2xl font-bold text-green-900">En curso</p>
                <p className="text-xs font-medium uppercase text-green-700 tracking-wider">Estado</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
              <span className="text-3xl">👋</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Hola, {user?.first_name}!</h2>
            <p className="text-gray-500 max-w-md mx-auto mb-8">
              Para comenzar a procesar ventas necesitas abrir tu caja. Selecciona tu sucursal y comienza tu jornada.
            </p>
            <button
              onClick={handleIniciarTurno}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
            >
              Abrir Caja e Iniciar Turno
            </button>
          </div>
        )}
      </div>

      {/* Menú de opciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {menuItems.map((section) => (
          <div key={section.title} className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <span className="mr-2">{section.icon}</span>
                {section.title}
              </h2>
            </div>
            <div className="p-2">
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <li key={item.name}>
                    <button
                      onClick={() => handleItemClick(item)}
                      disabled={item.requiresTurno && !turnoActivo}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center justify-between group ${item.requiresTurno && !turnoActivo
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-blue-50 cursor-pointer'
                        }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className={`text-xl p-2 rounded-lg ${item.requiresTurno && !turnoActivo ? 'bg-gray-100' : 'bg-white shadow-sm group-hover:bg-blue-100 text-blue-600'}`}>
                          {item.icon}
                        </span>
                        <span className={`${item.requiresTurno && !turnoActivo ? 'text-gray-400' : 'text-gray-700 font-medium group-hover:text-blue-700'}`}>
                          {item.name}
                        </span>
                      </div>
                      {item.requiresTurno && !turnoActivo && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded border">
                          Cerrado
                        </span>
                      )}
                      {(!item.requiresTurno || turnoActivo) && (
                        <span className="text-gray-300 group-hover:text-blue-400">→</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Acceso rápido al POS */}
      {turnoActivo && (
        <div className="mt-8">
          <button
            onClick={() => router.push('/pos')}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-6 rounded-xl shadow-lg transition-all transform hover:scale-[1.01] flex items-center justify-center gap-4 group"
          >
            <div className="bg-white/20 p-2 rounded-lg group-hover:scale-110 transition-transform">
              <span className="text-3xl">💰</span>
            </div>
            <div className="text-left">
              <span className="block text-sm opacity-90 uppercase tracking-wider font-semibold">Acceso Directo</span>
              <span className="text-2xl font-bold">Ir al Punto de Venta</span>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
