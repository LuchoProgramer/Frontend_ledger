import 'fake-indexeddb/auto';
import { posDB } from '@/lib/db/posDB';

// Mock del apiClient
const mockGetProductos = jest.fn();
const mockGetBulkPresentaciones = jest.fn();
const mockGetCategorias = jest.fn();
const mockGetCombos = jest.fn();
const mockGetComboOpciones = jest.fn();

jest.mock('@/lib/api', () => ({
  getApiClient: () => ({
    getProductos: mockGetProductos,
    getBulkPresentaciones: mockGetBulkPresentaciones,
    getCategorias: mockGetCategorias,
    getCombos: mockGetCombos,
    getComboOpciones: mockGetComboOpciones,
  }),
}));

// Función pura extraída del hook para poder testearla sin React
import { preloadCatalogFn } from '@/app/pos/hooks/useOfflineCatalog';

const apiClient = {
  getProductos: mockGetProductos,
  getBulkPresentaciones: mockGetBulkPresentaciones,
  getCategorias: mockGetCategorias,
  getCombos: mockGetCombos,
  getComboOpciones: mockGetComboOpciones,
};

beforeEach(async () => {
  await posDB.productos.clear();
  await posDB.categorias.clear();
  await posDB.combos.clear();
  jest.clearAllMocks();
  // Default: bulk vacío salvo que el test lo sobreescriba
  mockGetBulkPresentaciones.mockResolvedValue({ data: {} });
});

describe('preloadCatalogFn', () => {
  it('guarda productos en Dexie desde API paginada', async () => {
    mockGetProductos
      .mockResolvedValueOnce({ results: [
        { id: 1, nombre: 'Cono', impuesto_porcentaje: 15, activo: true },
        { id: 2, nombre: 'Agua', impuesto_porcentaje: 0, activo: true },
      ], next: null })
    mockGetCategorias.mockResolvedValue({ data: [{ id: 1, nombre: 'Bebidas' }] });
    mockGetCombos.mockResolvedValue({ results: [], next: null });

    await preloadCatalogFn(apiClient as any, 10);

    const prods = await posDB.productos.where('sucursal_id').equals(10).toArray();
    expect(prods).toHaveLength(2);
    expect(prods[0].nombre).toBe('Cono');

    const cats = await posDB.categorias.toArray();
    expect(cats).toHaveLength(1);
    expect(cats[0].nombre).toBe('Bebidas');
  });

  it('adjunta las presentaciones del endpoint bulk a cada producto', async () => {
    mockGetProductos.mockResolvedValueOnce({ results: [
      { id: 1, nombre: 'Cono', impuesto_porcentaje: 15, activo: true },
      { id: 2, nombre: 'Agua', impuesto_porcentaje: 0, activo: true },
    ], next: null });
    mockGetCategorias.mockResolvedValue({ data: [] });
    mockGetCombos.mockResolvedValue({ results: [], next: null });
    mockGetBulkPresentaciones.mockResolvedValue({ data: {
      '1': [
        { id: 11, nombre_presentacion: 'Unidad', cantidad: 1, precio: '0.50', canal: 'LOCAL', canal_display: 'Venta Local / POS' },
        { id: 12, nombre_presentacion: 'Six Pack', cantidad: 6, precio: '2.50', canal: 'LOCAL', canal_display: 'Venta Local / POS' },
      ],
    } });

    await preloadCatalogFn(apiClient as any, 10);

    expect(mockGetBulkPresentaciones).toHaveBeenCalledWith(10);
    const prods = await posDB.productos.where('sucursal_id').equals(10).toArray();
    const cono = prods.find(p => p.id === 1)!;
    const agua = prods.find(p => p.id === 2)!;
    expect(cono.presentaciones).toHaveLength(2);
    expect(cono.presentaciones![0].nombre_presentacion).toBe('Unidad');
    // Producto sin entrada en el bulk → array vacío, no undefined
    expect(agua.presentaciones).toEqual([]);
  });

  it('precarga combos con opciones de slot embebidas', async () => {
    mockGetProductos.mockResolvedValue({ results: [], next: null });
    mockGetCategorias.mockResolvedValue({ data: [] });
    mockGetCombos.mockResolvedValueOnce({
      results: [{
        id: 7, nombre: 'Combo Clásico', precio: '10.00', sucursal: 10,
        slots: [{ id: 3, nombre: 'Bebida', obligatorio: true, orden: 1 }],
      }],
      next: null,
    });
    mockGetComboOpciones.mockResolvedValue([
      { id: 101, nombre: 'Coca-Cola', codigo: 'CC', stock: 50 },
    ]);

    await preloadCatalogFn(apiClient as any, 10);

    const combo = await posDB.combos.get(7);
    expect(combo?.nombre).toBe('Combo Clásico');
    expect(combo?.slots[0].opciones).toHaveLength(1);
    expect(combo?.slots[0].opciones[0].nombre).toBe('Coca-Cola');
  });

  it('no lanza si la API falla — silencioso', async () => {
    mockGetProductos.mockRejectedValue(new Error('Network error'));
    mockGetCategorias.mockResolvedValue({ data: [] });
    mockGetCombos.mockResolvedValue({ results: [], next: null });

    await expect(preloadCatalogFn(apiClient as any, 10)).resolves.not.toThrow();
  });
});
