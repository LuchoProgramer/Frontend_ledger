/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { LineaEnEdicion } from '@/lib/hooks/useImportCompra';

const mockGetProductos = jest.fn();
jest.mock('@/lib/api', () => ({
  getApiClient: () => ({ getProductos: mockGetProductos }),
}));

import ImportLineaRow from '@/app/compras/importar/ImportLineaRow';

const base: LineaEnEdicion = {
  codigo: 'AG005',
  descripcion: 'Fosforos Caja x20',
  cantidad_xml: '2',
  precio: '10',
  total: '20',
  estado: 'sin_match',
  producto_sugerido: null,
  // Ninguno de los 5 candidatos por nombre coincide -- caso real que motiva
  // el buscador: el nombre del proveedor no se parece al del catálogo.
  candidatos: [{ id: 9, nombre: 'Otro producto sin relación' }],
  factor_empaque: '1',
  accion: null,
  productoIdSeleccionado: null,
  cantidadResuelta: 2,
  factorEmpaqueEditado: 1,
  guardarCodigo: false,
  nuevoProducto: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ImportLineaRow — buscador de catálogo completo', () => {
  it('el link "Buscar en catálogo" revela un campo de texto', () => {
    render(
      <table><tbody>
        <ImportLineaRow linea={base} onCambiar={() => {}} onCrearNuevo={() => {}} />
      </tbody></table>
    );
    expect(screen.queryByPlaceholderText(/buscar producto/i)).toBeNull();
    fireEvent.click(screen.getByText(/buscar en catálogo/i));
    expect(screen.getByPlaceholderText(/buscar producto/i)).toBeTruthy();
  });

  it('escribir en el buscador llama a getProductos (debounced) y muestra resultados', async () => {
    mockGetProductos.mockResolvedValue({
      results: [{ id: 42, nombre: 'Trident Mediano Real' }],
    });
    render(
      <table><tbody>
        <ImportLineaRow linea={base} onCambiar={() => {}} onCrearNuevo={() => {}} />
      </tbody></table>
    );
    fireEvent.click(screen.getByText(/buscar en catálogo/i));
    fireEvent.change(screen.getByPlaceholderText(/buscar producto/i), {
      target: { value: 'trident' },
    });

    act(() => { jest.advanceTimersByTime(500); });
    await waitFor(() => expect(mockGetProductos).toHaveBeenCalledWith({ search: 'trident', page_size: 8 }));
    await waitFor(() => expect(screen.getByText('Trident Mediano Real')).toBeTruthy());
  });

  it('elegir un resultado de la búsqueda mapea la línea a ese producto', async () => {
    mockGetProductos.mockResolvedValue({
      results: [{ id: 42, nombre: 'Trident Mediano Real' }],
    });
    const onCambiar = jest.fn();
    render(
      <table><tbody>
        <ImportLineaRow linea={base} onCambiar={onCambiar} onCrearNuevo={() => {}} />
      </tbody></table>
    );
    fireEvent.click(screen.getByText(/buscar en catálogo/i));
    fireEvent.change(screen.getByPlaceholderText(/buscar producto/i), {
      target: { value: 'trident' },
    });
    act(() => { jest.advanceTimersByTime(500); });
    await waitFor(() => expect(screen.getByText('Trident Mediano Real')).toBeTruthy());

    fireEvent.click(screen.getByText('Trident Mediano Real'));

    expect(onCambiar).toHaveBeenCalledWith('AG005', {
      accion: 'mapear', productoIdSeleccionado: 42,
    });
  });
});
