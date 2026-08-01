/**
 * @jest-environment jsdom
 */
import 'fake-indexeddb/auto';
import { renderHook, act } from '@testing-library/react';
import { usePOSCart } from '@/app/pos/hooks/usePOSCart';

const addItem = (result: any, producto: any, presentacion: any) =>
  act(() => result.current.addPresentationToCart(producto, presentacion));

describe('usePOSCart — targetCartIndex stale tras cancelar "cambiar presentación"', () => {
  it('cancelar el modal de presentación resetea targetCartIndex', async () => {
    const { result } = renderHook(() => usePOSCart(1, () => {}, async () => undefined));
    addItem(result, { id: 1, nombre: 'A', stock: 10 }, { id: 11, precio: 1, cantidad: 1, nombre_presentacion: 'U' });
    addItem(result, { id: 2, nombre: 'B', stock: 10 }, { id: 22, precio: 1, cantidad: 1, nombre_presentacion: 'U' });

    await act(async () => {
      await result.current.handleCartItemClick(1, result.current.items[1]);
    });
    expect(result.current.targetCartIndex).toBe(1);

    act(() => result.current.cancelPresentationSelection());

    expect(result.current.targetCartIndex).toBeNull();
    expect(result.current.showPresModal).toBe(false);
  });

  it('cancelar + eliminar el item objetivo + agregar uno nuevo NO corrompe el carrito (regresión: crash en impuesto_porcentaje)', async () => {
    const { result } = renderHook(() => usePOSCart(1, () => {}, async () => undefined));
    addItem(result, { id: 1, nombre: 'A', stock: 10 }, { id: 11, precio: 1, cantidad: 1, nombre_presentacion: 'U' });
    addItem(result, { id: 2, nombre: 'B', stock: 10 }, { id: 22, precio: 1, cantidad: 1, nombre_presentacion: 'U' });

    // Cajera toca el item índice 1 para cambiar su presentación
    await act(async () => {
      await result.current.handleCartItemClick(1, result.current.items[1]);
    });

    // Cancela sin elegir presentación
    act(() => result.current.cancelPresentationSelection());

    // Elimina justo ese item (el carrito se achica: targetCartIndex=1 quedaría fuera de rango)
    act(() => result.current.removeFromCart(1));
    expect(result.current.items).toHaveLength(1);

    // Agrega un producto nuevo del catálogo
    await act(async () => {
      await result.current.addToCart({ id: 3, nombre: 'C', stock: 10, precio_default: 5 } as any);
    });

    expect(result.current.items).toHaveLength(2);
    // Ningún item del carrito debe quedar sin `producto` (antes: el item nuevo se escribía
    // sobre el índice stale via spread de `undefined`, perdiendo `producto` silenciosamente).
    for (const item of result.current.items as any[]) {
      expect(item.producto).toBeDefined();
    }
  });
});
