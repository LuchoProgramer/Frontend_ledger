/**
 * @jest-environment jsdom
 *
 * Bug producción (la_huequita, 2026-06-19): al minimizar el POS por más de
 * 15 min (TTL del access token) y volver, el primer request da 401 → el
 * interceptor intenta refrescar → si ese fetch de refresh falla por un blip
 * de red transitorio (la tablet despierta la red), `refreshAndRetry` hacía
 * logout duro y redirigía a /login — pese a que el refresh token es válido
 * 7 días y la sesión seguía viva.
 *
 * El logout debe ocurrir SOLO ante un rechazo de auth REAL (401/403) del
 * endpoint de refresh, NO ante un error de red.
 */
import { ApiClientBase } from '@/lib/api/_base';

// Subclase de test que expone el `request` protegido.
class TestClient extends ApiClientBase {
  public call<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, options);
  }
}

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    headers: { get: () => 'application/json' },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

let client: TestClient;

// La señal canónica y observable del logout es `localStorage.removeItem('user')`
// (el mismo branch hace además `window.location.href = '/login'`, pero jsdom
// bloquea la navegación, así que aserto sobre el user, que es lo que importa).
beforeEach(() => {
  localStorage.setItem('user', JSON.stringify({ id: 1, username: '002RUIZE' }));
  client = new TestClient('la-huequita.ledgerxpertz.com');
  jest.restoreAllMocks();
});

describe('refreshAndRetry — logout solo ante rechazo de auth real', () => {
  it('NO desloguea si el refresh falla por error de red transitorio', async () => {
    const fetchMock = jest.fn()
      // 1) request original → 401 (access token expirado)
      .mockResolvedValueOnce(jsonResponse(401, { detail: 'no auth' }))
      // 2) POST /api/auth/refresh/ → error de red (fetch lanza)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(client.call('/api/auth/turno-activo/')).rejects.toBeDefined();

    // Sesión preservada: el user NO se borró (no se ejecutó el branch de logout).
    expect(localStorage.getItem('user')).not.toBeNull();
  });

  it('SÍ desloguea si el refresh devuelve 401 (sesión realmente expirada)', async () => {
    const fetchMock = jest.fn()
      // 1) request original → 401
      .mockResolvedValueOnce(jsonResponse(401, { detail: 'no auth' }))
      // 2) refresh → 401 (refresh token inválido/expirado)
      .mockResolvedValueOnce(jsonResponse(401, {}));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(client.call('/api/auth/turno-activo/')).rejects.toBeDefined();

    // Logout real: el user fue borrado (branch de logout ejecutado).
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('si el refresh tiene éxito, reintenta el request original y NO desloguea', async () => {
    const fetchMock = jest.fn()
      // 1) request original → 401
      .mockResolvedValueOnce(jsonResponse(401, { detail: 'no auth' }))
      // 2) refresh → 200 OK
      .mockResolvedValueOnce(jsonResponse(200, {}))
      // 3) reintento del request original → 200 con datos
      .mockResolvedValueOnce(jsonResponse(200, { success: true, tiene_turno_activo: true }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const data = await client.call<{ success: boolean }>('/api/auth/turno-activo/');

    expect(data.success).toBe(true);
    expect(localStorage.getItem('user')).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
