import { reconciliarCarrito } from '@/app/pos/_reconcileCatalogo';

const item = (presId: number, nombre = 'Prod', isCombo = false) => ({
  producto: { id: 1, nombre },
  presentacion: { id: presId },
  isCombo,
});

describe('reconciliarCarrito', () => {
  it('marca el ítem cuyo presentacion_id no está en el catálogo fresco', () => {
    const res = reconciliarCarrito([item(99999, 'Zhumir')], new Set([200, 604]));
    expect(res.indicesAQuitar).toEqual([0]);
    expect(res.nombresAfectados).toEqual(['Zhumir']);
  });

  it('no marca nada si todos los ids son válidos', () => {
    const res = reconciliarCarrito([item(200), item(604)], new Set([200, 604]));
    expect(res.indicesAQuitar).toEqual([]);
    expect(res.nombresAfectados).toEqual([]);
  });

  it('marca varios huérfanos y conserva el orden de índices', () => {
    const res = reconciliarCarrito([item(200), item(99999, 'A'), item(88888, 'B')], new Set([200]));
    expect(res.indicesAQuitar).toEqual([1, 2]);
    expect(res.nombresAfectados).toEqual(['A', 'B']);
  });

  it('ignora los combos (usan presentacion_id virtual = combo.id)', () => {
    const res = reconciliarCarrito([item(99999, 'ComboX', true)], new Set([200]));
    expect(res.indicesAQuitar).toEqual([]);
    expect(res.nombresAfectados).toEqual([]);
  });
});
