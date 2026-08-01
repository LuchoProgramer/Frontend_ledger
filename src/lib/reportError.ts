// Captura de errores del global-error del POS: arma el payload y lo manda
// al backend best-effort (nunca debe lanzar ni bloquear el fallback de UI).
// Lógica pura y testeable: global-error.tsx inyecta fetch/apiUrl/tenant reales.

export interface ClientErrorPayload {
  message: string;
  stack?: string;
  digest?: string;
  pathname: string;
  user_agent: string;
}

export function buildErrorReportPayload(
  error: Error & { digest?: string },
  context: { pathname: string; userAgent: string }
): ClientErrorPayload {
  return {
    message: error.message,
    stack: error.stack,
    digest: error.digest,
    pathname: context.pathname,
    user_agent: context.userAgent,
  };
}

export interface ReportClientErrorDeps {
  fetchFn: typeof fetch;
  apiUrl: string;
  tenant: string;
}

export async function reportClientError(
  payload: ClientErrorPayload,
  deps: ReportClientErrorDeps
): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (deps.tenant !== 'public') {
    headers['X-Tenant'] = deps.tenant;
  }

  try {
    await deps.fetchFn(`${deps.apiUrl}/api/errores-frontend/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  } catch {
    // best-effort: sin red, CORS, endpoint caído, lo que sea — se ignora.
  }
}
