'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  History,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface Movimiento {
  id: number;
  producto_nombre: string;
  sucursal_nombre: string;
  tipo_movimiento: string;
  cantidad: number;
  saldo_posterior?: number | null;
  motivo: string;
  usuario_nombre: string | null;
  fecha: string;
}

interface Sucursal {
  id: number;
  nombre: string;
}

interface Filters {
  sucursal: string;
  tipo: string;
  fecha_desde: string;
  fecha_hasta: string;
}

const TIPOS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'COMPRA', label: 'Compra' },
  { value: 'VENTA', label: 'Venta' },
  { value: 'AJUSTE', label: 'Ajuste' },
  { value: 'TRANSFERENCIA_ENTRADA', label: 'Transferencia entrada' },
  { value: 'TRANSFERENCIA_SALIDA', label: 'Transferencia salida' },
];

const TIPO_STYLES: Record<string, string> = {
  COMPRA: 'bg-green-100 text-green-800',
  VENTA: 'bg-blue-100 text-blue-800',
  AJUSTE: 'bg-yellow-100 text-yellow-800',
  TRANSFERENCIA_ENTRADA: 'bg-purple-100 text-purple-800',
  TRANSFERENCIA_SALIDA: 'bg-orange-100 text-orange-800',
};

const TIPO_LABELS: Record<string, string> = {
  COMPRA: 'Compra',
  VENTA: 'Venta',
  AJUSTE: 'Ajuste',
  TRANSFERENCIA_ENTRADA: 'Transf. Entrada',
  TRANSFERENCIA_SALIDA: 'Transf. Salida',
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ── Component ────────────────────────────────────────────────────────────────

export default function MovimientosInventarioPage() {
  const { api, user } = useAuth();
  const router = useRouter();

  // Role guard
  useEffect(() => {
    if (!user) return;
    const isAdmin =
      user.is_staff ||
      user.is_superuser ||
      (user.groups ?? []).includes('Administrador');
    if (!isAdmin) router.replace('/inventario');
  }, [user, router]);

  // ── State ─────────────────────────────────────────────────────────────────

  const today = todayISO();

  const [filters, setFilters] = useState<Filters>({
    sucursal: '',
    tipo: '',
    fecha_desde: today,
    fecha_hasta: today,
  });

  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Data loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    api
      .getSucursalesList({ page_size: 50 })
      .then((res: any) => setSucursales(res.results ?? []))
      .catch(() => {});
  }, [api]);

  const fetchMovimientos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, any> = { page };
      if (filters.sucursal) params.sucursal = parseInt(filters.sucursal);
      if (filters.tipo) params.tipo = filters.tipo;
      if (filters.fecha_desde) params.fecha_desde = filters.fecha_desde;
      if (filters.fecha_hasta) params.fecha_hasta = filters.fecha_hasta;

      const res = await api.getMovimientos(params);
      setMovimientos(res.results ?? []);
      setTotalPages(res.num_pages ?? 1);
      setTotalCount(res.count ?? 0);
    } catch {
      setError('No se pudo cargar el historial de movimientos.');
    } finally {
      setLoading(false);
    }
  }, [api, filters, page]);

  useEffect(() => {
    fetchMovimientos();
  }, [fetchMovimientos]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleFilterChange(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function handleResetFilters() {
    setFilters({ sucursal: '', tipo: '', fecha_desde: today, fecha_hasta: today });
    setPage(1);
  }

  const hasActiveFilters =
    filters.sucursal !== '' ||
    filters.tipo !== '' ||
    filters.fecha_desde !== today ||
    filters.fecha_hasta !== today;

  // ── Render helpers ────────────────────────────────────────────────────────

  function TipoBadge({ tipo }: { tipo: string }) {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${
          TIPO_STYLES[tipo] ?? 'bg-gray-100 text-gray-700'
        }`}
      >
        {TIPO_LABELS[tipo] ?? tipo}
      </span>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="px-4 py-6 md:py-8 max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <History className="w-6 h-6 text-indigo-600 shrink-0" />
            <h1 className="text-2xl font-bold text-gray-900">Kardex Global</h1>
          </div>
          <p className="text-sm text-gray-500 ml-9">
            Historial completo de movimientos de inventario
          </p>
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex flex-wrap gap-3 items-end">

            {/* Sucursal */}
            <div className="flex flex-col gap-1 min-w-[160px]">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Sucursal
              </label>
              <select
                className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none min-h-[44px]"
                value={filters.sucursal}
                onChange={(e) => handleFilterChange('sucursal', e.target.value)}
              >
                <option value="">Todas</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo */}
            <div className="flex flex-col gap-1 min-w-[180px]">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Tipo
              </label>
              <select
                className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none min-h-[44px]"
                value={filters.tipo}
                onChange={(e) => handleFilterChange('tipo', e.target.value)}
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha desde */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Desde
              </label>
              <input
                type="date"
                className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none min-h-[44px]"
                value={filters.fecha_desde}
                max={filters.fecha_hasta || today}
                onChange={(e) => handleFilterChange('fecha_desde', e.target.value)}
              />
            </div>

            {/* Fecha hasta */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Hasta
              </label>
              <input
                type="date"
                className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none min-h-[44px]"
                value={filters.fecha_hasta}
                min={filters.fecha_desde}
                max={today}
                onChange={(e) => handleFilterChange('fecha_hasta', e.target.value)}
              />
            </div>

            {/* Reset */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 min-h-[44px] transition-colors self-end"
              >
                <X className="w-4 h-4" /> Hoy
              </button>
            )}

            {/* Count badge */}
            {!loading && (
              <div className="ml-auto self-end flex items-center gap-1.5 text-sm text-gray-500">
                <Filter className="w-4 h-4" />
                <span>{totalCount.toLocaleString()} movimiento{totalCount !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <Th>Fecha / Hora</Th>
                  <Th>Producto</Th>
                  <Th>Sucursal</Th>
                  <Th>Tipo</Th>
                  <Th align="right">Cantidad</Th>
                  <Th align="right">Saldo</Th>
                  <Th>Motivo</Th>
                  <Th>Usuario</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : movimientos.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-12 text-center text-gray-400 text-sm"
                    >
                      No hay movimientos en el período seleccionado.
                    </td>
                  </tr>
                ) : (
                  movimientos.map((mov) => (
                    <tr
                      key={mov.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {/* Fecha */}
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                        {format(new Date(mov.fecha), 'dd/MM/yyyy', { locale: es })}
                        <br />
                        <span className="text-xs text-gray-400">
                          {format(new Date(mov.fecha), 'HH:mm:ss')}
                        </span>
                      </td>

                      {/* Producto */}
                      <td className="px-4 py-3 text-gray-900 font-medium max-w-[180px]">
                        <span className="line-clamp-2">{mov.producto_nombre}</span>
                      </td>

                      {/* Sucursal */}
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                        {mov.sucursal_nombre}
                      </td>

                      {/* Tipo */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <TipoBadge tipo={mov.tipo_movimiento} />
                      </td>

                      {/* Cantidad */}
                      <td
                        className={`px-4 py-3 whitespace-nowrap text-right font-bold tabular-nums ${
                          mov.cantidad < 0 ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {mov.cantidad > 0 ? '+' : ''}
                        {Number(mov.cantidad).toFixed(2)}
                      </td>

                      {/* Saldo posterior */}
                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-gray-900 bg-gray-50 border-l border-gray-100">
                        {mov.saldo_posterior !== null && mov.saldo_posterior !== undefined
                          ? Number(mov.saldo_posterior).toFixed(2)
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>

                      {/* Motivo */}
                      <td
                        className="px-4 py-3 text-gray-500 max-w-[200px]"
                        title={mov.motivo}
                      >
                        <span className="line-clamp-2">{mov.motivo}</span>
                      </td>

                      {/* Usuario */}
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                        {mov.usuario_nombre ?? 'Sistema'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-4">
              <span className="text-sm text-gray-500">
                Página {page} de {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 min-h-[44px] transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 min-h-[44px] transition-colors"
                >
                  Siguiente <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Th({
  children,
  align = 'left',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <th
      className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  );
}
