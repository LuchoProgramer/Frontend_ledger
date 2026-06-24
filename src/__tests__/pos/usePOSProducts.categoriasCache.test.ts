/**
 * @jest-environment jsdom
 */
import 'fake-indexeddb/auto';
import { renderHook, act, waitFor } from '@testing-library/react';

const mockGetProductos = jest.fn();
const mockGetCategorias = jest.fn();
const mockBuscarCombos = jest.fn();

jest.mock('@/lib/api', () => ({
  getApiClient: () => ({
    getProductos: mockGetProductos,
    getCategorias: mockGetCategorias,
    buscarCombos: mockBuscarCombos,
  }),
}));

import { usePOSProducts } from '@/app/pos/hooks/usePOSProducts';
import { posDB } from '@/lib/db/posDB';

beforeEach(async () => {
  jest.clearAllMocks();
  mockGetProductos.mockResolvedValue({ results: [] });
  mockGetCategorias.mockResolvedValue({ data: [] });
  mockBuscarCombos.mockResolvedValue([]);
  await posDB.categorias.clear();
});

describe('usePOSProducts.loadCategorias — caché en Dexie (T2.2)', () => {
  it('persiste en Dexie las categorías traídas del backend', async () => {
    mockGetCategorias.mockResolvedValue({
      data: [{ id: 1, nombre: 'Bebidas' }, { id: 2, nombre: 'Comidas' }],
    });
    const { result } = renderHook(() => usePOSProducts(10));

    await act(async () => { await result.current.loadCategorias(); });

    const cached = await posDB.categorias.toArray();
    expect(cached.map(c => c.nombre).sort()).toEqual(['Bebidas', 'Comidas']);
  });

  it('muestra primero las categorías cacheadas sin esperar al backend (stale)', async () => {
    await posDB.categorias.bulkPut([
      { id: 1, nombre: 'Bebidas' } as any,
      { id: 2, nombre: 'Comidas' } as any,
    ]);
    // El backend nunca resuelve: solo el cache puede poblar el estado
    mockGetCategorias.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => usePOSProducts(10));
    act(() => { result.current.loadCategorias(); });

    await waitFor(() => expect(result.current.categorias).toHaveLength(2));
    expect(result.current.categorias.map(c => c.nombre).sort()).toEqual(['Bebidas', 'Comidas']);
  });

  it('si el backend falla, conserva las categorías del cache', async () => {
    await posDB.categorias.bulkPut([{ id: 7, nombre: 'Postres' } as any]);
    mockGetCategorias.mockRejectedValue(new Error('network'));

    const { result } = renderHook(() => usePOSProducts(10));
    await act(async () => { await result.current.loadCategorias(); });

    expect(result.current.categorias).toHaveLength(1);
    expect(result.current.categorias[0].nombre).toBe('Postres');
  });
});
