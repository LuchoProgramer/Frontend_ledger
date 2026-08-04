'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getApiClient } from '@/lib/api';
import type { Gasto } from '@/lib/api/_gastos';
import DashboardLayout from '@/components/DashboardLayout';
import { Briefcase } from 'lucide-react';

const CATEGORIAS: Array<{ value: Gasto['categoria']; label: string }> = [
  { value: 'RENTA', label: 'Renta' },
  { value: 'INSUMOS', label: 'Insumos' },
  { value: 'SERVICIOS', label: 'Servicios' },
  { value: 'OTRO', label: 'Otro' },
];

export default function GastosPage() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [sucursales, setSucursales] = useState<Array<{ id: number; nombre: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    sucursal: '', categoria: 'RENTA' as Gasto['categoria'], monto: '', fecha: '', descripcion: '',
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) router.push('/');
  }, [authLoading, isAdmin, router]);

  // Mismo patrón que reportes/ventas/page.tsx::loadSucursales (getSucursalesList
  // ya existente en src/lib/api/_sucursales.ts, consumido como res.results crudo).
  useEffect(() => {
    if (!isAdmin) return;
    const api = getApiClient();
    api.getSucursalesList({ page_size: 100 })
      .then((res: any) => { if (res.results) setSucursales(res.results); })
      .catch(() => {});
  }, [isAdmin]);

  // IMPORTANTE: `request()` en src/lib/api/_base.ts devuelve el JSON crudo
  // del backend en éxito y hace `throw` (no retorna {success:false}) en
  // fallo -- confirmado leyendo _base.ts y cómo lo consume
  // reportes/ventas/page.tsx (try/catch sobre el valor crudo). El patrón
  // `response.success && response.data` de categorias/page.tsx es una
  // convención propia del backend de esa vista puntual (`api_catalogos.py`),
  // NO universal -- nuestros endpoints de gastos devuelven JSON plano, así
  // que seguimos el patrón de reportes/ventas/page.tsx, no el de categorias.
  const cargarGastos = useCallback(async () => {
    try {
      setLoading(true);
      const api = getApiClient();
      const data = await api.getGastos();
      setGastos(data.results);
    } catch (err: any) {
      setError(err?.message || 'Error de conexi\u00f3n al cargar gastos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) cargarGastos();
  }, [isAdmin, cargarGastos]);

  const handleOpenCreate = () => {
    setFormData({ sucursal: '', categoria: 'RENTA', monto: '', fecha: '', descripcion: '' });
    setShowForm(true);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const api = getApiClient();
      await api.crearGasto({
        sucursal: Number(formData.sucursal),
        categoria: formData.categoria,
        monto: formData.monto,
        fecha: formData.fecha,
        descripcion: formData.descripcion,
      });
      setShowForm(false);
      cargarGastos();
    } catch (err: any) {
      setError(err?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleAnular = async (id: number) => {
    try {
      const api = getApiClient();
      await api.anularGasto(id);
      cargarGastos();
    } catch (err: any) {
      setError(err?.message || 'Error al anular');
    }
  };

  if (authLoading || !isAdmin) return null;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Briefcase className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">Registrar Gasto</h1>
          </div>
          <button onClick={handleOpenCreate} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            + Nuevo Gasto
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 border border-gray-200 rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <select
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value as Gasto['categoria'] })}
                className="border rounded-lg px-3 py-2"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <input
                type="number" step="0.01" required placeholder="Monto"
                value={formData.monto}
                onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                className="border rounded-lg px-3 py-2"
              />
              <input
                type="date" required
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                className="border rounded-lg px-3 py-2"
              />
              <select
                required
                value={formData.sucursal}
                onChange={(e) => setFormData({ ...formData, sucursal: e.target.value })}
                className="border rounded-lg px-3 py-2"
              >
                <option value="">Sucursal...</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
            <textarea
              placeholder="Descripción (opcional)"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg">
                Cancelar
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-gray-500">Cargando...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Fecha</th>
                <th>Categoría</th>
                <th>Monto</th>
                <th>Descripción</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {gastos.map((g) => (
                <tr key={g.id} className="border-b">
                  <td className="py-2">{g.fecha}</td>
                  <td>{CATEGORIAS.find((c) => c.value === g.categoria)?.label}</td>
                  <td>${g.monto}</td>
                  <td>{g.descripcion}</td>
                  <td>
                    <button onClick={() => handleAnular(g.id)} className="text-red-600 text-xs">Anular</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardLayout>
  );
}
