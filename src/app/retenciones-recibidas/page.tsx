'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Receipt } from 'lucide-react';
import { useRetencionesRecibidas } from './hooks/useRetencionesRecibidas';
import ImportarRetencionModal from './components/ImportarRetencionModal';

export default function RetencionesRecibidasPage() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const puedeVer = isAdmin || (user?.groups ?? []).includes('Contador');
  const { retenciones, loading, error, importar } = useRetencionesRecibidas();
  const [modalAbierto, setModalAbierto] = useState(false);

  useEffect(() => {
    if (!authLoading && !puedeVer) router.push('/');
  }, [authLoading, puedeVer, router]);

  if (authLoading || !puedeVer) return null;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Receipt className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">Retenciones Recibidas</h1>
          </div>
          <button
            onClick={() => setModalAbierto(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm"
          >
            Importar por clave de acceso
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
        {loading && <p className="text-gray-500">Cargando...</p>}

        {!loading && retenciones.length === 0 && (
          <p className="text-gray-500">Todavía no se ha importado ninguna retención.</p>
        )}

        <div className="space-y-3">
          {retenciones.map((r) => (
            <div key={r.id} className="p-4 border rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{r.razon_social_agente_retencion}</span>
                <span className="text-gray-500">{r.fecha_emision}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {r.numero_documento} — sobre factura {r.factura_id ? r.numero_factura_sustento : `${r.numero_factura_sustento} (no registrada en el sistema)`}
              </div>
              <div className="text-lg font-bold text-indigo-600 mt-2">${r.total_retenido}</div>
            </div>
          ))}
        </div>

        {modalAbierto && (
          <ImportarRetencionModal onImportar={importar} onClose={() => setModalAbierto(false)} />
        )}
      </div>
    </DashboardLayout>
  );
}
