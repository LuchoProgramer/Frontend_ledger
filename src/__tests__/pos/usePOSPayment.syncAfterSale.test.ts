/**
 * @jest-environment jsdom
 */
// Tras una venta online exitosa la conexión está probada — es el momento ideal para
// drenar ventas PENDIENTE encoladas por un blip anterior (incidente ⚡ 2026-07-16).
import { renderHook, act } from '@testing-library/react';

const mockCrearFacturaPOS = jest.fn();
jest.mock('@/lib/api', () => ({ getApiClient: () => ({ crearFacturaPOS: mockCrearFacturaPOS }) }));

import { usePOSPayment } from '@/app/pos/hooks/usePOSPayment';
import { Turno } from '@/app/pos/types';

const turno: Turno = { id: 1, sucursal: 1, sucursal_nombre: 'S1', inicio_turno: '2026-07-16T00:00:00Z' } as Turno;

beforeAll(() => {
  // processSale usa crypto.randomUUID y window.open; jsdom no siempre los trae.
  if (!(global as any).crypto?.randomUUID) (global as any).crypto = { randomUUID: () => 'uuid-test' };
  window.open = jest.fn(() => null) as any;
});

beforeEach(() => {
  jest.clearAllMocks();
});

const mkArgs = (extra: object) => ({
  items: [{ producto: { id: 190, nombre: 'RON ZHUMIR' }, presentacion: { id: 153 }, cantidad: 1, precio: 16.5, isCombo: false } as any],
  client: { identificacion: '9999999999', razon_social: 'CF', email: '', direccion: '' },
  turno,
  totals: { subtotal: 16.5, total: 16.5, impuesto: 0 },
  onSaleComplete: () => {},
  showToast: () => {},
  ...extra,
});

describe('usePOSPayment — drena la cola offline tras venta exitosa', () => {
  it('llama processSyncQueue después de una venta online exitosa', async () => {
    mockCrearFacturaPOS.mockResolvedValue({ numero_autorizacion: '' });
    const processSyncQueue = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => usePOSPayment(mkArgs({ processSyncQueue })));

    act(() => result.current.setPaymentAmount('16.50'));
    act(() => result.current.addPayment());
    await act(async () => { await result.current.processSale(); });

    expect(mockCrearFacturaPOS).toHaveBeenCalledTimes(1);
    expect(processSyncQueue).toHaveBeenCalled();
  });

  it('NO llama processSyncQueue si la venta falló', async () => {
    mockCrearFacturaPOS.mockRejectedValue({ status: 500, message: 'boom' });
    window.alert = jest.fn();
    const processSyncQueue = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => usePOSPayment(mkArgs({ processSyncQueue })));

    act(() => result.current.setPaymentAmount('16.50'));
    act(() => result.current.addPayment());
    await act(async () => { await result.current.processSale(); });

    expect(processSyncQueue).not.toHaveBeenCalled();
  });
});
