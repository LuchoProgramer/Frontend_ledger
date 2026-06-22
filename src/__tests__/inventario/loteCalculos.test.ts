/**
 * Ajuste por Lote — cálculos puros para mostrar el stock actual de la sucursal
 * seleccionada y el "quedará en: X" en vivo dentro del formulario.
 *
 * Motivado por feedback de producción: al elegir tipo (Entrada/Salida) y
 * cantidad, la pantalla no decía de cuánto stock se partía en esa sucursal, ni
 * en cuánto quedaría. El dato (desglose por sucursal) ya viene del backend.
 */
import {
  stockEnSucursal,
  calcularStockResultante,
  type DesgloseItem,
} from '@/app/inventario/ajustes/lote/_calculos';

const desglose: DesgloseItem[] = [
  { sucursal: 1, sucursal_nombre: 'Centro', cantidad: 10 },
  { sucursal: 2, sucursal_nombre: 'Norte', cantidad: 3 },
];

describe('stockEnSucursal', () => {
  it('devuelve el stock de la sucursal cuando existe en el desglose', () => {
    expect(stockEnSucursal(desglose, 1)).toBe(10);
    expect(stockEnSucursal(desglose, 2)).toBe(3);
  });

  it('devuelve 0 cuando el producto no tiene stock registrado en esa sucursal', () => {
    expect(stockEnSucursal(desglose, 99)).toBe(0);
  });

  it('devuelve 0 cuando el desglose es undefined o vacío', () => {
    expect(stockEnSucursal(undefined, 1)).toBe(0);
    expect(stockEnSucursal([], 1)).toBe(0);
  });
});

describe('calcularStockResultante', () => {
  it('ENTRADA suma la cantidad al stock actual', () => {
    expect(calcularStockResultante(10, 'ENTRADA', 2)).toBe(12);
  });

  it('SALIDA resta la cantidad del stock actual', () => {
    expect(calcularStockResultante(10, 'SALIDA', 2)).toBe(8);
  });

  it('una SALIDA mayor al stock da un resultado negativo (la UI lo señala como inválido)', () => {
    expect(calcularStockResultante(3, 'SALIDA', 5)).toBe(-2);
  });

  it('una cantidad no numérica deja el stock sin cambios', () => {
    expect(calcularStockResultante(10, 'ENTRADA', NaN)).toBe(10);
  });
});
