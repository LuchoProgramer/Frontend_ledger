// Tipos y estilos compartidos entre la tabla de Movimientos (Kardex) y su modal de detalle.

export interface Movimiento {
  id: number;
  producto_nombre: string;
  sucursal_nombre: string;
  tipo_movimiento: string;
  cantidad: number;
  saldo_posterior?: number | null;
  motivo: string;
  usuario_nombre: string | null;
  fecha: string;
}

export const TIPO_STYLES: Record<string, string> = {
  COMPRA: 'bg-green-100 text-green-800',
  VENTA: 'bg-blue-100 text-blue-800',
  AJUSTE: 'bg-yellow-100 text-yellow-800',
  TRANSFERENCIA_ENTRADA: 'bg-purple-100 text-purple-800',
  TRANSFERENCIA_SALIDA: 'bg-orange-100 text-orange-800',
};

export const TIPO_LABELS: Record<string, string> = {
  COMPRA: 'Compra',
  VENTA: 'Venta',
  AJUSTE: 'Ajuste',
  TRANSFERENCIA_ENTRADA: 'Transf. Entrada',
  TRANSFERENCIA_SALIDA: 'Transf. Salida',
};
