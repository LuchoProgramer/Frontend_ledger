/**
 * @jest-environment jsdom
 */
// Incidente 2026-07-16 (la_huequita, caja de Emili): una venta quedó PENDIENTE en Dexie
// y el ⚡ bloqueó cerrar caja para siempre — la cola solo se re-sincronizaba con los
// eventos 'online' y visibilitychange, que en una tablet kiosk nunca se disparan.
// El hook debe drenar la cola también al montar el POS (recargar la página la destranca).
import 'fake-indexeddb/auto';
import { renderHook, waitFor } from '@testing-library/react';

const mockCrearFacturaPOS = jest.fn();
jest.mock('@/lib/api', () => ({ getApiClient: () => ({ crearFacturaPOS: mockCrearFacturaPOS }) }));

import { useOfflineQueue } from '@/app/pos/hooks/useOfflineQueue';
import { posDB } from '@/lib/db/posDB';

const ventaPendiente = () => ({
  turno_id: 3,
  sucursal_id: 10,
  payload: JSON.stringify({ items: [], pagos: [] }),
  receipt_data: '{}',
  estado: 'PENDIENTE' as const,
  created_at: Date.now() - 1000,
});

const setOnLine = (value: boolean) =>
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value });

beforeEach(async () => {
  await posDB.ventas_offline.clear();
  jest.clearAllMocks();
  setOnLine(true);
});

describe('useOfflineQueue — sync al montar', () => {
  it('procesa las ventas PENDIENTE al montar el hook si hay conexión', async () => {
    mockCrearFacturaPOS.mockResolvedValue({ success: true });
    const id = await posDB.ventas_offline.add(ventaPendiente());

    renderHook(() => useOfflineQueue());

    await waitFor(async () => {
      const venta = await posDB.ventas_offline.get(id);
      expect(venta?.estado).toBe('SINCRONIZADA');
    });
  });

  it('no intenta sincronizar al montar si no hay conexión', async () => {
    setOnLine(false);
    await posDB.ventas_offline.add(ventaPendiente());

    renderHook(() => useOfflineQueue());

    await new Promise(r => setTimeout(r, 50));
    expect(mockCrearFacturaPOS).not.toHaveBeenCalled();
  });
});
