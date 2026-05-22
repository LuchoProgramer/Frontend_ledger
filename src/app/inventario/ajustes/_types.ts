export interface DesgloseItem {
  id: number;
  sucursal: number;
  sucursal_nombre: string;
  cantidad: number;
}

export interface ProductoConStock {
  id: number;
  nombre: string;
  codigo_producto: string;
  stock_total_global: number;
  desglose: DesgloseItem[];
}

export interface Sucursal {
  id: number;
  nombre: string;
}

export interface AjusteReceipt {
  productoNombre: string;
  productoCodigo: string;
  sucursalNombre: string;
  stockAnterior: number;
  stockNuevo: number;
  diferencia: number;
  tipo: 'ENTRADA' | 'SALIDA';
  motivo: string;
  usuario: string;
  fecha: string;
}

export type Step = 'search' | 'sucursal' | 'form' | 'confirm' | 'receipt';

export const STEP_LABELS: Record<Exclude<Step, 'receipt'>, string> = {
  search: 'Buscar',
  sucursal: 'Sucursal',
  form: 'Cantidad',
  confirm: 'Confirmar',
};

export const STEP_ORDER: Exclude<Step, 'receipt'>[] = ['search', 'sucursal', 'form', 'confirm'];
