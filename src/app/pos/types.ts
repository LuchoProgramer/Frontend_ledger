import { Producto, Presentacion } from '@/lib/types/productos';

export interface CartItem {
  producto: Producto;
  presentacion: Presentacion;
  cantidad: number;
  precio: number;
  subtotal: number;
  impuesto: number;
  total: number;
  isCombo?: boolean;
  comboId?: number;
  comboNombre?: string;
  slotSelections?: { slot_id: number; producto_id: number; producto_nombre: string }[];
}

export interface ComboSlotInfo {
  id: number;
  nombre: string;
  cantidad: number;
  obligatorio: boolean;
  orden: number;
}

export interface ComboResult {
  type: 'combo';
  id: number;
  nombre: string;
  precio: number;
  items: { producto_id: number; presentacion_id: number; cantidad: number }[];
  slots: ComboSlotInfo[];
}

export interface SlotOpcion {
  id: number;
  nombre: string;
  codigo: string;
  stock: number;
}

export interface ClientData {
  id?: number;
  tipo_identificacion?: string;
  identificacion: string;
  razon_social: string;
  email: string;
  direccion: string;
  telefono?: string;
}

export interface Turno {
  id: number;
  sucursal: number;
  sucursal_nombre: string;
  inicio_turno: string;
  impresora_activa?: boolean;
  comanda_automatica?: boolean;
  control_caja?: boolean;
  telefono_atencion?: string;
  factura_electronica_default?: boolean;
}

export interface Payment {
  codigo: string;
  descripcion: string;
  total: number;
  plazo?: number;
  unidad_tiempo?: string;
}

export type Tab = 'catalog' | 'cart';

export const CONSUMIDOR_FINAL: ClientData = {
  identificacion: '9999999999',
  razon_social: 'CONSUMIDOR FINAL',
  email: '',
  direccion: '',
};
