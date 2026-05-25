'use client';

import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getApiClient } from '@/lib/api';
import { posDB } from '@/lib/db/posDB';

// Función pura exportada para tests
export async function enqueueSaleFn(
  payload: object,
  receiptData: object,
  turnoId: number,
  sucursalId: number
): Promise<void> {
  await posDB.ventas_offline.add({
    turno_id: turnoId,
    sucursal_id: sucursalId,
    payload: JSON.stringify(payload),
    receipt_data: JSON.stringify(receiptData),
    estado: 'PENDIENTE',
    created_at: Date.now(),
  });
}

// Función pura exportada para tests
export async function processSyncQueueFn(
  apiClient: ReturnType<typeof getApiClient>,
  currentlySyncing = false
): Promise<void> {
  if (currentlySyncing) return;

  const pending = await posDB.ventas_offline
    .where('estado').equals('PENDIENTE')
    .sortBy('created_at');

  for (const venta of pending) {
    try {
      await apiClient.crearFacturaPOS(JSON.parse(venta.payload));
      await posDB.ventas_offline.update(venta.id!, { estado: 'SINCRONIZADA' });
    } catch (err: any) {
      const isNetworkError = err?.status === 0 || err?.status === undefined && !err?.message?.includes('Stock');
      if (isNetworkError && err?.status === 0) {
        break; // Red caída — detener, reintentar después
      }
      await posDB.ventas_offline.update(venta.id!, {
        estado: 'ERROR_SYNC',
        error_msg: err?.message || 'Error desconocido',
      });
    }
  }
}

export interface UseOfflineQueueReturn {
  pendingCount: number;
  errorCount: number;
  syncing: boolean;
  enqueueSale: (payload: object, receiptData: object, turnoId: number, sucursalId: number) => Promise<void>;
  processSyncQueue: () => Promise<void>;
}

export function useOfflineQueue(): UseOfflineQueueReturn {
  const [syncing, setSyncing] = useState(false);
  const isSyncingRef = useRef(false);
  const apiClient = getApiClient();

  const pendingCount = useLiveQuery(
    () => posDB.ventas_offline.where('estado').equals('PENDIENTE').count(),
    [], 0
  ) ?? 0;

  const errorCount = useLiveQuery(
    () => posDB.ventas_offline.where('estado').equals('ERROR_SYNC').count(),
    [], 0
  ) ?? 0;

  const processSyncQueue = async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setSyncing(true);
    try {
      await processSyncQueueFn(apiClient);
    } finally {
      isSyncingRef.current = false;
      setSyncing(false);
    }
  };

  const enqueueSale = (payload: object, receiptData: object, turnoId: number, sucursalId: number) =>
    enqueueSaleFn(payload, receiptData, turnoId, sucursalId);

  useEffect(() => {
    const handleOnline = () => processSyncQueue();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) processSyncQueue();
    };
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return { pendingCount, errorCount, syncing, enqueueSale, processSyncQueue };
}
