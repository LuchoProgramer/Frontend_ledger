'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getApiClient } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import type { Usuario, Group as Grupo, SucursalSimple as Sucursal } from '@/lib/types/usuarios'

export default function EditarUsuarioPage() {
  const router = useRouter()
  const params = useParams()
  const usuarioId = Number(params.id)
  const { isAdmin } = useAuth()

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Datos del usuario
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    grupos: [] as number[],
    sucursales: [] as number[],
    is_active: true,
  })

  // Datos para selects
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])

  // Verificar permisos
  useEffect(() => {
    if (!isAdmin) {
      router.push('/')
    }
  }, [isAdmin, router])

  // Cargar datos del usuario
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const api = getApiClient()
        const [usuarioRes, gruposRes, sucursalesRes] = await Promise.all([
          api.getUsuario(usuarioId),
          api.getGrupos(),
          api.getSucursales()
        ])

        if (usuarioRes.success && usuarioRes.usuario) {
          setUsuario(usuarioRes.usuario)
          setFormData({
            email: usuarioRes.usuario.email || '',
            first_name: usuarioRes.usuario.first_name || '',
            last_name: usuarioRes.usuario.last_name || '',
            password: '',
            grupos: usuarioRes.usuario.grupos.map(g => g.id),
            sucursales: usuarioRes.usuario.sucursales.map(s => s.id),
            is_active: usuarioRes.usuario.is_active,
          })
        } else {
          setError('Usuario no encontrado')
        }

        if (gruposRes.success) {
          setGrupos(gruposRes.grupos)
        }

        if (sucursalesRes.success) {
          setSucursales(sucursalesRes.sucursales)
        }
      } catch (err: any) {
        setError(err.message || 'Error cargando datos')
      } finally {
        setLoadingData(false)
      }
    }

    if (isAdmin && usuarioId) {
      cargarDatos()
    }
  }, [isAdmin, usuarioId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    // Validación de contraseña si se proporciona
    if (formData.password && formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      setLoading(false)
      return
    }

    try {
      const api = getApiClient()
      const updateData: any = {
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        grupos: formData.grupos,
        sucursales: formData.sucursales,
        is_active: formData.is_active,
      }

      // Solo incluir contraseña si se proporcionó
      if (formData.password) {
        updateData.password = formData.password
      }

      const response = await api.actualizarUsuario(usuarioId, updateData)

      if (response.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/usuarios')
        }, 1500)
      } else {
        setError(response.error || 'Error actualizando usuario')
      }
    } catch (err: any) {
      setError(err.message || 'Error actualizando usuario')
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
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Editar Usuario</h1>
              {usuario && (
                <p className="text-sm text-gray-500 mt-1">
                  @{usuario.username}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mensajes */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-700">✅ Usuario actualizado exitosamente. Redirigiendo...</p>
          </div>
        )}

        {loadingData ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Cargando datos...</p>
          </div>
        ) : !usuario ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <p className="text-red-600 text-lg">Usuario no encontrado</p>
            <button
              onClick={() => router.push('/usuarios')}
              className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Volver a la lista
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="p-6 space-y-6">
              {/* Información del Usuario */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-blue-900">
                      {usuario.first_name} {usuario.last_name}
                    </h3>
                    <p className="text-sm text-blue-700">@{usuario.username}</p>
                  </div>
                  <div className="text-right text-sm text-blue-700">
                    <p>Registrado: {new Date(usuario.date_joined).toLocaleDateString('es-EC')}</p>
                    {usuario.last_login && (
                      <p>Último acceso: {new Date(usuario.last_login).toLocaleDateString('es-EC')}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Información Básica */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Información Básica</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Email */}
                  <div className="md:col-span-2">
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

                  {/* Nueva Contraseña (opcional) */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nueva Contraseña (opcional)
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Dejar vacío para mantener la actual"
                      minLength={8}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Dejar vacío si no desea cambiar la contraseña. Mínimo 8 caracteres si se cambia.
                    </p>
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
                    <p className="text-xs text-gray-500">
                      {formData.is_active
                        ? 'El usuario puede acceder al sistema'
                        : 'El usuario no podrá iniciar sesión'}
                    </p>
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
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
