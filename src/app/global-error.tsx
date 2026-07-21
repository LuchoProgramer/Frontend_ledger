'use client';

import { useEffect } from 'react';
import { isChunkLoadError, maybeReloadOnChunkError } from '@/lib/chunkError';
import { buildErrorReportPayload, reportClientError } from '@/lib/reportError';
import { getApiUrl, getTenant } from '@/lib/tenant';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const reloaded = maybeReloadOnChunkError(error, {
      storage: window.sessionStorage,
      now: Date.now(),
      reload: () => window.location.reload(),
    });

    if (!reloaded && !isChunkLoadError(error)) {
      const payload = buildErrorReportPayload(error, {
        pathname: window.location.pathname,
        userAgent: window.navigator.userAgent,
      });
      const fetchFn =
        typeof window !== 'undefined' && window.fetch
          ? window.fetch.bind(window)
          : typeof fetch !== 'undefined'
            ? fetch
            : (async () => ({} as Response));

      reportClientError(payload, {
        fetchFn,
        apiUrl: getApiUrl(),
        tenant: getTenant(),
      });
    }
  }, [error]);

  const esChunk = isChunkLoadError(error);
  const mensajeTecnico = error.message
    ? error.message.slice(0, 200) + (error.digest ? ` (digest: ${error.digest})` : '')
    : null;

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
          {!esChunk && mensajeTecnico && (
            <p style={{ margin: 0, color: '#9ca3af', maxWidth: 420, fontSize: 12 }}>
              {mensajeTecnico}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
