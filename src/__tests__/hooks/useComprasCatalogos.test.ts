/** @jest-environment jsdom */
import { renderHook, waitFor } from '@testing-library/react';
import { useComprasCatalogos } from '@/lib/hooks/useComprasCatalogos';

const mockGetSucursalesList = jest.fn();
const mockGetCategorias = jest.fn();
const mockGetImpuestos = jest.fn();

jest.mock('@/lib/api', () => ({
  getApiClient: () => ({
    getSucursalesList: (...args: any[]) => mockGetSucursalesList(...args),
    getCategorias: (...args: any[]) => mockGetCategorias(...args),
    getImpuestos: (...args: any[]) => mockGetImpuestos(...args),
  }),
}));

describe('useComprasCatalogos', () => {
  beforeEach(() => {
    mockGetSucursalesList.mockReset();
    mockGetCategorias.mockReset();
    mockGetImpuestos.mockReset();
  });

  it('carga sucursales, categorias e impuestos y termina sin error', async () => {
    mockGetSucursalesList.mockResolvedValue({ results: [{ id: 1, nombre: 'Matriz' }] });
    mockGetCategorias.mockResolvedValue({ data: [{ id: 1, nombre: 'Bebidas' }] });
    mockGetImpuestos.mockResolvedValue({ data: [{ id: 1, nombre: 'IVA 15%' }] });

    const { result } = renderHook(() => useComprasCatalogos());

    expect(result.current.cargando).toBe(true);

    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.sucursales).toEqual([{ id: 1, nombre: 'Matriz' }]);
    expect(result.current.categorias).toEqual([{ id: 1, nombre: 'Bebidas' }]);
    expect(result.current.impuestos).toEqual([{ id: 1, nombre: 'IVA 15%' }]);
    expect(result.current.error).toBeNull();
  });

  it('si falla la carga, expone un error en vez de quedar en silencio con listas vacias', async () => {
    mockGetSucursalesList.mockRejectedValue(new Error('Network error'));
    mockGetCategorias.mockResolvedValue({ data: [] });
    mockGetImpuestos.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useComprasCatalogos());

    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.error).toBe(
      'No se pudieron cargar sucursales/categorías/impuestos. Reintenta recargando la página.'
    );
    expect(result.current.sucursales).toEqual([]);
  });
});
