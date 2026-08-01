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

  it('confirmar presentación con índice stale que AHORA apunta a OTRO producto no corrompe ese otro item (regresión: la_huequita, "La presentación no pertenece al producto indicado")', async () => {
    const { result } = renderHook(() => usePOSCart(1, () => {}, async () => undefined));
    addItem(result, { id: 1, nombre: 'A', stock: 10 }, { id: 11, precio: 1, cantidad: 1, nombre_presentacion: 'U' });
    addItem(result, { id: 2, nombre: 'B', stock: 10 }, { id: 22, precio: 1, cantidad: 1, nombre_presentacion: 'U' });
    addItem(result, { id: 3, nombre: 'C', stock: 10 }, { id: 33, precio: 1, cantidad: 1, nombre_presentacion: 'U' });

    // Cajera toca el item B (índice 1) para cambiarle la presentación — el modal
    // queda abierto con targetCartIndex=1 y productToSelect=B.
    await act(async () => {
      await result.current.handleCartItemClick(1, result.current.items[1]);
    });
    expect(result.current.targetCartIndex).toBe(1);

    // Sin cancelar el modal, se elimina A (índice 0): el carrito se recorre y
    // el índice 1 ahora contiene C, no B. targetCartIndex sigue "válido" (existe
    // un item ahí) pero ya no es B.
    act(() => result.current.removeFromCart(0));
    expect(result.current.items.map((i: any) => i.producto.nombre)).toEqual(['B', 'C']);

    // La cajera confirma una nueva presentación para B (productToSelect sigue
    // siendo B), pero el índice stale ahora apunta a C.
    act(() => result.current.addPresentationToCart(
      { id: 2, nombre: 'B', stock: 10 } as any,
      { id: 222, precio: '2', cantidad: 1, nombre_presentacion: 'Media' } as any
    ));

    // C NO debe quedar con la presentación de B (eso es lo que el backend
    // rechaza con "La presentación no pertenece al producto indicado.") — cada
    // item del carrito debe seguir teniendo una presentación que pertenece
    // de verdad a su propio producto.
    for (const item of result.current.items as any[]) {
      expect(item.presentacion.id === 11 || item.presentacion.id === 22 || item.presentacion.id === 222 || item.presentacion.id === 33)
        .toBe(true);
    }
    const c = result.current.items.find((i: any) => i.producto.id === 3) as any;
    expect(c.presentacion.id).toBe(33);
    // La presentación nueva elegida para B debe existir en el carrito, asociada a B
    // (puede quedar como línea nueva en vez de fusionarse con la línea vieja de B —
    // eso es una mejora de UX pendiente, no la corrupción que rompía el checkout).
    const lineasB = (result.current.items as any[]).filter(i => i.producto.id === 2);
    expect(lineasB.some(i => i.presentacion.id === 222)).toBe(true);
  });
});
