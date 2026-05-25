import 'fake-indexeddb/auto';
import { posDB, VentaOfflineDB } from '@/lib/db/posDB';

beforeEach(async () => {
  await posDB.productos.clear();
  await posDB.categorias.clear();
  await posDB.combos.clear();
  await posDB.ventas_offline.clear();
});

describe('posDB schema', () => {
  it('inserta y recupera un producto con sucursal_id', async () => {
    await posDB.productos.put({
      id: 1,
      sucursal_id: 10,
      nombre: 'Cono Queso',
      categoria_id: 5,
      impuesto_porcentaje: 15,
      activo: true,
    } as any);

    const found = await posDB.productos.get(1);
    expect(found?.nombre).toBe('Cono Queso');
    expect(found?.sucursal_id).toBe(10);
  });

  it('filtra productos por sucursal_id', async () => {
    await posDB.productos.bulkPut([
      { id: 1, sucursal_id: 10, nombre: 'A', impuesto_porcentaje: 15, activo: true } as any,
      { id: 2, sucursal_id: 99, nombre: 'B', impuesto_porcentaje: 0, activo: true } as any,
    ]);
    const results = await posDB.productos.where('sucursal_id').equals(10).toArray();
    expect(results).toHaveLength(1);
    expect(results[0].nombre).toBe('A');
  });

  it('encola una venta y la recupera por estado', async () => {
    const venta: VentaOfflineDB = {
      turno_id: 5,
      sucursal_id: 10,
      payload: '{}',
      receipt_data: '{}',
      estado: 'PENDIENTE',
      created_at: Date.now(),
    };
    await posDB.ventas_offline.add(venta);
    const pendientes = await posDB.ventas_offline
      .where('estado').equals('PENDIENTE').toArray();
    expect(pendientes).toHaveLength(1);
    expect(pendientes[0].turno_id).toBe(5);
  });

  it('actualiza estado de venta de PENDIENTE a SINCRONIZADA', async () => {
    const id = await posDB.ventas_offline.add({
      turno_id: 5, sucursal_id: 10,
      payload: '{}', receipt_data: '{}',
      estado: 'PENDIENTE', created_at: Date.now(),
    });
    await posDB.ventas_offline.update(id, { estado: 'SINCRONIZADA' });
    const updated = await posDB.ventas_offline.get(id);
    expect(updated?.estado).toBe('SINCRONIZADA');
  });
});
