/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react';
import { useImportCompra } from '@/lib/hooks/useImportCompra';

const mockPreview = jest.fn();
const mockConfirmar = jest.fn();

jest.mock('@/lib/api', () => ({
  getApiClient: () => ({
    previewImportarCompra: (...args: any[]) => mockPreview(...args),
    confirmarImportarCompra: (...args: any[]) => mockConfirmar(...args),
  }),
}));

describe('useImportCompra', () => {
  beforeEach(() => {
    mockPreview.mockReset();
    mockConfirmar.mockReset();
  });

  it('carga las lineas del preview y arranca en el paso mapear', async () => {
    mockPreview.mockResolvedValue({
      proveedor: { existe: false, id: null, ruc: '1790011674001', razon_social: 'Prov' },
      cabecera: { numero_factura: '001-001-000000123', fecha_emision: '2026-07-15',
        total_sin_impuestos: '100.00', total_con_impuestos: '112.00' },
      lineas: [
        { codigo: 'AG005', descripcion: 'Fosforos', cantidad_xml: '2', precio: '10',
          total: '20', estado: 'sin_match', producto_sugerido: null, candidatos: [], factor_empaque: '1' },
      ],
    });

    const { result } = renderHook(() => useImportCompra());

    await act(async () => {
      await result.current.buscar('1507202601179001167400120010010000001231234567813', 1);
    });

    expect(result.current.paso).toBe('mapear');
    expect(result.current.lineas).toHaveLength(1);
    expect(result.current.lineas[0].codigo).toBe('AG005');
  });

  it('bloquea confirmar si hay lineas sin resolver', async () => {
    mockPreview.mockResolvedValue({
      proveedor: { existe: false, id: null, ruc: '1790011674001', razon_social: 'Prov' },
      cabecera: { numero_factura: 'x', fecha_emision: '2026-07-15',
        total_sin_impuestos: '20.00', total_con_impuestos: '22.00' },
      lineas: [
        { codigo: 'AG005', descripcion: 'Fosforos', cantidad_xml: '2', precio: '10',
          total: '20', estado: 'sin_match', producto_sugerido: null, candidatos: [], factor_empaque: '1' },
      ],
    });

    const { result } = renderHook(() => useImportCompra());
    await act(async () => {
      await result.current.buscar('clave', 1);
    });

    expect(result.current.puedeConfirmar).toBe(false);
    expect(mockConfirmar).not.toHaveBeenCalled();
  });

  it('permite confirmar cuando todas las lineas estan resueltas y el total cuadra', async () => {
    mockPreview.mockResolvedValue({
      proveedor: { existe: false, id: null, ruc: '1790011674001', razon_social: 'Prov' },
      cabecera: { numero_factura: 'x', fecha_emision: '2026-07-15',
        total_sin_impuestos: '20.00', total_con_impuestos: '22.00' },
      lineas: [
        { codigo: 'AG005', descripcion: 'Fosforos', cantidad_xml: '2', precio: '10',
          total: '20', estado: 'ok', producto_sugerido: { id: 1, nombre: 'Fosforos' },
          candidatos: [], factor_empaque: '1' },
      ],
    });
    mockConfirmar.mockResolvedValue({ success: true, compra_id: 5, resueltas: 1, omitidas: 0 });

    const { result } = renderHook(() => useImportCompra());
    await act(async () => {
      await result.current.buscar('clave', 1);
    });

    expect(result.current.puedeConfirmar).toBe(true);

    await act(async () => {
      await result.current.confirmar();
    });

    expect(mockConfirmar).toHaveBeenCalledWith(expect.objectContaining({
      clave_acceso: 'clave',
      sucursal_id: 1,
    }));
    expect(result.current.compraCreadaId).toBe(5);
  });

  it('ignora una segunda llamada a confirmar mientras la primera sigue en vuelo', async () => {
    mockPreview.mockResolvedValue({
      proveedor: { existe: false, id: null, ruc: '1790011674001', razon_social: 'Prov' },
      cabecera: { numero_factura: 'x', fecha_emision: '2026-07-15',
        total_sin_impuestos: '20.00', total_con_impuestos: '22.00' },
      lineas: [
        { codigo: 'AG005', descripcion: 'Fosforos', cantidad_xml: '2', precio: '10',
          total: '20', estado: 'ok', producto_sugerido: { id: 1, nombre: 'Fosforos' },
          candidatos: [], factor_empaque: '1' },
      ],
    });
    let resolverConfirmar: (v: any) => void;
    mockConfirmar.mockReturnValue(new Promise((resolve) => { resolverConfirmar = resolve; }));

    const { result } = renderHook(() => useImportCompra());
    await act(async () => {
      await result.current.buscar('clave', 1);
    });

    // Dispara confirmar() dos veces sin esperar la primera (doble click/tap).
    act(() => {
      result.current.confirmar();
      result.current.confirmar();
    });

    await act(async () => {
      resolverConfirmar!({ success: true, compra_id: 5, resueltas: 1, omitidas: 0 });
      await Promise.resolve();
    });

    expect(mockConfirmar).toHaveBeenCalledTimes(1);
  });
});
