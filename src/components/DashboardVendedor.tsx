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

interface AuditItem {
  id: number;
  producto: number;
  producto_nombre: string;
  cantidad_sistema: number; // Hidden?
  cantidad_fisica: number;
}

export default function DashboardVendedor({ tenant }: DashboardVendedorProps) {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [turnoActivo, setTurnoActivo] = useState<TurnoInfo | null>(null)
  const [loadingTurno, setLoadingTurno] = useState(true)

  // Estado para gestión de turnos y auditoría
  const [sucursales, setSucursales] = useState<Sucursal[]>([])

  // STEP: 'NONE' | 'SELECT_BRANCH' | 'AUDIT'
  const [step, setStep] = useState<'NONE' | 'SELECT_BRANCH' | 'AUDIT'>('NONE')

  const [selectedSucursal, setSelectedSucursal] = useState<string>('')
  const [processing, setProcessing] = useState(false)

  // Auditoria State
  const [currentAuditId, setCurrentAuditId] = useState<number | null>(null)
  const [auditItems, setAuditItems] = useState<AuditItem[]>([])
  const [auditLoading, setAuditLoading] = useState(false)

  const api = getApiClient()

  const cargarDatos = async () => {
    setLoadingTurno(true)
    try {
      const response = await api.getTurnoActivo()
      const isActivo = (response as any).activo || (response as any).tiene_turno_activo;

      if (response.success && isActivo) {
        const turnoData = (response as any).data || (response as any).turno
        if (turnoData) {
          setTurnoActivo({
            id: turnoData.id,
            hora_inicio: turnoData.inicio_turno || turnoData.hora_inicio,
            sucursal: turnoData.sucursal_nombre || turnoData.sucursal
          })

          // Check for pending audit for this shift
          try {
            const pendingAudits = await api.getAuditorias({ page: 1 }); // We might need a specific filter like 'estado=PENDIENTE'
            // Since the API returns paginated results, we look into results.
            // We need to filter client-side or assume backend returns relevant ones.
            // Ideally backend supports filtering. I added search param but not strict filter in client api.
            // Let's assume we can fetch the specific one if we knew ID, but we don't.
            // For now, let's try to fetch audits and see if any is PENDING and linked to this user/shift.
            // Optimization: Just rely on 'create' returning existing pending audit? No, that duplicates.

            // Let's iterate results.
            if ((pendingAudits as any).results) {
              const pending = (pendingAudits as any).results.find((a: any) => a.estado === 'PENDIENTE' && a.turno === turnoData.id);
              if (pending) {
                setCurrentAuditId(pending.id);
                // Fetch full detail to get items!
                const detail = await api.getAuditoria(pending.id);
                if (detail) {
                  const items = (detail as any).detalles.map((d: any) => ({
                    id: d.id,
                    producto: d.producto,
                    producto_nombre: d.producto_nombre,
                    cantidad_sistema: d.cantidad_sistema,
                    cantidad_fisica: d.cantidad_fisica
                  }))
                  setAuditItems(items)
                }
              }
            }
          } catch (err) {
            console.error("Error checking pending audits", err);
          }
        }
      } else {
        setTurnoActivo(null)
      }

      const sucsRes = await api.getSucursalesList({ page_size: 100 })
      if (sucsRes && sucsRes.results) {
        setSucursales(sucsRes.results)
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
    setStep('SELECT_BRANCH')
  }

  const iniciarProcesoTurno = async () => {
    if (!selectedSucursal) return
    setProcessing(true)
    try {
      // 1. Abrir Turno
      const res = await api.abrirTurno(parseInt(selectedSucursal))
      if (res) {
        // 2. Crear Auditoría Inicial Automática
        // Traemos todos los productos (o filtrar por categoría más tarde)
        const auditRes = await api.createAuditoria({
          tipo: 'INICIO_TURNO',
          // productos: [] // Empty implies all logic in backend or default? Backend defaults to empty list. 
          // Backend logic: if empty, defaults to ALL if tipo != ALEATORIO. 
          // Let's assume backend handles logic to select products for Audit.
        })

        if (auditRes) {
          setCurrentAuditId((auditRes as any).id)
          // Transformar detalles para UI
          const items = (auditRes as any).detalles.map((d: any) => ({
            id: d.id, // ID del DetalleAuditoria
            producto: d.producto,
            producto_nombre: d.producto_nombre,
            cantidad_sistema: d.cantidad_sistema,
            cantidad_fisica: 0 // Iniciar en 0 para contar
          }))
          setAuditItems(items)
          setStep('AUDIT')
        } else {
          // Fallback si falla auditoria pero turno abrio (Raro)
          await cargarDatos()
          setStep('NONE')
        }
      }
    } catch (error) {
      console.error('Error abriendo turno', error)
      alert('Error al abrir el turno. Inténtelo de nuevo.')
    } finally {
      setProcessing(false)
    }
  }

  const handleAuditChange = (id: number, val: string) => {
    const num = parseFloat(val) || 0;
    setAuditItems(prev => prev.map(item =>
      item.id === id ? { ...item, cantidad_fisica: num } : item
    ))
  }

  const finalizarAuditoria = async () => {
    if (!currentAuditId) return;
    setProcessing(true)
    try {
      // 1. Guardar conteos
      await api.updateAuditoriaCount(currentAuditId, auditItems.map(i => ({
        id: i.id,
        cantidad_fisica: i.cantidad_fisica
      })))

      // 2. Finalizar
      await api.finalizeAuditoria(currentAuditId)

      alert('Turno iniciado y auditoría registrada correctamente.')
      setStep('NONE')
      await cargarDatos()

    } catch (error) {
      console.error('Error finalizando auditoria', error)
      alert('Error al guardar la auditoría')
    } finally {
      setProcessing(false)
    }
  }

  const handleFinalizarTurno = async () => {
    if (!confirm('¿Está seguro que desea cerrar su turno? Se realizará el cierre de caja.')) return

    setProcessing(true)
    try {
      await api.cerrarTurno({
        efectivo_total: 0,
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

  // ... inside DashboardVendedor

  const minimizarAuditoria = () => {
    setStep('NONE');
  }

  const retomarAuditoria = () => {
    setStep('AUDIT');
  }

  return (
    <div className="space-y-8">

      {/* Banner de Auditoría Pendiente */}
      {currentAuditId && step === 'NONE' && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <span className="font-bold">Auditoría en curso.</span>
                {' '}Si realizas ventas, recuerda considerar los productos vendidos en tu conteo.
              </p>
            </div>
          </div>
          <button
            onClick={retomarAuditoria}
            className="px-4 py-2 bg-yellow-100 text-yellow-700 font-bold rounded hover:bg-yellow-200 text-sm transition-colors"
          >
            Retomar Conteo
          </button>
        </div>
      )}

      {/* Modal WIZARD */}
      {step !== 'NONE' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-xl shadow-xl w-full p-6 max-h-[90vh] overflow-y-auto ${step === 'AUDIT' ? 'max-w-4xl' : 'max-w-md'}`}>

            {step === 'SELECT_BRANCH' && (
              <>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Apertura de Caja</h3>
                <p className="text-gray-600 mb-6">Seleccione el punto de venta donde iniciará su turno.</p>
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
                  <button onClick={() => setStep('NONE')} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"> Cancelar </button>
                  <button
                    onClick={iniciarProcesoTurno}
                    disabled={processing || !selectedSucursal}
                    className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {processing ? 'Iniciando...' : 'Continuar'}
                  </button>
                </div>
              </>
            )}

            {step === 'AUDIT' && (
              <>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Auditoría de Inicio de Turno</h3>
                <p className="text-sm text-gray-500 mb-4">Por favor valide el inventario físico antes de comenzar a vender.</p>

                <div className="overflow-x-auto border rounded-lg mb-6 max-h-[60vh]">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Conteo Físico</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {auditItems.map(item => (
                        <tr key={item.id}>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.producto_nombre}</td>
                          <td className="px-4 py-2 text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="w-24 p-1 border rounded text-right focus:ring-2 focus:ring-blue-500 outline-none"
                              value={item.cantidad_fisica}
                              onChange={(e) => handleAuditChange(item.id, e.target.value)}
                            />
                          </td>
                        </tr>
                      ))}
                      {auditItems.length === 0 && (
                        <tr><td colSpan={2} className="p-4 text-center text-gray-500">No hay productos asignados para auditoría.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <button
                    onClick={minimizarAuditoria}
                    className="px-4 py-2 text-gray-500 hover:text-gray-700 font-medium text-sm flex items-center gap-2"
                  >
                    <span>🔽</span> Minimizar y Vender
                  </button>

                  <button
                    onClick={finalizarAuditoria}
                    disabled={processing}
                    className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-md"
                  >
                    {processing ? 'Guardando...' : 'Finalizar Auditoría'}
                  </button>
                </div>
              </>
            )}

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
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
              <span className="text-3xl">👋</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Hola, {user?.first_name}!</h2>
            <p className="text-gray-500 max-w-md mx-auto mb-8">
              Para comenzar a procesar ventas necesitas abrir tu caja. Selecciona tu sucursal y realiza la auditoría inicial.
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
