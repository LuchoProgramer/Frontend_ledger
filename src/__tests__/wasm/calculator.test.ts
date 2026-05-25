import { calcularTotalesJS, CartItemInput } from '@/lib/wasm/calculator';

describe('calcularTotalesJS — algoritmo IVA SRI', () => {
  test('IVA 15%: total=25.00, subtotal=21.74, iva=3.26', () => {
    const items: CartItemInput[] = [
      { precio_pvp: '12.50', cantidad: 2, tasa_iva: '15' },
    ];
    const result = calcularTotalesJS(items);
    expect(result.total_con_iva).toBe('25.00');
    expect(result.subtotal_sin_iva).toBe('21.74');
    expect(result.total_iva).toBe('3.26');
    expect(result.lineas).toHaveLength(1);
    expect(result.lineas[0].total).toBe('25.00');
  });

  test('IVA 0%: total==subtotal, iva==0.00', () => {
    const items: CartItemInput[] = [
      { precio_pvp: '5.00', cantidad: 1, tasa_iva: '0' },
    ];
    const result = calcularTotalesJS(items);
    expect(result.total_con_iva).toBe('5.00');
    expect(result.subtotal_sin_iva).toBe('5.00');
    expect(result.total_iva).toBe('0.00');
  });

  test('Mix IVA 15% + IVA 0%: totales correctos (caso del spec)', () => {
    const items: CartItemInput[] = [
      { precio_pvp: '12.50', cantidad: 2, tasa_iva: '15' },
      { precio_pvp: '5.00',  cantidad: 1, tasa_iva: '0'  },
    ];
    const result = calcularTotalesJS(items);
    expect(result.total_con_iva).toBe('30.00');
    expect(result.subtotal_sin_iva).toBe('26.74');
    expect(result.total_iva).toBe('3.26');
  });

  test('Invariante SRI: subtotal + iva == total para cada línea', () => {
    const items: CartItemInput[] = [
      { precio_pvp: '1.99', cantidad: 3, tasa_iva: '15' },
      { precio_pvp: '0.50', cantidad: 7, tasa_iva: '12' },
    ];
    const result = calcularTotalesJS(items);
    for (const linea of result.lineas) {
      const sub = parseFloat(linea.subtotal);
      const iva = parseFloat(linea.valor_iva);
      const tot = parseFloat(linea.total);
      expect(Math.round((sub + iva) * 100)).toBe(Math.round(tot * 100));
    }
  });

  test('Carrito vacío: devuelve ceros', () => {
    const result = calcularTotalesJS([]);
    expect(result.total_con_iva).toBe('0.00');
    expect(result.subtotal_sin_iva).toBe('0.00');
    expect(result.total_iva).toBe('0.00');
    expect(result.lineas).toHaveLength(0);
  });

  test('IVA 12%: invariante SRI se cumple', () => {
    const items: CartItemInput[] = [
      { precio_pvp: '1.99', cantidad: 1, tasa_iva: '12' },
    ];
    const result = calcularTotalesJS(items);
    const linea = result.lineas[0];
    const sub = parseFloat(linea.subtotal);
    const iva = parseFloat(linea.valor_iva);
    const tot = parseFloat(linea.total);
    expect(Math.round((sub + iva) * 100)).toBe(Math.round(tot * 100));
    expect(result.total_con_iva).toBe('1.99');
  });
});
