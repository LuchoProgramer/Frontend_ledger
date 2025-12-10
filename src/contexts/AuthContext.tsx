'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react'
import { ApiClient } from '@/lib/api'

// Instancia global del cliente API
// Se puede instanciar aquí porque ApiClient detecta el tenant del window.location internamente
const apiClient = new ApiClient();

interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_staff: boolean
  is_superuser: boolean
  groups: string[]
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (userData: User) => void
  logout: () => Promise<void>
  isAuthenticated: boolean
  isAdmin: boolean
  isVendedor: boolean
  api: ApiClient // <--- Agregamos esto
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * AuthProvider - Proveedor de contexto de autenticación
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Verificar sesión al montar el componente
  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = async () => {
    try {
      // Carga optimista
      const savedUser = localStorage.getItem('user')
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser))
        } catch (e) {
          localStorage.removeItem('user')
        }
      }

      // Verificar con backend
      const response = await apiClient.getCurrentUser()

      if (response.success && response.user) {
        setUser(response.user)
        localStorage.setItem('user', JSON.stringify(response.user))
      } else {
        setUser(null)
        localStorage.removeItem('user')
      }
    } catch (error: any) {
      if (error?.status === 401) {
        setUser(null)
        localStorage.removeItem('user')
      }
    } finally {
      setLoading(false)
    }
  }

  const login = (userData: User) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const logout = async () => {
    try {
      await apiClient.logout()
    } catch (error) {
      console.error('Error logout:', error)
    } finally {
      setUser(null)
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
  }

  const value = useMemo(() => ({
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.is_staff || user?.groups?.includes('Administrador') || false,
    isVendedor: user?.groups?.includes('Usuarios') || false,
    api: apiClient // <--- Inyectamos la instancia
  }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  return context
}

