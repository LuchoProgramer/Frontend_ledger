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
});
