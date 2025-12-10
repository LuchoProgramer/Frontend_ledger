'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getApiClient } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import type { Group as Grupo, SucursalSimple as Sucursal, UsuarioFormData } from '@/lib/types/usuarios'

export default function NuevoUsuarioPage() {
  const router = useRouter()
  const { isAdmin } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Datos del formulario
  const [formData, setFormData] = useState<UsuarioFormData>({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    grupos: [],
    sucursales: [],
    is_active: true,
  })

  // Datos para selects
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // Verificar permisos
  useEffect(() => {
    if (!isAdmin) {
      router.push('/')
    }
  }, [isAdmin, router])

  // Cargar grupos y sucursales
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const api = getApiClient()
        const [gruposRes, sucursalesRes] = await Promise.all([
          api.getGrupos(),
          api.getSucursales()
        ])

        if (gruposRes.success) {
          setGrupos(gruposRes.grupos)
        }
        if (sucursalesRes.success) {
          setSucursales(sucursalesRes.sucursales)

          // Verificar si hay sucursales
          if (!sucursalesRes.sucursales || sucursalesRes.sucursales.length === 0) {
            setError('No hay sucursales registradas. Debe crear al menos una sucursal antes de crear usuarios.')
          }
        }
      } catch (err: any) {
        setError(err.message || 'Error cargando datos')
      } finally {
        setLoadingData(false)
      }
    }

    if (isAdmin) {
      cargarDatos()
    }
  }, [isAdmin])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    // Validaciones
    if (!formData.username.trim()) {
      setError('El nombre de usuario es requerido')
      setLoading(false)
      return
    }

    if (!formData.password || formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      setLoading(false)
      return
    }

    try {
      const api = getApiClient()
      const response = await api.crearUsuario(formData)

      if (response.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/usuarios')
        }, 1500)
      } else {
        setError(response.error || 'Error creando usuario')
      }
    } catch (err: any) {
      setError(err.message || 'Error creando usuario')
    } finally {
      setLoading(false)
    }
  }

  const handleGrupoToggle = (grupoId: number) => {
    setFormData((prev) => ({
      ...prev,
      grupos: prev.grupos.includes(grupoId)
        ? prev.grupos.filter((id) => id !== grupoId)
        : [...prev.grupos, grupoId],
    }))
  }

  const handleSucursalToggle = (sucursalId: number) => {
    setFormData((prev) => ({
      ...prev,
      sucursales: prev.sucursales.includes(sucursalId)
        ? prev.sucursales.filter((id) => id !== sucursalId)
        : [...prev.sucursales, sucursalId],
    }))
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/usuarios')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Volver
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Crear Nuevo Usuario</h1>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mensajes */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-red-700 font-medium">{error}</p>
                {sucursales.length === 0 && (
                  <button
                    onClick={() => router.push('/sucursales/nuevo')}
                    className="mt-3 inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Crear Primera Sucursal
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-700">✅ Usuario creado exitosamente. Redirigiendo...</p>
          </div>
        )}

        {loadingData ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Cargando formulario...</p>
          </div>
        ) : sucursales.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay sucursales registradas</h3>
            <p className="text-gray-600 mb-6">
              Para crear usuarios, primero debe crear al menos una sucursal donde puedan trabajar.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => router.push('/sucursales/nuevo')}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Crear Primera Sucursal
              </button>
              <button
                onClick={() => router.push('/usuarios')}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Volver
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="p-6 space-y-6">
              {/* Información Básica */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Información Básica</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Username */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de Usuario <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="usuario123"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Sin espacios ni caracteres especiales</p>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="usuario@ejemplo.com"
                    />
                  </div>

                  {/* Nombre */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Juan"
                    />
                  </div>

                  {/* Apellido */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Apellido
                    </label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Pérez"
                    />
                  </div>

                  {/* Contraseña */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contraseña <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="••••••••"
                      required
                      minLength={8}
                    />
                    <p className="text-xs text-gray-500 mt-1">Mínimo 8 caracteres</p>
                  </div>
                </div>
              </div>

              {/* Grupos (Roles) */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Grupos y Permisos</h2>
                <div className="space-y-2">
                  {grupos.length === 0 ? (
                    <p className="text-sm text-gray-500">No hay grupos disponibles</p>
                  ) : (
                    grupos.map((grupo) => (
                      <label
                        key={grupo.id}
                        className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.grupos.includes(grupo.id)}
                          onChange={() => handleGrupoToggle(grupo.id)}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <div>
                          <span className="font-medium text-gray-900">{grupo.name}</span>
                          {grupo.name === 'Administrador' && (
                            <p className="text-xs text-gray-500">Acceso completo al sistema</p>
                          )}
                          {grupo.name === 'Usuarios' && (
                            <p className="text-xs text-gray-500">Acceso al POS y ventas</p>
                          )}
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Sucursales */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Sucursales Asignadas</h2>
                <div className="space-y-2">
                  {sucursales.length === 0 ? (
                    <p className="text-sm text-gray-500">No hay sucursales disponibles</p>
                  ) : (
                    sucursales.map((sucursal) => (
                      <label
                        key={sucursal.id}
                        className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.sucursales.includes(sucursal.id)}
                          onChange={() => handleSucursalToggle(sucursal.id)}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">{sucursal.nombre}</span>
                            {sucursal.es_matriz && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                Matriz
                              </span>
                            )}
                          </div>
                          {sucursal.codigo_establecimiento && (
                            <p className="text-xs text-gray-500">
                              Cód: {sucursal.codigo_establecimiento}
                            </p>
                          )}
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Estado */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Estado</h2>
                <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Usuario Activo</span>
                    <p className="text-xs text-gray-500">Permitir acceso al sistema</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Botones */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.push('/usuarios')}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Creando...' : 'Crear Usuario'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
