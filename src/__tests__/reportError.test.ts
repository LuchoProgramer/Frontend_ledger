import { buildErrorReportPayload, reportClientError } from '@/lib/reportError';

describe('buildErrorReportPayload', () => {
  it('arma el payload con message, stack y digest del error', () => {
    const error = new Error('boom') as Error & { digest?: string };
    error.digest = 'abc123';
    const payload = buildErrorReportPayload(error, {
      pathname: '/pos',
      userAgent: 'Mozilla/5.0 test',
    });
    expect(payload).toEqual({
      message: 'boom',
      stack: error.stack,
      digest: 'abc123',
      pathname: '/pos',
      user_agent: 'Mozilla/5.0 test',
    });
  });

  it('digest queda undefined si el error no lo trae', () => {
    const payload = buildErrorReportPayload(new Error('boom'), {
      pathname: '/pos',
      userAgent: 'ua',
    });
    expect(payload.digest).toBeUndefined();
  });
});

describe('reportClientError', () => {
  const payload = {
    message: 'boom',
    stack: undefined,
    digest: undefined,
    pathname: '/pos',
    user_agent: 'ua',
  };

  it('hace POST a {apiUrl}/api/errores-frontend/ con X-Tenant cuando el tenant no es public', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: true } as Response);
    await reportClientError(payload, {
      fetchFn,
      // apiUrl es SOLO el dominio (mismo contrato que ApiClientBase.baseURL,
      // ver core/_base.ts) — no trae el prefijo /api. Bug real (2026-08-01):
      // este test pasaba con un apiUrl que ya traía /api, premisa que no
      // coincide con lo que getApiUrl() devuelve de verdad en producción, y
      // el 404 resultante en prod nunca se detectó hasta revisar logs.
      apiUrl: 'https://api.ledgerxpertz.com',
      tenant: 'la_huequita',
    });
    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.ledgerxpertz.com/api/errores-frontend/',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-Tenant': 'la_huequita' }),
        body: JSON.stringify(payload),
      })
    );
  });

  it('NO manda X-Tenant cuando el tenant es public', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: true } as Response);
    await reportClientError(payload, {
      fetchFn,
      apiUrl: 'https://api.ledgerxpertz.com',
      tenant: 'public',
    });
    const [, init] = fetchFn.mock.calls[0];
    expect((init.headers as Record<string, string>)['X-Tenant']).toBeUndefined();
  });

  it('nunca lanza si el fetch rechaza (best-effort)', async () => {
    const fetchFn = jest.fn().mockRejectedValue(new Error('sin red'));
    await expect(
      reportClientError(payload, { fetchFn, apiUrl: 'https://api.ledgerxpertz.com', tenant: 'public' })
    ).resolves.toBeUndefined();
  });
});
