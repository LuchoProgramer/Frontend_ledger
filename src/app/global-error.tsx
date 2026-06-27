'use client';

import { useEffect } from 'react';
import { isChunkLoadError, maybeReloadOnChunkError } from '@/lib/chunkError';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    maybeReloadOnChunkError(error, {
      storage: window.sessionStorage,
      now: Date.now(),
      reload: () => window.location.reload(),
    });
  }, [error]);

  const esChunk = isChunkLoadError(error);

  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f9fafb' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: 24,
            textAlign: 'center',
          }}
        >
          <h2 style={{ margin: 0, color: '#111827' }}>
            {esChunk ? 'Actualizando la aplicación…' : 'Algo salió mal'}
          </h2>
          <p style={{ margin: 0, color: '#6b7280', maxWidth: 420 }}>
            {esChunk
              ? 'Detectamos una versión nueva. Recargando para aplicarla…'
              : 'Ocurrió un error inesperado. Recargá la página para continuar.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              minHeight: 48,
              padding: '0 24px',
              borderRadius: 8,
              border: 'none',
              background: '#4f46e5',
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Recargar
          </button>
        </div>
      </body>
    </html>
  );
}
