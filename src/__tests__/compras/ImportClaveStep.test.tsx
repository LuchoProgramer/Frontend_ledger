/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ImportClaveStep from '@/app/compras/importar/ImportClaveStep';

describe('ImportClaveStep', () => {
  it('deshabilita el boton de buscar y avisa mientras cargan los catalogos', () => {
    render(
      <ImportClaveStep
        sucursales={[]}
        cargandoCatalogos
        buscando={false}
        error={null}
        onBuscar={() => {}}
      />
    );
    expect(screen.getByText(/cargando sucursales/i)).toBeTruthy();
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('muestra el error cuando fallo la carga de catalogos, no un select vacio silencioso', () => {
    render(
      <ImportClaveStep
        sucursales={[]}
        cargandoCatalogos={false}
        buscando={false}
        error="No se pudieron cargar sucursales/categorías/impuestos. Reintenta recargando la página."
        onBuscar={() => {}}
      />
    );
    expect(screen.getByText(/no se pudieron cargar/i)).toBeTruthy();
  });

  it('habilita el boton cuando las sucursales llegan DESPUES del primer render (caso real: siempre arrancan en [])', () => {
    const { rerender } = render(
      <ImportClaveStep
        sucursales={[]}
        cargandoCatalogos
        buscando={false}
        error={null}
        onBuscar={() => {}}
      />
    );

    // El hook del padre (useComprasCatalogos) termina de cargar y re-renderiza
    // con la lista real -- esto es lo que pasa siempre en producción, `sucursales`
    // nunca llega poblado en el primer render.
    rerender(
      <ImportClaveStep
        sucursales={[{ id: 1, nombre: 'Matriz' }]}
        cargandoCatalogos={false}
        buscando={false}
        error={null}
        onBuscar={() => {}}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/49 dígitos/i), {
      target: { value: '0'.repeat(49) },
    });

    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(false);
  });

  it('onBuscar recibe el sucursalId real, no null, tras la carga tardia', () => {
    const onBuscar = jest.fn();
    const { rerender } = render(
      <ImportClaveStep
        sucursales={[]}
        cargandoCatalogos
        buscando={false}
        error={null}
        onBuscar={onBuscar}
      />
    );
    rerender(
      <ImportClaveStep
        sucursales={[{ id: 7, nombre: 'Sucursal Norte' }]}
        cargandoCatalogos={false}
        buscando={false}
        error={null}
        onBuscar={onBuscar}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/49 dígitos/i), {
      target: { value: '1'.repeat(49) },
    });
    fireEvent.click(screen.getByRole('button'));

    expect(onBuscar).toHaveBeenCalledWith('1'.repeat(49), 7);
  });
});
