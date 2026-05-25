'use client';

import { useState } from 'react';
import { getApiClient } from '@/lib/api';
import { Producto } from '@/lib/types/productos';
import { posDB, ProductoDB, ComboDB } from '@/lib/db/posDB';

// Auxiliar para descargar presentaciones en lotes paralelos (concurrencia controlada)
async function fetchPresentacionesConLote(
  apiClient: any,
  productos: any[],
  sucursalId: number,
  concurrencia = 10
): Promise<ProductoDB[]> {
  const resultados: ProductoDB[] = [];
  for (let i = 0; i < productos.length; i += concurrencia) {
    const lote = productos.slice(i, i + concurrencia);
    const promesas = lote.map(async (p) => {
      try {
        const presRes = await apiClient.getPresentaciones(p.id, sucursalId);
        return { ...p, sucursal_id: sucursalId, presentaciones: presRes.data || [] };
      } catch {
        return { ...p, sucursal_id: sucursalId, presentaciones: [] };
      }
    });
    const loteResultados = await Promise.all(promesas);
    resultados.push(...loteResultados);
  }
  return resultados;
}

// Función pura exportada para poder testearla
export async function preloadCatalogFn(
  apiClient: ReturnType<typeof getApiClient>,
  sucursalIdRaw: number
): Promise<void> {
  const sucursalId = Number(sucursalIdRaw);
  try {
    // 1. Paginar productos en memoria
    let page = 1;
    const rawItems: any[] = [];
    while (true) {
      const res = await apiClient.getProductos({
        page, page_size: 100, activo: true, sucursal: sucursalId,
      });
      const pageItems = res.results || res.data || [];
      if (pageItems.length > 0) rawItems.push(...pageItems);
      if (!res.next) break;
      page++;
    }

    // Descargar presentaciones para cada producto en lotes paralelos de 10
    const items = await fetchPresentacionesConLote(apiClient, rawItems, sucursalId, 10);

    // 2. Categorías en memoria
    const catRes = await apiClient.getCategorias();
    const cats = catRes.data || [];

    // 3. Combos con opciones embebidas en memoria
    let comboPage = 1;
    const combosConOpciones: ComboDB[] = [];
    while (true) {
      const comboRes = await apiClient.getCombos({
        sucursal: sucursalId, activo: true, page_size: 100, page: comboPage,
      });
      const rawCombos = comboRes.results || [];
      if (rawCombos.length > 0) {
        const pageCombos: ComboDB[] = await Promise.all(
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
        combosConOpciones.push(...pageCombos);
      }
      if (rawCombos.length < 100) break;
      comboPage++;
    }

    // 4. Guardar datos en la base de datos local usando una transacción de Dexie (operación atómica)
    await posDB.transaction('rw', [posDB.productos, posDB.combos, posDB.categorias], async () => {
      // Borrar datos viejos de esta sucursal
      await posDB.productos.where('sucursal_id').equals(sucursalId).delete();
      await posDB.combos.where('sucursal_id').equals(sucursalId).delete();

      // Insertar los nuevos datos descargados
      if (items.length > 0) await posDB.productos.bulkPut(items);
      if (cats.length > 0) await posDB.categorias.bulkPut(cats);
      if (combosConOpciones.length > 0) await posDB.combos.bulkPut(combosConOpciones);
    });
  } catch (err) {
    console.warn('[useOfflineCatalog] Error preloading catalog, retaining existing cache:', err);
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
    sucursalIdRaw: number
  ): Promise<Producto[]> => {
    const sucursalId = Number(sucursalIdRaw);
    try {
      const all = await posDB.productos.where('sucursal_id').equals(sucursalId).toArray();
      return all.filter(p => {
        const matchTerm = !term || p.nombre.toLowerCase().includes(term.toLowerCase());
        const matchCat = !categoriaId || p.categoria_id === categoriaId;
        return matchTerm && matchCat;
      }) as Producto[];
    } catch (dbError) {
      console.error('Error consultando IndexedDB:', dbError);
      return [];
    }
  };

  const getComboOpciones = (comboId: number) => posDB.combos.get(comboId);

  return { syncing, preloadCatalog, searchOffline, getComboOpciones };
}
