'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { login as apiLogin, getTurnoActivo } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated, loading: authLoading } = useAuth()
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [tenantName, setTenantName] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Detectar el nombre del tenant desde el hostname
  useEffect(() => {
    const hostname = window.location.hostname
    // Si es localhost, es el tenant público
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      setTenantName('Público')
    } else {
      // Extraer el subdominio (yanett-pruebas.localhost → YANETT PRUEBAS)
      const subdomain = hostname.split('.')[0].replace(/-/g, ' ').toUpperCase()
      setTenantName(subdomain)
    }
  }, [])

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/')
    }
  }, [authLoading, isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await apiLogin(credentials.username, credentials.password)

      if (response.success && response.user) {
        // Login exitoso - actualizar contexto global
        login(response.user)

        // Lógica de redirección inteligente según rol
        const user = response.user
        const isAdmin = user.is_staff || user.groups?.includes('Administrador')
        const isVendedor = user.groups?.includes('Usuarios')

        // Pequeño delay para asegurar que la sesión se establezca
        await new Promise(resolve => setTimeout(resolve, 200))

        // Verificar si tiene turno activo
        console.log('Verificando turno para usuario:', user.username)
        const turnoResponse = await getTurnoActivo()
        console.log('Respuesta de turno:', turnoResponse)

        // Verificar si la respuesta fue exitosa
        if (!turnoResponse.success) {
          console.warn('getTurnoActivo no fue exitoso:', turnoResponse)
          // Continuar con flujo por defecto (sin turno)
        }

        const tieneTurnoActivo = turnoResponse.tiene_turno_activo || false

        // LÓGICA DE NEGOCIO:
        if (isVendedor && tieneTurnoActivo) {
          // Vendedor con turno → Redirigir directamente al POS
          router.push('/pos')
        } else if (isAdmin) {
          // Administrador → Siempre al dashboard (con o sin turno)
          router.push('/')
        } else {
          // Vendedor sin turno → Dashboard para iniciar turno
          router.push('/')
        }
      } else {
        // Error de autenticación
        setError(response.error || 'Credenciales inválidas')
      }
    } catch (err: any) {
      console.error('Error en login:', err)
      setError(err.message || 'Error de conexión. Por favor intente nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  // Mostrar loading mientras se verifica la sesión
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">LX</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Iniciar Sesión
          </h1>
          {tenantName && (
            <p className="text-gray-600">
              {tenantName}
            </p>
          )}
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Usuario
            </label>
            <input
              id="username"
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Ingresa tu usuario"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="••••••••"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={loading}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 focus-visible:text-gray-600 focus:outline-none disabled:cursor-not-allowed"
              >
                {showPassword ? (
                  // Ojo tachado (ocultar)
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  // Ojo abierto (mostrar)
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        {/* Enlaces adicionales */}
        <div className="mt-6 text-center space-y-2">
          <a href="#" className="block text-sm text-indigo-600 hover:text-indigo-700">
            ¿Olvidaste tu contraseña?
          </a>
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              ¿No tienes una empresa?{' '}
              <a href="https://ledgerxpertz.com/registro" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Regístrate aquí
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
