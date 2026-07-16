'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import PortalModal from '@/components/ui/PortalModal';
import { posDB } from '@/lib/db/posDB';
import {
  describirVentaOffline,
  reintentarVentaOffline,
  descartarVentaOffline,
} from './_ventaOfflineView';

interface OfflineQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry?: () => void; // dispara processSyncQueue tras re-encolar
}

const ESTADO_STYLES: Record<string, string> = {
  ERROR_SYNC: 'bg-red-100 text-red-700 border-red-300',
  PENDIENTE: 'bg-orange-100 text-orange-700 border-orange-300',
};

export default function OfflineQueueModal({ isOpen, onClose, onRetry }: OfflineQueueModalProps) {
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null);

  const ventas = useLiveQuery(async () => {
    const rows = await posDB.ventas_offline
      .where('estado').anyOf('ERROR_SYNC', 'PENDIENTE')
      .sortBy('created_at');
    return rows.reverse().map(describirVentaOffline);
  }, [], undefined);

  const handleReintentar = async (id: number) => {
    await reintentarVentaOffline(id);
    onRetry?.();
  };

  const handleDescartar = async (id: number) => {
    await descartarVentaOffline(id);
    setConfirmandoId(null);
  };

  return (
    <PortalModal isOpen={isOpen} onClose={onClose}>
      <div className="p-5">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Ventas sin sincronizar</h2>
        <p className="text-xs text-gray-500 mb-4">
          Ventas guardadas en este dispositivo que no llegaron al servidor.
        </p>

        {ventas === undefined ? (
          <p className="text-sm text-gray-500 py-6 text-center">Cargando…</p>
        ) : ventas.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">No hay ventas pendientes ni con error. ✅</p>
        ) : (
          <ul className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            {ventas.map(v => (
              <li key={v.id} className="border rounded-lg p-3 bg-gray-50">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-900">{v.fecha} · Turno {v.turnoId}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${ESTADO_STYLES[v.estado] || ''}`}>
                    {v.estado === 'ERROR_SYNC' ? 'ERROR' : v.estado}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{v.cliente} — <span className="font-bold">{v.total}</span></p>
                {v.items.length > 0 && (
                  <ul className="text-xs text-gray-600 mt-1 list-disc list-inside">
                    {v.items.map((it, idx) => <li key={idx}>{it}</li>)}
                  </ul>
                )}
                {v.error && (
                  <p className="text-xs text-red-600 mt-2 break-words">
                    <span className="font-bold">Motivo del rechazo:</span> {v.error}
                  </p>
                )}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleReintentar(v.id)}
                    className="flex-1 min-h-[44px] px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg"
                  >
                    Reintentar
                  </button>
                  {confirmandoId === v.id ? (
                    <button
                      onClick={() => handleDescartar(v.id)}
                      className="flex-1 min-h-[44px] px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg"
                    >
                      ¿Seguro? Tocar para borrar
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmandoId(v.id)}
                      className="flex-1 min-h-[44px] px-3 py-2 bg-white border border-red-300 text-red-600 hover:bg-red-50 text-sm font-bold rounded-lg"
                    >
                      Descartar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PortalModal>
  );
}
