/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CrearProductoInline from '@/app/compras/importar/CrearProductoInline';

const categorias = [{ id: 1, nombre: 'General' }];
const impuestos = [{ id: 1, nombre: 'IVA 15%', porcentaje: '15.00', codigo: '2' }];

describe('CrearProductoInline', () => {
  it('guarda con activo=true por default (no marcar el checkbox)', () => {
    const onGuardar = jest.fn();
    render(
      <CrearProductoInline
        categorias={categorias}
        impuestos={impuestos}
        onGuardar={onGuardar}
        onCancelar={() => {}}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/nombre del producto/i), {
      target: { value: 'Fósforos Caja' },
    });
    fireEvent.change(screen.getByPlaceholderText(/precio de venta/i), {
      target: { value: '15' },
    });
    fireEvent.click(screen.getByText(/guardar/i));

    expect(onGuardar).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: 'Fósforos Caja', activo: true })
    );
  });

  it('marcar "No se vende (uso interno)" guarda con activo=false', () => {
    const onGuardar = jest.fn();
    render(
      <CrearProductoInline
        categorias={categorias}
        impuestos={impuestos}
        onGuardar={onGuardar}
        onCancelar={() => {}}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/nombre del producto/i), {
      target: { value: 'UPS Forza NT-511' },
    });
    fireEvent.change(screen.getByPlaceholderText(/precio de venta/i), {
      target: { value: '29' },
    });
    fireEvent.click(screen.getByLabelText(/no se vende/i));
    fireEvent.click(screen.getByText(/guardar/i));

    expect(onGuardar).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: 'UPS Forza NT-511', activo: false })
    );
  });
});
