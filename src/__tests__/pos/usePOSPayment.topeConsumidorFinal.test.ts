/**
 * @jest-environment jsdom
 *
 * Tope legal de 50 USD a Consumidor Final (Ficha SRI 2.34 §9.10).
 *
 * El bloqueo lo hace el **backend** —el POS se puede saltar y la API es el
 * límite real—. Lo que se prueba acá es la reacción: llevar a la cajera al modal
 * de cliente, que es donde puede resolverlo, en vez de dejarla frente a un error.
 *
 * El caso delicado: el checkout devuelve **400 tanto para el tope como para el
 * catálogo stale**. Si se confunden, una venta bloqueada por el tope dispararía
 * una re-sincronización del catálogo que no arregla nada y encima tarda.
 */
import 'fake-indexeddb/auto';
import { renderHook, act } from '@testing-library/react';

const mockCrearFacturaPOS = jest.fn();
jest.mock('@/lib/api', () => ({ getApiClient: () => ({ crearFacturaPOS: mockCrearFacturaPOS }) }));

import { usePOSPayment } from '@/app/pos/hooks/usePOSPayment';
import { Turno } from '@/app/pos/types';

const turno: Turno = { id: 1, sucursal: 1, sucursal_nombre: 'S1', inicio_turno: '2026-07-31T00:00:00Z' } as Turno;

beforeAll(() => {
  if (!(global as any).crypto?.randomUUID) (global as any).crypto = { randomUUID: () => 'uuid-test' };
  window.open = jest.fn(() => null) as any;
});

beforeEach(() => jest.clearAllMocks());

function montar(extra: Record<string, unknown> = {}) {
  const showToast = jest.fn();
  const showClientModal = jest.fn();
  const preloadCatalog = jest.fn().mockResolvedValue(undefined);
  const removeItemsByIndices = jest.fn();

  const { result } = renderHook(() => usePOSPayment({
    items: [{
      producto: { id: 1, nombre: 'Botella' }, presentacion: { id: 10 },
      cantidad: 1, precio: 60, isCombo: false,
    } as any],
    client: { identificacion: '9999999999', razon_social: 'Consumidor Final', email: '', direccion: '' },
    turno,
    totals: { subtotal: 60, total: 60, impuesto: 0 },
    onSaleComplete: () => {},
    showToast,
    showClientModal,
    preloadCatalog,
    removeItemsByIndices,
    ...extra,
  }));

  // `processSale` aborta si el pago no cubre el total, así que se carga acá.
  act(() => { result.current.setPaymentAmount('60'); });
  act(() => { result.current.addPayment(); });

  return { result, showToast, showClientModal, preloadCatalog, removeItemsByIndices };
}

it('abre el modal de cliente cuando el backend bloquea por el tope', async () => {
  mockCrearFacturaPOS.mockRejectedValue({
    status: 400,
    message: 'Bad Request',
    data: {
      code: 'IDENTIFICACION_REQUERIDA',
      error: 'Esta venta es de $60.00 y supera los $50 que la ley permite facturar a Consumidor Final.',
      total: '60.00',
      tope: 50,
    },
  });

  const { result, showToast, showClientModal } = montar();
  await act(async () => { await result.current.processSale(); });

  expect(showClientModal).toHaveBeenCalled();
  expect(showToast).toHaveBeenCalledWith(expect.stringContaining('$50'));
});

it('NO re-sincroniza el catálogo: el tope no es un problema de catálogo', async () => {
  mockCrearFacturaPOS.mockRejectedValue({
    status: 400,
    data: { code: 'IDENTIFICACION_REQUERIDA', error: 'supera los $50', total: '60.00', tope: 50 },
  });

  const { result, preloadCatalog, removeItemsByIndices } = montar();
  await act(async () => { await result.current.processSale(); });

  expect(preloadCatalog).not.toHaveBeenCalled();
  expect(removeItemsByIndices).not.toHaveBeenCalled();
});

it('cierra el modal de pago para que se vea el de cliente', async () => {
  mockCrearFacturaPOS.mockRejectedValue({
    status: 400,
    data: { code: 'IDENTIFICACION_REQUERIDA', error: 'supera los $50', total: '60.00', tope: 50 },
  });

  const { result } = montar();
  act(() => { result.current.setShowModal(true); });
  await act(async () => { await result.current.processSale(); });

  expect(result.current.showModal).toBe(false);
});

it('un 400 SIN ese code sigue yendo por la recuperación de catálogo stale', async () => {
  mockCrearFacturaPOS.mockRejectedValue({
    status: 400, message: 'No Presentacion matches the given query',
  });

  const { result, preloadCatalog, showClientModal } = montar();
  await act(async () => { await result.current.processSale(); });

  expect(preloadCatalog).toHaveBeenCalled();
  expect(showClientModal).not.toHaveBeenCalled();
});
