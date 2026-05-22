'use client';

import { useState, useEffect } from 'react';
import { getApiClient } from '@/lib/api';
import { Producto, Categoria } from '@/lib/types/productos';
import { ComboResult } from '../types';

export function usePOSProducts(sucursalId: number | undefined) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [selectedCategoria, setSelectedCategoria] = useState<number | null>(null);
  const [showCategoryDrawer, setShowCategoryDrawer] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [combos, setCombos] = useState<ComboResult[]>([]);

  const apiClient = getApiClient();

  const loadProductos = async (search = '', sid?: number, categoriaId?: number | null) => {
    setLoading(true);
    try {
      const targetSucursal = sid ?? sucursalId;
      const params: Record<string, unknown> = { search, page_size: 50, activo: true, sucursal: targetSucursal };
      if (categoriaId) params.categoria = categoriaId;
      const res = await apiClient.getProductos(params as Parameters<typeof apiClient.getProductos>[0]);
      setProductos(res.results || res.data || []);
    } catch (error) {
      console.error('Error loading products', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategorias = async () => {
    try {
      const res = await apiClient.getCategorias();
      setCategorias(res.data ?? []);
    } catch { /* non-critical */ }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    loadProductos(term, undefined, selectedCategoria);
  };

  const handleSelectCategoria = (catId: number | null) => {
    setSelectedCategoria(catId);
    loadProductos(searchTerm, undefined, catId);
    setShowCategoryDrawer(false);
  };

  // Búsqueda de combos con debounce
  useEffect(() => {
    if (!sucursalId || !searchTerm.trim()) { setCombos([]); return; }
    const timer = setTimeout(() => {
      apiClient.buscarCombos(searchTerm, sucursalId)
        .then(res => setCombos(Array.isArray(res) ? res : []))
        .catch(() => setCombos([]));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm, sucursalId]);

  return {
    productos,
    categorias,
    selectedCategoria,
    showCategoryDrawer,
    setShowCategoryDrawer,
    searchTerm,
    loading,
    combos,
    loadProductos,
    loadCategorias,
    handleSearch,
    handleSelectCategoria,
  };
}
