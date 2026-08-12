import { useState, useEffect, useCallback } from 'react';
import { getApiClient } from '@/lib/api';
import type { RetencionRecibida, CrearRetencionManualPayload } from '@/lib/types/retenciones';

export function useRetencionesRecibidas() {
  const [retenciones, setRetenciones] = useState<RetencionRecibida[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const api = getApiClient();
      const data = await api.getRetencionesRecibidas();
      setRetenciones(data.results);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar las retenciones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const importar = useCallback(async (claveAcceso: string) => {
    const api = getApiClient();
    await api.importarRetencionRecibida(claveAcceso);
    await cargar();
  }, [cargar]);

  const crearManual = useCallback(async (payload: CrearRetencionManualPayload) => {
    const api = getApiClient();
    await api.crearRetencionRecibidaManual(payload);
    await cargar();
  }, [cargar]);

  return { retenciones, loading, error, importar, crearManual, recargar: cargar };
}

