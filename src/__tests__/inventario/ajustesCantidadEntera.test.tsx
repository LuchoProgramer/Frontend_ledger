/** @jest-environment jsdom */
// Regresión del incidente 2026-07-05 (la_huequita): el input de ajustes con
// step="0.01" permitió cantidades 6.99/0.99 (un tick accidental del spinner)
// → stocks con .01 arrastrado. Los ajustes son por unidades enteras.
import React from 'react';
import { render, screen } from '@testing-library/react';
import { validarCantidadAjuste } from '@/app/inventario/ajustes/_validacion';
import StepForm from '@/app/inventario/ajustes/components/StepForm';
import type { ProductoConStock } from '@/app/inventario/ajustes/_types';

describe('validarCantidadAjuste', () => {
  it('rechaza cantidades con decimales (caso real 6.99)', () => {
    expect(validarCantidadAjuste('6.99')).toMatch(/entero/i);
    expect(validarCantidadAjuste('0.99')).toMatch(/entero/i);
  });

  it('rechaza vacío o no numérico', () => {
    expect(validarCantidadAjuste('')).toMatch(/cantidad válida/i);
    expect(validarCantidadAjuste('abc')).toMatch(/cantidad válida/i);
  });

  it('rechaza negativos', () => {
    expect(validarCantidadAjuste('-3')).not.toBeNull();
  });

  it('rechaza cero por defecto (flujo lote: la diferencia debe ser > 0)', () => {
    expect(validarCantidadAjuste('0')).not.toBeNull();
  });

  it('acepta cero con permitirCero (flujo individual: dejar stock en 0 es válido)', () => {
    expect(validarCantidadAjuste('0', { permitirCero: true })).toBeNull();
  });

  it('acepta enteros', () => {
    expect(validarCantidadAjuste('7')).toBeNull();
    expect(validarCantidadAjuste('7.00')).toBeNull();
  });
});

describe('StepForm — input de cantidad', () => {
  const producto: ProductoConStock = {
    id: 144, nombre: 'CUBATA', codigo_producto: 'CUB-1',
    stock_total_global: 16, desglose: [],
  };

  it('usa step=1 e inputMode numeric (el spinner no debe mover centésimas)', () => {
    render(
      <StepForm
        selectedProduct={producto}
        selectedSucursal={{ id: 1, nombre: 'Sucursal 1', currentStock: 16 }}
        targetQty="9"
        setTargetQty={() => {}}
        motivo=""
        setMotivo={() => {}}
        diff={-7}
        formError=""
        setFormError={() => {}}
        onBack={() => {}}
        onReview={() => {}}
      />,
    );
    const input = screen.getByPlaceholderText('Ej: 16');
    expect(input.getAttribute('step')).toBe('1');
    expect(input.getAttribute('inputmode')).toBe('numeric');
  });
});
