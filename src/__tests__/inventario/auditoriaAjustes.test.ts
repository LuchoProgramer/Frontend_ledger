/**
 * Aplicar ajustes desde una auditoría — lógica pura de selección.
 *
 * Una fila es "ajustable" (puede aplicarse al stock) solo si: fue contada
 * (conteo_fisico != null), tiene diferencia != 0, y no fue aplicada antes
 * (revisado === false). Las ya aplicadas muestran "Ajustado"; las sin
 * diferencia no se ofrecen. Espeja el guard del backend (AjusteAuditoriaService).
 */
import {
  esAjustable,
  idsAjustables,
  mensajeNoContados,
  mensajeOmitidos,
  type AuditoriaItem,
} from '@/app/inventario/auditoria/[id]/_ajustes';

const base: AuditoriaItem = { id: 1, conteo_fisico: 10, diferencia: -2, revisado: false };

describe('esAjustable', () => {
  it('es ajustable si fue contada, tiene diferencia y no fue aplicada', () => {
    expect(esAjustable(base)).toBe(true);
    expect(esAjustable({ ...base, diferencia: 3 })).toBe(true); // sobrante también
  });

  it('NO es ajustable si no fue contada', () => {
    expect(esAjustable({ ...base, conteo_fisico: null, diferencia: null })).toBe(false);
  });

  it('NO es ajustable si la diferencia es 0', () => {
    expect(esAjustable({ ...base, diferencia: 0 })).toBe(false);
  });

  it('NO es ajustable si ya fue aplicada (revisado)', () => {
    expect(esAjustable({ ...base, revisado: true })).toBe(false);
  });
});

describe('idsAjustables', () => {
  it('devuelve solo los ids de las filas ajustables', () => {
    const items: AuditoriaItem[] = [
      { id: 1, conteo_fisico: 9, diferencia: -18, revisado: false }, // ajustable
      { id: 2, conteo_fisico: 5, diferencia: 0, revisado: false },   // sin diferencia
      { id: 3, conteo_fisico: 4, diferencia: -1, revisado: true },   // ya aplicada
      { id: 4, conteo_fisico: null, diferencia: null, revisado: false }, // sin contar
      { id: 5, conteo_fisico: 7, diferencia: 2, revisado: false },   // ajustable (sobrante)
    ];
    expect(idsAjustables(items)).toEqual([1, 5]);
  });

  it('devuelve lista vacía si nada es ajustable', () => {
    expect(idsAjustables([{ id: 1, conteo_fisico: 5, diferencia: 0, revisado: false }])).toEqual([]);
  });
});

describe('mensajeNoContados', () => {
  it('vacío si no quedó nada sin contar', () => {
    expect(mensajeNoContados([])).toBe('');
  });

  it('lista los productos que quedaron sin contar', () => {
    const msg = mensajeNoContados([
      { id: 1, producto: 'Cristal' },
      { id: 2, producto: 'Pozo' },
    ]);
    expect(msg).toContain('2 productos');
    expect(msg).toContain('Cristal');
    expect(msg).toContain('Pozo');
  });

  it('singular para exactamente 1', () => {
    expect(mensajeNoContados([{ id: 1, producto: 'Cristal' }])).toContain('1 producto sin contar');
  });
});

describe('mensajeOmitidos', () => {
  it('vacío si no hubo omitidos', () => {
    expect(mensajeOmitidos([])).toBe('');
  });

  it('agrupa por motivo con su conteo', () => {
    const msg = mensajeOmitidos([
      { id: 1, motivo: 'no contado' },
      { id: 2, motivo: 'no contado' },
      { id: 3, motivo: 'sin diferencia' },
      { id: 4, motivo: 'ya aplicado' },
    ]);
    expect(msg).toContain('2 no contado');
    expect(msg).toContain('1 sin diferencia');
    expect(msg).toContain('1 ya aplicado');
  });
});
