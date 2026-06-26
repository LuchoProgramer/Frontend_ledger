/**
 * @jest-environment jsdom
 */
import 'fake-indexeddb/auto';
import { renderHook, act } from '@testing-library/react';

const mockCrearFacturaPOS = jest.fn();
jest.mock('@/lib/api', () => ({ getApiClient: () => ({ crearFacturaPOS: mockCrearFacturaPOS }) }));

import { usePOSPayment } from '@/app/pos/hooks/usePOSPayment';
import { posDB } from '@/lib/db/posDB';
import { Turno } from '@/app/pos/types';

const turno: Turno = { id: 1, sucursal: 1, sucursal_nombre: 'S1', inicio_turno: '2026-06-25T00:00:00Z' } as Turno;

beforeAll(() => {
  // processSale usa crypto.randomUUID y window.open; jsdom no siempre los trae.
  if (!(global as any).crypto?.randomUUID) (global as any).crypto = { randomUUID: () => 'uuid-test' };
  window.open = jest.fn(() => null) as any;
});

beforeEach(async () => {
  jest.clearAllMocks();
  await posDB.productos.clear();
});

it('un 400 con presentacion huérfana → re-sync, quita el ítem y avisa', async () => {
  await posDB.productos.bulkPut([
    { id: 190, sucursal_id: 1, nombre: 'RON ZHUMIR', presentaciones: [{ id: 153 }] },
  ] as any);
  mockCrearFacturaPOS.mockRejectedValue({ status: 400, message: 'No Presentacion matches the given query' });

  const preloadCatalog = jest.fn().mockResolvedValue(undefined);
  const removeItemsByIndices = jest.fn();
  const showToast = jest.fn();

  const { result } = renderHook(() => usePOSPayment({
    items: [{ producto: { id: 190, nombre: 'RON ZHUMIR' }, presentacion: { id: 99999 }, cantidad: 1, precio: 16.5, isCombo: false } as any],
    client: { identificacion: '9999999999', razon_social: 'CF', email: '', direccion: '' },
    turno,
    totals: { subtotal: 16.5, total: 16.5, impuesto: 0 },
    onSaleComplete: () => {},
    showToast,
    preloadCatalog,
    removeItemsByIndices,
  }));

  act(() => result.current.setPaymentAmount('16.50'));
  act(() => result.current.addPayment());
  await act(async () => { await result.current.processSale(); });

  expect(preloadCatalog).toHaveBeenCalledWith(1);
  expect(removeItemsByIndices).toHaveBeenCalledWith([0]);
  expect(showToast).toHaveBeenCalledWith(expect.stringContaining('RON ZHUMIR'));
  expect(result.current.showModal).toBe(false);
});

it('un 400 sin ítem huérfano (error de negocio real) → muestra el mensaje, no toca el carrito', async () => {
  await posDB.productos.bulkPut([
    { id: 190, sucursal_id: 1, nombre: 'RON ZHUMIR', presentaciones: [{ id: 153 }] },
  ] as any);
  mockCrearFacturaPOS.mockRejectedValue({ status: 400, message: 'Stock insuficiente' });

  const preloadCatalog = jest.fn().mockResolvedValue(undefined);
  const removeItemsByIndices = jest.fn();
  const showToast = jest.fn();

  const { result } = renderHook(() => usePOSPayment({
    items: [{ producto: { id: 190, nombre: 'RON ZHUMIR' }, presentacion: { id: 153 }, cantidad: 1, precio: 16.5, isCombo: false } as any],
    client: { identificacion: '9999999999', razon_social: 'CF', email: '', direccion: '' },
    turno,
    totals: { subtotal: 16.5, total: 16.5, impuesto: 0 },
    onSaleComplete: () => {},
    showToast,
    preloadCatalog,
    removeItemsByIndices,
  }));

  act(() => result.current.setPaymentAmount('16.50'));
  act(() => result.current.addPayment());
  await act(async () => { await result.current.processSale(); });

  expect(removeItemsByIndices).not.toHaveBeenCalled();
  expect(showToast).toHaveBeenCalledWith('Stock insuficiente');
});
