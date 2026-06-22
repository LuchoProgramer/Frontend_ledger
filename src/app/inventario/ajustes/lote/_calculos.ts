// Cálculos puros para el formulario de Ajuste por Lote:
// - stock actual de la sucursal seleccionada (desde el desglose del backend)
// - "quedará en: X" según el tipo de ajuste y la cantidad ingresada.

export interface DesgloseItem {
  sucursal: number;
  sucursal_nombre: string;
  cantidad: number;
}

export type TipoAjuste = 'ENTRADA' | 'SALIDA';

/** Stock actual del producto en una sucursal; 0 si no hay registro. */
export function stockEnSucursal(
  desglose: DesgloseItem[] | undefined,
  sucursalId: number,
): number {
  const item = desglose?.find((d) => d.sucursal === sucursalId);
  return item ? item.cantidad : 0;
}

/** Stock que quedará tras aplicar el ajuste. ENTRADA suma, SALIDA resta. */
export function calcularStockResultante(
  stockActual: number,
  tipo: TipoAjuste,
  cantidad: number,
): number {
  if (Number.isNaN(cantidad)) return stockActual;
  return tipo === 'ENTRADA' ? stockActual + cantidad : stockActual - cantidad;
}
