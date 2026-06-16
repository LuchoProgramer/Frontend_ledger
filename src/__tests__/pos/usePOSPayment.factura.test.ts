/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';

jest.mock('@/lib/api', () => ({ getApiClient: () => ({}) }));

import { usePOSPayment } from '@/app/pos/hooks/usePOSPayment';
import { Turno } from '@/app/pos/types';

const mkTurno = (overrides: Partial<Turno>): Turno => ({
  id: 1, sucursal: 1, sucursal_nombre: 'S1', inicio_turno: '2026-06-14T00:00:00Z', ...overrides,
});

const args = (turno: Turno | null) => ({
  items: [],
  client: { identificacion: '9999999999', razon_social: 'CF', email: '', direccion: '' },
  turno,
  totals: { subtotal: 0, total: 0, impuesto: 0 },
  onSaleComplete: () => {},
  showToast: () => {},
});

describe('usePOSPayment — default del toggle de factura', () => {
  it('esInterno arranca false cuando factura_electronica_default=true', () => {
    const { result } = renderHook(() => usePOSPayment(args(mkTurno({ factura_electronica_default: true }))));
    expect(result.current.esInterno).toBe(false);
  });

  it('esInterno arranca true cuando el flag está ausente', () => {
    const { result } = renderHook(() => usePOSPayment(args(mkTurno({}))));
    expect(result.current.esInterno).toBe(true);
  });

  it('el toggle sigue flipeable', () => {
    const { result } = renderHook(() => usePOSPayment(args(mkTurno({ factura_electronica_default: true }))));
    act(() => result.current.setEsInterno(true));
    expect(result.current.esInterno).toBe(true);
  });

  // Bug de producción (la_huequita): al abrir el modal de pago, openModal forzaba
  // es_interno=true para Consumidor Final (el cliente por defecto), pisando el flag
  // del tenant. Resultado: con factura_electronica_default=true el toggle igual
  // arrancaba en "Nota de Venta" para CF (el 99% de las ventas de mostrador).
  const cf = { identificacion: '9999999999', razon_social: 'CF', email: '', direccion: '' };
  const argsItems = (turno: Turno | null, client = cf) => ({
    ...args(turno), client,
    items: [{ id: 1 } as any],
    totals: { subtotal: 10, total: 10, impuesto: 0 },
  });

  it('openModal: con factura_electronica_default, Consumidor Final arranca en factura', () => {
    const { result } = renderHook(() => usePOSPayment(argsItems(mkTurno({ factura_electronica_default: true }))));
    act(() => result.current.openModal(() => {}));
    expect(result.current.showModal).toBe(true);
    expect(result.current.esInterno).toBe(false); // factura, NO interna pese a ser CF
  });

  it('openModal: sin el flag, Consumidor Final sigue arrancando en interna', () => {
    const { result } = renderHook(() => usePOSPayment(argsItems(mkTurno({}))));
    act(() => result.current.openModal(() => {}));
    expect(result.current.esInterno).toBe(true);
  });

  it('openModal: cliente identificado arranca en factura (con o sin flag)', () => {
    const ident = { identificacion: '1725697567', razon_social: 'Real', email: '', direccion: '' };
    const { result } = renderHook(() => usePOSPayment(argsItems(mkTurno({}), ident)));
    act(() => result.current.openModal(() => {}));
    expect(result.current.esInterno).toBe(false);
  });
});
