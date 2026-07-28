'use client';

import { useEffect, useState } from 'react';
import { getApiClient } from '@/lib/api';

export function useComprasCatalogos() {
  const [sucursales, setSucursales] = useState<{ id: number; nombre: string }[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [impuestos, setImpuestos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiClient = getApiClient();

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setCargando(true);
      setError(null);
      try {
        const [sucRes, catRes, impRes] = await Promise.all([
          apiClient.getSucursalesList({ page_size: 100 }),
          apiClient.getCategorias(),
          apiClient.getImpuestos(),
        ]);
        if (cancelado) return;
        setSucursales(sucRes.results || []);
        setCategorias((catRes as any).data || (Array.isArray(catRes) ? catRes : []));
        setImpuestos((impRes as any).data || (Array.isArray(impRes) ? impRes : []));
      } catch {
        if (cancelado) return;
        setError('No se pudieron cargar sucursales/categorías/impuestos. Reintenta recargando la página.');
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { sucursales, categorias, impuestos, cargando, error };
}
