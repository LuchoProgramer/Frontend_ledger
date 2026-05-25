'use client';

import { useState } from 'react';
import { getApiClient } from '@/lib/api';
import { Producto } from '@/lib/types/productos';
import { posDB, ProductoDB, ComboDB } from '@/lib/db/posDB';

// Función pura exportada para poder testearla
export async function preloadCatalogFn(
  apiClient: ReturnType<typeof getApiClient>,
  sucursalId: number
): Promise<void> {
  try {
    // 1. Borrar datos viejos de esta sucursal
    await posDB.productos.where('sucursal_id').equals(sucursalId).delete();
    await posDB.combos.where('sucursal_id').equals(sucursalId).delete();

    // 2. Paginar productos
    let page = 1;
    while (true) {
      const res = await apiClient.getProductos({
        page, page_size: 100, activo: true, sucursal: sucursalId,
      });
      const items: ProductoDB[] = (res.results || res.data || []).map(p => ({
        ...p, sucursal_id: sucursalId,
      }));
      if (items.length > 0) await posDB.productos.bulkPut(items);
      if (!res.next) break;
      page++;
    }

    // 3. Categorías
    const catRes = await apiClient.getCategorias();
    const cats = catRes.data || [];
    if (cats.length > 0) await posDB.categorias.bulkPut(cats);

    // 4. Combos con opciones embebidas
    let comboPage = 1;
    while (true) {
      const comboRes = await apiClient.getCombos({
        sucursal: sucursalId, activo: true, page_size: 100, page: comboPage,
      });
      const rawCombos = comboRes.results || [];
      if (rawCombos.length > 0) {
        const combosConOpciones: ComboDB[] = await Promise.all(
          rawCombos.map(async (combo) => {
            const slotsConOpciones = await Promise.all(
              (combo.slots || []).map(async (slot) => {
                try {
                  const opciones = await apiClient.getComboOpciones(combo.id, slot.id, sucursalId);
                  return {
                    id: slot.id,
                    nombre: slot.nombre,
                    obligatorio: slot.obligatorio,
                    orden: slot.orden,
                    opciones: Array.isArray(opciones) ? opciones : [],
                  };
                } catch {
                  return { id: slot.id, nombre: slot.nombre, obligatorio: slot.obligatorio, orden: slot.orden, opciones: [] };
                }
              })
            );
            return {
              id: combo.id,
              sucursal_id: sucursalId,
              nombre: combo.nombre,
              precio: Number(combo.precio),
              slots: slotsConOpciones,
            };
          })
        );
        await posDB.combos.bulkPut(combosConOpciones);
      }
      if (rawCombos.length < 100) break;
      comboPage++;
    }
  } catch {
    // Red caída — silencioso, el catálogo anterior sigue disponible
  }
}

export interface UseOfflineCatalogReturn {
  syncing: boolean;
  preloadCatalog: (sucursalId: number) => Promise<void>;
  searchOffline: (term: string, categoriaId: number | null, sucursalId: number) => Promise<Producto[]>;
  getComboOpciones: (comboId: number) => Promise<ComboDB | undefined>;
}

export function useOfflineCatalog(): UseOfflineCatalogReturn {
  const [syncing, setSyncing] = useState(false);
  const apiClient = getApiClient();

  const preloadCatalog = async (sucursalId: number) => {
    setSyncing(true);
    try {
      await preloadCatalogFn(apiClient, sucursalId);
    } finally {
      setSyncing(false);
    }
  };

  const searchOffline = async (
    term: string,
    categoriaId: number | null,
    sucursalId: number
  ): Promise<Producto[]> => {
    let query = posDB.productos.where('sucursal_id').equals(sucursalId);
    const all = await query.toArray();
    return all.filter(p => {
      const matchTerm = !term || p.nombre.toLowerCase().includes(term.toLowerCase());
      const matchCat = !categoriaId || p.categoria_id === categoriaId;
      return matchTerm && matchCat;
    }) as Producto[];
  };

  const getComboOpciones = (comboId: number) => posDB.combos.get(comboId);

  return { syncing, preloadCatalog, searchOffline, getComboOpciones };
}
