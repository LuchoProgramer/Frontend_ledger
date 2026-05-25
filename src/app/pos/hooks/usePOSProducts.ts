'use client';

import { useState, useEffect, useRef } from 'react';
import { getApiClient } from '@/lib/api';
import { Producto, Categoria } from '@/lib/types/productos';
import { ComboResult } from '../types';

type OfflineSearchFn = (term: string, categoriaId: number | null, sucursalId: number) => Promise<Producto[]>;

export function usePOSProducts(
  sucursalId: number | undefined,
  offlineSearch?: OfflineSearchFn
) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [selectedCategoria, setSelectedCategoria] = useState<number | null>(null);
  const [showCategoryDrawer, setShowCategoryDrawer] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [combos, setCombos] = useState<ComboResult[]>([]);
  const [isOffline, setIsOffline] = useState(false);

  const apiClient = getApiClient();

  // Refs para que el listener `online` use siempre los últimos valores sin re-subscribirse
  const latestRef = useRef({ isOffline, sucursalId, searchTerm, selectedCategoria });
  latestRef.current = { isOffline, sucursalId, searchTerm, selectedCategoria };
  const loadProductosRef = useRef<(search?: string, sid?: number, categoriaId?: number | null) => Promise<void>>(async () => {});

  const loadProductos = async (search = '', sid?: number, categoriaId?: number | null) => {
    setLoading(true);
    try {
      const targetSucursal = sid ?? sucursalId;
      const params: Record<string, unknown> = { search, page_size: 50, activo: true, sucursal: targetSucursal };
      if (categoriaId) params.categoria = categoriaId;
      const res = await apiClient.getProductos(params as Parameters<typeof apiClient.getProductos>[0]);
      setProductos(res.results || res.data || []);
      setIsOffline(false);
    } catch (error: any) {
      const isNetworkError = error?.status === 0 || !navigator.onLine || error?.message?.includes('fetch') || error?.message?.includes('Network') || error?.message?.includes('Load failed');
      if (isNetworkError && offlineSearch && (sucursalId || sid)) {
        const targetSucursal = sid ?? sucursalId!;
        const offline = await offlineSearch(search, categoriaId ?? null, targetSucursal);
        setProductos(offline);
        setIsOffline(true);
      } else {
        console.error('Error loading products', error);
      }
    } finally {
      setLoading(false);
    }
  };

  loadProductosRef.current = loadProductos;

  // Reactividad online — cuando vuelve la conexión y estamos en modo offline, recargar catálogo del backend
  useEffect(() => {
    const handleOnline = () => {
      const { isOffline: off, sucursalId: sid, searchTerm: term, selectedCategoria: cat } = latestRef.current;
      if (off && sid) {
        loadProductosRef.current(term, sid, cat);
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

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
    productos, categorias, selectedCategoria,
    showCategoryDrawer, setShowCategoryDrawer,
    searchTerm, loading, combos, isOffline,
    loadProductos, loadCategorias,
    handleSearch, handleSelectCategoria,
  };
}
