'use client'

import { AuthProvider } from '@/contexts/AuthContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

interface ProvidersProps {
  children: React.ReactNode
  isPublic: boolean
}

/**
 * Componente Providers que monta AuthProvider condicionalmente
 * 
 * - Tenant Público: NO monta AuthProvider (no hay autenticación)
 * - Tenant Privado: SÍ monta AuthProvider (requiere autenticación)
 */
export function Providers({ children, isPublic }: ProvidersProps) {
  // Crear QueryClient con useState para evitar recreaciones
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,      // 30 segundos (datos frescos)
        gcTime: 5 * 60 * 1000,     // 5 minutos en memoria (antes cacheTime)
        retry: 2,                  // Reintentar fallos de red
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 1, // Reintentar mutaciones una vez
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {isPublic ? (
        // Tenant Público: NO montamos AuthProvider
        // Esto evita cualquier llamada a /api/auth/me/ y loops de redirección
        <>{children}</>
      ) : (
        // Tenant Privado: SÍ montamos AuthProvider
        // El contexto verificará la sesión y manejará la autenticación
        <AuthProvider>
          {children}
        </AuthProvider>
      )}
    </QueryClientProvider>
  )
}
