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
        staleTime: 60 * 1000, // 1 minuto
        refetchOnWindowFocus: false,
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
