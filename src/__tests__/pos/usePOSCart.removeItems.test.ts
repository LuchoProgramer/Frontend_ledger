/**
 * @jest-environment jsdom
 */
import 'fake-indexeddb/auto';
import { renderHook, act } from '@testing-library/react';
import { usePOSCart } from '@/app/pos/hooks/usePOSCart';

const addItem = (result: any, producto: any, presentacion: any) =>
  act(() => result.current.addPresentationToCart(producto, presentacion));

describe('usePOSCart.removeItemsByIndices', () => {
  it('quita los índices dados y conserva el resto', () => {
    const { result } = renderHook(() => usePOSCart(1, () => {}, async () => undefined));
    addItem(result, { id: 1, nombre: 'A', stock: 10 }, { id: 11, precio: 1, cantidad: 1, nombre_presentacion: 'U' });
    addItem(result, { id: 2, nombre: 'B', stock: 10 }, { id: 22, precio: 1, cantidad: 1, nombre_presentacion: 'U' });
    addItem(result, { id: 3, nombre: 'C', stock: 10 }, { id: 33, precio: 1, cantidad: 1, nombre_presentacion: 'U' });

    act(() => result.current.removeItemsByIndices([0, 2]));

    expect(result.current.items.map((i: any) => i.producto.nombre)).toEqual(['B']);
  });

  it('lista vacía de índices → no cambia nada', () => {
    const { result } = renderHook(() => usePOSCart(1, () => {}, async () => undefined));
    addItem(result, { id: 1, nombre: 'A', stock: 10 }, { id: 11, precio: 1, cantidad: 1, nombre_presentacion: 'U' });
    act(() => result.current.removeItemsByIndices([]));
    expect(result.current.items).toHaveLength(1);
  });
});
