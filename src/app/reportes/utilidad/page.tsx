'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getApiClient } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import { TrendingUp } from 'lucide-react';

const CATEGORIA_LABELS: Record<string, string> = {
  RENTA: 'Renta', INSUMOS: 'Insumos', SERVICIOS: 'Servicios', OTRO: 'Otro',
};

export default function ReporteUtilidadPage() {
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
    ingresos: number; gastos_total: number;
    gastos_por_categoria: Record<string, number>; utilidad_neta: number;
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
      const data = await api.getReporteUtilidad({
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
          <TrendingUp className="w-6 h-6 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Reporte de Utilidad</h1>
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
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-gray-500">Ingresos</p>
                <p className="text-xl font-bold text-green-600">${reporte.ingresos.toFixed(2)}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-gray-500">Gastos</p>
                <p className="text-xl font-bold text-red-600">${reporte.gastos_total.toFixed(2)}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-gray-500">Utilidad Neta</p>
                <p className={`text-xl font-bold ${reporte.utilidad_neta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${reporte.utilidad_neta.toFixed(2)}
                </p>
              </div>
            </div>

            {Object.keys(reporte.gastos_por_categoria).length > 0 && (
              <div className="p-4 border rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Gastos por categoría</p>
                {Object.entries(reporte.gastos_por_categoria).map(([cat, monto]) => (
                  <div key={cat} className="flex justify-between text-sm py-1">
                    <span>{CATEGORIA_LABELS[cat] || cat}</span>
                    <span>${Number(monto).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
