// Decide qué ítems del carrito quedaron con un presentacion_id huérfano
// (ausente del catálogo fresco). Los combos se ignoran: su producto/presentacion
// son virtuales (id === combo.id) y nunca están en el catálogo de productos.

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
