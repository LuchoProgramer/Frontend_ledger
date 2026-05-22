'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { getApiClient } from '@/lib/api';
import type { InventarioItem } from '@/lib/types/inventario';
import type { Sucursal } from '@/lib/types/sucursales';
import type { Producto } from '@/lib/types/productos';

export function useInventarioData() {
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedSucursal, setSelectedSucursal] = useState<number | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'detalle' | 'agrupado'>('detalle');
  const [expandedItems, setExpandedItems] = useState<number[]>([]);

  const debouncedSearch = useDebounce(searchTerm, 400);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const api = getApiClient();
      const isGrouped = !selectedSucursal;

      const [invRes, sucRes, prodRes] = await Promise.all([
        api.getInventario({ sucursal: selectedSucursal, search: debouncedSearch, agrupado: isGrouped }),
        api.getSucursalesList({ page_size: 100 }),
        api.getProductos({ page_size: 100, activo: true }),
      ]);

      if (invRes.results) setInventario(invRes.results);
      if ((invRes as any).mode) setViewMode((invRes as any).mode);
      if (sucRes.results) setSucursales(sucRes.results);
      if (prodRes.results) setProductos(prodRes.results);
    } catch (err: any) {
      setError(err.message || 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  }, [selectedSucursal, debouncedSearch]);

  const toggleExpand = (id: number) => {
    setExpandedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return {
    inventario, sucursales, productos,
    loading, error, setError,
    successMessage, setSuccessMessage,
    selectedSucursal, setSelectedSucursal,
    searchTerm, setSearchTerm,
    viewMode, expandedItems, toggleExpand,
    loadData,
  };
}
