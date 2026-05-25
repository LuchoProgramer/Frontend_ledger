import Dexie, { Table } from 'dexie';
import { Producto, Categoria } from '@/lib/types/productos';

export type ProductoDB = Producto & { sucursal_id: number };
export type CategoriaDB = Categoria;

export interface ComboDB {
  id: number;
  sucursal_id: number;
  nombre: string;
  precio: number;
  slots: Array<{
    id: number;
    nombre: string;
    obligatorio: boolean;
    orden: number;
    opciones: Array<{ id: number; nombre: string; codigo: string; stock: number }>;
  }>;
}

export interface VentaOfflineDB {
  id?: number;
  turno_id: number;
  sucursal_id: number;
  payload: string;
  receipt_data: string;
  estado: 'PENDIENTE' | 'SINCRONIZADA' | 'ERROR_SYNC';
  created_at: number;
  error_msg?: string;
}

class PosDatabase extends Dexie {
  productos!: Table<ProductoDB>;
  categorias!: Table<CategoriaDB>;
  combos!: Table<ComboDB>;
  ventas_offline!: Table<VentaOfflineDB>;

  constructor() {
    super('lx_pos');
    this.version(1).stores({
      productos:      'id, sucursal_id, categoria_id, nombre',
      categorias:     'id',
      combos:         'id, sucursal_id',
      ventas_offline: '++id, estado, turno_id, created_at',
    });
  }
}

export const posDB = new PosDatabase();
