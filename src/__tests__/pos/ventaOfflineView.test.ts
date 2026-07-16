import 'fake-indexeddb/auto';
import { posDB, VentaOfflineDB } from '@/lib/db/posDB';
import {
  describirVentaOffline,
  reintentarVentaOffline,
  descartarVentaOffline,
} from '@/app/pos/components/_ventaOfflineView';

const ventaBase = (over: Partial<VentaOfflineDB> = {}): VentaOfflineDB => ({
  turno_id: 97,
  sucursal_id: 1,
  payload: JSON.stringify({ venta_uuid: 'abc' }),
  receipt_data: JSON.stringify({
    cliente: 'CONSUMIDOR FINAL',
    total: 12.5,
    items: [{ nombre: 'ZHUMIR', cantidad: 2, precio: 6.25, subtotal: 12.5 }],
  }),
  estado: 'ERROR_SYNC',
  created_at: new Date('2026-07-16T22:06:57Z').getTime(),
  error_msg: 'Bad Request',
  ...over,
});

beforeEach(async () => {
  await posDB.ventas_offline.clear();
});

describe('describirVentaOffline', () => {
  it('resume cliente, total, items y motivo del error', () => {
    const r = describirVentaOffline({ ...ventaBase(), id: 3 });
    expect(r.cliente).toBe('CONSUMIDOR FINAL');
    expect(r.total).toBe('$12.50');
    expect(r.items).toEqual(['2× ZHUMIR ($6.25)']);
    expect(r.error).toBe('Bad Request');
    expect(r.turnoId).toBe(97);
  });

  it('no revienta con receipt_data corrupto', () => {
    const r = describirVentaOffline({ ...ventaBase({ receipt_data: '{corrupto', error_msg: undefined }), id: 4 });
    expect(r.cliente).toBe('Consumidor Final');
    expect(r.total).toBe('—');
    expect(r.items).toEqual([]);
    expect(r.error).toBeNull();
  });
});

describe('acciones sobre la cola', () => {
  it('reintentar vuelve la venta a PENDIENTE y limpia el error', async () => {
    const id = (await posDB.ventas_offline.add(ventaBase())) as number;
    await reintentarVentaOffline(id);
    const v = await posDB.ventas_offline.get(id);
    expect(v?.estado).toBe('PENDIENTE');
    expect(v?.error_msg).toBeUndefined();
  });

  it('descartar elimina el registro', async () => {
    const id = (await posDB.ventas_offline.add(ventaBase())) as number;
    await descartarVentaOffline(id);
    expect(await posDB.ventas_offline.get(id)).toBeUndefined();
  });
});
