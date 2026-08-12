'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getApiClient } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import { Calculator } from 'lucide-react';

export default function ReporteFormulario104Page() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const puedeVer = isAdmin || (user?.groups ?? []).includes('Contador');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sucursalId, setSucursalId] = useState('');
  const [sucursales, setSucursales] = useState<Array<{ id: number; nombre: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reporte, setReporte] = useState<{
    ventas_por_tarifa: Array<{ tarifa_iva: string; base_imponible: string; iva_generado: string }>;
    compras_por_tarifa: Array<{ tarifa_iva: string; base_imponible: string; iva_pagado: string }>;
    retenciones_iva_recibidas: string;
    iva_a_pagar: string;
  } | null>(null);

  useEffect(() => {
    if (!authLoading && !puedeVer) router.push('/');
  }, [authLoading, puedeVer, router]);

  useEffect(() => {
    if (!puedeVer) return;
    const api = getApiClient();
    api.getSucursalesList({ page_size: 100 })
      .then((res: any) => { if (res.results) setSucursales(res.results); })
      .catch(() => {});
  }, [puedeVer]);

  const consultar = async () => {
    if (!startDate || !endDate) {
      setError('Selecciona un rango de fechas.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const api = getApiClient();
      const data = await api.getReporteFormulario104({
        start_date: startDate, end_date: endDate,
        sucursal_id: sucursalId || undefined,
      });
      setReporte(data);
    } catch (err: any) {
      setError(err?.message || 'Error al generar el reporte');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !puedeVer) return null;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-8">
        <div className="flex items-center gap-3 mb-6">
          <Calculator className="w-6 h-6 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Formulario 104 (IVA mensual)</h1>
        </div>

        <div className="flex gap-3 mb-6">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border rounded-lg px-3 py-2" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border rounded-lg px-3 py-2" />
          <select value={sucursalId} onChange={(e) => setSucursalId(e.target.value)} className="border rounded-lg px-3 py-2">
            <option value="">Todas las sucursales</option>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
          <button onClick={consultar} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
            {loading ? 'Calculando...' : 'Consultar'}
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        {reporte && (
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Ventas por tarifa</p>
              {reporte.ventas_por_tarifa.map((r) => (
                <div key={r.tarifa_iva} className="flex justify-between text-sm py-1">
                  <span>{r.tarifa_iva}% — base ${r.base_imponible}</span>
                  <span>IVA ${r.iva_generado}</span>
                </div>
              ))}
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Compras por tarifa</p>
              {reporte.compras_por_tarifa.map((r) => (
                <div key={r.tarifa_iva} className="flex justify-between text-sm py-1">
                  <span>{r.tarifa_iva}% — base ${r.base_imponible}</span>
                  <span>IVA ${r.iva_pagado}</span>
                </div>
              ))}
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-gray-500">Retenciones de IVA recibidas</p>
              <p className="text-lg font-bold">${reporte.retenciones_iva_recibidas}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-gray-500">{Number(reporte.iva_a_pagar) >= 0 ? 'IVA a pagar' : 'Crédito tributario'}</p>
              <p className={`text-xl font-bold ${Number(reporte.iva_a_pagar) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                ${reporte.iva_a_pagar}
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
