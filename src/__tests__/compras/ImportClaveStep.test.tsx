/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
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
});
