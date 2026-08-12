/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import ImportLineaRow from '@/app/compras/importar/ImportLineaRow';
import type { LineaEnEdicion } from '@/lib/hooks/useImportCompra';

const base: LineaEnEdicion = {
  codigo: 'AG005',
  descripcion: 'Fosforos Caja x20',
  cantidad_xml: '2',
  precio: '10',
  total: '20',
  estado: 'sin_match',
  producto_sugerido: null,
  candidatos: [{ id: 9, nombre: 'Otro producto' }],
  factor_empaque: '1',
  accion: null,
  productoIdSeleccionado: null,
  cantidadResuelta: 2,
  factorEmpaqueEditado: 1,
  guardarCodigo: false,
  nuevoProducto: null,
};

describe('ImportLineaRow — feedback visual de la resolucion', () => {
  it('muestra que decision quedo registrada cuando la linea se resuelve como "crear"', () => {
    const linea: LineaEnEdicion = {
      ...base,
      accion: 'crear',
      nuevoProducto: { nombre: 'Fosforos Caja', categoria_id: 1, impuesto_id: null, precio_venta: 15, activo: true },
    };
    render(
      <table><tbody>
        <ImportLineaRow linea={linea} onCambiar={() => {}} onCrearNuevo={() => {}} />
      </tbody></table>
    );
    expect(screen.getByText(/nuevo: fosforos caja/i)).toBeTruthy();
    // ya no debe mostrar el selector de "producto existente" ni el botón "Crear nuevo"
    expect(screen.queryByText(/crear nuevo/i)).toBeNull();
  });

  it('muestra que decision quedo registrada cuando la linea se resuelve como "omitir"', () => {
    const linea: LineaEnEdicion = { ...base, accion: 'omitir' };
    render(
      <table><tbody>
        <ImportLineaRow linea={linea} onCambiar={() => {}} onCrearNuevo={() => {}} />
      </tbody></table>
    );
    expect(screen.getByText(/omitida/i)).toBeTruthy();
    expect(screen.queryByText(/crear nuevo/i)).toBeNull();
  });
});
