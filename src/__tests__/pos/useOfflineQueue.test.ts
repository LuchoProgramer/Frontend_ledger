import 'fake-indexeddb/auto';
import { posDB } from '@/lib/db/posDB';

const mockCrearFacturaPOS = jest.fn();

jest.mock('@/lib/api', () => ({
  getApiClient: () => ({ crearFacturaPOS: mockCrearFacturaPOS }),
}));

import { enqueueSaleFn, processSyncQueueFn } from '@/app/pos/hooks/useOfflineQueue';

beforeEach(async () => {
  await posDB.ventas_offline.clear();
  jest.clearAllMocks();
});

describe('enqueueSaleFn', () => {
  it('guarda venta con estado PENDIENTE', async () => {
    await enqueueSaleFn(
      { items: [], pagos: [] },
      { negocio: 'Test', total: 10 },
      3, 10
    );
    const count = await posDB.ventas_offline
      .where('estado').equals('PENDIENTE').count();
    expect(count).toBe(1);
  });
});

describe('processSyncQueueFn', () => {
  it('marca venta como SINCRONIZADA al éxito del API', async () => {
    mockCrearFacturaPOS.mockResolvedValue({ success: true });
    const id = await posDB.ventas_offline.add({
      turno_id: 3, sucursal_id: 10,
      payload: JSON.stringify({ items: [], pagos: [] }),
      receipt_data: '{}',
      estado: 'PENDIENTE',
      created_at: Date.now() - 1000,
    });

    const apiClient = { crearFacturaPOS: mockCrearFacturaPOS };
    await processSyncQueueFn(apiClient as any);

    const venta = await posDB.ventas_offline.get(id);
    expect(venta?.estado).toBe('SINCRONIZADA');
  });

  it('deja en PENDIENTE y detiene procesamiento si hay error de red (status 0)', async () => {
    mockCrearFacturaPOS.mockRejectedValue({ status: 0, message: 'Network error' });
    const id = await posDB.ventas_offline.add({
      turno_id: 3, sucursal_id: 10,
      payload: '{}', receipt_data: '{}',
      estado: 'PENDIENTE', created_at: Date.now(),
    });

    const apiClient = { crearFacturaPOS: mockCrearFacturaPOS };
    await processSyncQueueFn(apiClient as any);

    const venta = await posDB.ventas_offline.get(id);
    expect(venta?.estado).toBe('PENDIENTE');
    expect(mockCrearFacturaPOS).toHaveBeenCalledTimes(1);
  });

  it('marca ERROR_SYNC en error de negocio y continúa con la siguiente', async () => {
    mockCrearFacturaPOS
      .mockRejectedValueOnce({ status: 400, message: 'Stock insuficiente' })
      .mockResolvedValueOnce({ success: true });

    const id1 = await posDB.ventas_offline.add({
      turno_id: 3, sucursal_id: 10, payload: '{}', receipt_data: '{}',
      estado: 'PENDIENTE', created_at: Date.now() - 2000,
    });
    const id2 = await posDB.ventas_offline.add({
      turno_id: 3, sucursal_id: 10, payload: '{}', receipt_data: '{}',
      estado: 'PENDIENTE', created_at: Date.now() - 1000,
    });

    const apiClient = { crearFacturaPOS: mockCrearFacturaPOS };
    await processSyncQueueFn(apiClient as any);

    const v1 = await posDB.ventas_offline.get(id1);
    const v2 = await posDB.ventas_offline.get(id2);
    expect(v1?.estado).toBe('ERROR_SYNC');
    expect(v1?.error_msg).toBe('Stock insuficiente');
    expect(v2?.estado).toBe('SINCRONIZADA');
  });

  it('no procesa si isSyncing es true (flag de concurrencia)', async () => {
    mockCrearFacturaPOS.mockResolvedValue({ success: true });
    await posDB.ventas_offline.add({
      turno_id: 3, sucursal_id: 10, payload: '{}', receipt_data: '{}',
      estado: 'PENDIENTE', created_at: Date.now(),
    });

    const apiClient = { crearFacturaPOS: mockCrearFacturaPOS };
    // Simular que ya hay un sync en curso pasando el flag
    await processSyncQueueFn(apiClient as any, true);
    expect(mockCrearFacturaPOS).not.toHaveBeenCalled();
  });
});
