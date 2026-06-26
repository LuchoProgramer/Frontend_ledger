// Reconciliación del carrito contra el catálogo offline (Dexie) tras una
// recuperación de catálogo: decide qué ítems quedaron con un presentacion_id
// huérfano y de dónde leer los ids válidos vigentes.

import { posDB } from '@/lib/db/posDB';

export interface ItemCarritoReconciliable {
  producto: { id: number; nombre: string };
  presentacion: { id: number };
  isCombo?: boolean;
}

export function reconciliarCarrito(
  items: ItemCarritoReconciliable[],
  idsPresentacionValidos: Set<number>,
): { indicesAQuitar: number[]; nombresAfectados: string[] } {
  const indicesAQuitar: number[] = [];
  const nombresAfectados: string[] = [];
  items.forEach((item, i) => {
    if (item.isCombo) return;
    if (!idsPresentacionValidos.has(item.presentacion.id)) {
      indicesAQuitar.push(i);
      nombresAfectados.push(item.producto.nombre);
    }
  });
  return { indicesAQuitar, nombresAfectados };
}

// Lee del catálogo offline (Dexie) el set de presentacion_id válidos de una sucursal.
// Las presentaciones vienen embebidas en cada producto (useOfflineCatalog las guarda así).
export async function idsPresentacionValidos(sucursalId: number): Promise<Set<number>> {
  const productos = await posDB.productos.where('sucursal_id').equals(sucursalId).toArray();
  const ids = new Set<number>();
  productos.forEach(p => (p.presentaciones ?? []).forEach(pr => ids.add(pr.id)));
  return ids;
}
