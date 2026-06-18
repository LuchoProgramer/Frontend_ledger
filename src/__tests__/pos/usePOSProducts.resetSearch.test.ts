/**
 * @jest-environment jsdom
 */
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

beforeEach(() => {
  jest.clearAllMocks();
  mockGetProductos.mockResolvedValue({ results: [] });
  mockGetCategorias.mockResolvedValue({ data: [] });
  mockBuscarCombos.mockResolvedValue([]);
});

describe('usePOSProducts.resetSearch', () => {
  it('limpia el texto de búsqueda y la categoría tras una venta', async () => {
    const { result } = renderHook(() => usePOSProducts(10));

    // La cajera busca un producto y filtra por categoría
    act(() => { result.current.handleSearch('coca'); });
    act(() => { result.current.handleSelectCategoria(5); });

    expect(result.current.searchTerm).toBe('coca');
    expect(result.current.selectedCategoria).toBe(5);

    // Tras cobrar, se resetea el buscador
    await act(async () => { result.current.resetSearch(); });

    expect(result.current.searchTerm).toBe('');
    expect(result.current.selectedCategoria).toBeNull();
  });

  it('recarga el catálogo completo (sin search ni categoria) al resetear', async () => {
    const { result } = renderHook(() => usePOSProducts(10));

    act(() => { result.current.handleSelectCategoria(5); });
    await waitFor(() => expect(mockGetProductos).toHaveBeenCalled());
    mockGetProductos.mockClear();

    await act(async () => { result.current.resetSearch(); });

    expect(mockGetProductos).toHaveBeenCalledTimes(1);
    const params = mockGetProductos.mock.calls[0][0];
    expect(params.search).toBe('');
    expect(params.categoria).toBeUndefined();
  });
});
