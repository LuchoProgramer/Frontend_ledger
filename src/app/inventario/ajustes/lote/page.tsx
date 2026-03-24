'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import DashboardLayout from '@/components/DashboardLayout';
import { Search, Trash2, Layers, CheckCircle2, AlertCircle, Plus } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DesgloseItem {
  sucursal: number;
  sucursal_nombre: string;
  cantidad: number;
}

interface ProductoConStock {
  id: number;
  nombre: string;
  codigo_producto: string;
  stock_total_global: number;
  desglose: DesgloseItem[];
}

interface Sucursal {
  id: number;
  nombre: string;
}

interface LineaAjuste {
  key: string;
  producto: ProductoConStock;
  sucursal_id: number;
  sucursal_nombre: string;
  tipo: 'ENTRADA' | 'SALIDA';
  cantidad: string;
}

interface ResultadoBulk {
  procesados: number;
  fallidos: number;
  exitosos: { nombre: string; cantidad: string }[];
  errores: { producto_id: number; error: string }[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AjusteLotePage() {
  const { api, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    const isAdmin = user.is_staff || user.is_superuser || (user.groups ?? []).includes('Administrador');
    if (!isAdmin) router.replace('/inventario');
  }, [user, router]);

  // ── State ─────────────────────────────────────────────────────────────────

  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [lineas, setLineas] = useState<LineaAjuste[]>([]);
  const [motivo, setMotivo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resultado, setResultado] = useState<ResultadoBulk | null>(null);

  // Buscador
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [searchResults, setSearchResults] = useState<ProductoConStock[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Producto seleccionado para agregar
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoConStock | null>(null);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState('');
  const [tipoSeleccionado, setTipoSeleccionado] = useState<'ENTRADA' | 'SALIDA'>('ENTRADA');
  const [cantidadNueva, setCantidadNueva] = useState('');
  const [errorLinea, setErrorLinea] = useState('');

  // ── Data loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    api.getSucursalesList({ page_size: 50 })
      .then((res: any) => setSucursales(res.results ?? []))
      .catch(() => {});
  }, [api]);

  useEffect(() => {
    if (debouncedSearch.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    api.getInventario({ search: debouncedSearch, agrupado: true })
      .then((res: any) => setSearchResults((res.results ?? []) as ProductoConStock[]))
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false));
  }, [debouncedSearch, api]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleSelectProducto(p: ProductoConStock) {
    setProductoSeleccionado(p);
    setSucursalSeleccionada(p.desglose[0]?.sucursal?.toString() ?? '');
    setCantidadNueva('');
    setErrorLinea('');
    setSearchTerm('');
    setSearchResults([]);
    setShowSearch(false);
  }

  function handleAgregarLinea() {
    if (!productoSeleccionado) { setErrorLinea('Selecciona un producto.'); return; }
    if (!sucursalSeleccionada) { setErrorLinea('Selecciona una sucursal.'); return; }
    const qty = parseFloat(cantidadNueva);
    if (isNaN(qty) || qty <= 0) { setErrorLinea('Ingresa una cantidad válida mayor a 0.'); return; }

    const suc = sucursales.find(s => s.id === Number(sucursalSeleccionada));
    setLineas(prev => [...prev, {
      key: `${productoSeleccionado.id}-${sucursalSeleccionada}-${Date.now()}`,
      producto: productoSeleccionado,
      sucursal_id: Number(sucursalSeleccionada),
      sucursal_nombre: suc?.nombre ?? sucursalSeleccionada,
      tipo: tipoSeleccionado,
      cantidad: cantidadNueva,
    }]);

    setProductoSeleccionado(null);
    setSucursalSeleccionada('');
    setTipoSeleccionado('ENTRADA');
    setCantidadNueva('');
    setErrorLinea('');
  }

  function handleEliminarLinea(key: string) {
    setLineas(prev => prev.filter(l => l.key !== key));
  }

  async function handleConfirmar() {
    if (lineas.length === 0 || !motivo.trim()) return;
    setSubmitting(true);
    try {
      const payload = lineas.map(l => ({
        producto_id: l.producto.id,
        sucursal_id: l.sucursal_id,
        tipo: l.tipo,
        cantidad: parseFloat(l.cantidad),
        motivo: motivo.trim(),
      }));
      const res = await (api as any).ajusteInventarioBulk(payload);
      setResultado({
        procesados: res.procesados,
        fallidos: res.fallidos,
        exitosos: (res.exitosos ?? []).map((e: any) => ({ nombre: e.nombre, cantidad: e.cantidad })),
        errores: res.errores ?? [],
      });
      setLineas([]);
      setMotivo('');
    } catch (e: any) {
      alert(e.message || 'Error al procesar el ajuste');
    } finally {
      setSubmitting(false);
    }
  }

  const canConfirm = lineas.length > 0 && motivo.trim().length > 0;

  // ── Resultado ─────────────────────────────────────────────────────────────

  if (resultado) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-6 max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex items-center gap-3 mb-6">
              {resultado.fallidos === 0
                ? <CheckCircle2 className="w-8 h-8 text-indigo-500" />
                : <AlertCircle className="w-8 h-8 text-yellow-500" />}
              <div>
                <h2 className="text-xl font-bold text-gray-900">Ajuste completado</h2>
                <p className="text-sm text-gray-500">
                  {resultado.procesados} procesado{resultado.procesados !== 1 ? 's' : ''} correctamente
                  {resultado.fallidos > 0 && `, ${resultado.fallidos} con error`}
                </p>
              </div>
            </div>

            {resultado.exitosos.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-bold text-gray-500 uppercase mb-2">Ajustados</div>
                <div className="space-y-2">
                  {resultado.exitosos.map((e, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
                      <span className="text-sm font-medium text-indigo-800">{e.nombre}</span>
                      <span className="text-sm text-indigo-700 font-bold">{e.cantidad}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {resultado.errores.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-bold text-gray-500 uppercase mb-2">Errores</div>
                <div className="space-y-2">
                  {resultado.errores.map((e, i) => (
                    <div key={i} className="p-3 bg-red-50 rounded-lg text-sm text-red-700">
                      Producto #{e.producto_id}: {e.error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setResultado(null)}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
              >
                Nuevo lote
              </button>
              <button
                onClick={() => router.push('/inventario')}
                className="flex-1 py-3 border border-gray-300 text-gray-600 rounded-xl font-bold hover:bg-gray-50"
              >
                Ir a inventario
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── Main ──────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Layers className="w-6 h-6 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Ajuste por Lote</h1>
            <p className="text-gray-500 text-sm">Agrega productos a la lista y ajusta el inventario en un solo envío.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel izquierdo: agregar producto */}
          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="text-base font-bold text-gray-800 mb-4">Agregar producto</h2>

            {/* Buscador */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar producto..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setShowSearch(true); setProductoSeleccionado(null); }}
                onFocus={() => setShowSearch(true)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Buscando...</span>}

              {showSearch && searchResults.length > 0 && (
                <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                  {searchResults.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectProducto(p)}
                      className="w-full text-left px-4 py-3 hover:bg-indigo-50 border-b last:border-0"
                    >
                      <div className="font-medium text-gray-800 text-sm">{p.nombre}</div>
                      <div className="text-xs text-gray-500">{p.codigo_producto} · Stock: {p.stock_total_global}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Producto seleccionado */}
            {productoSeleccionado && (
              <div className="space-y-3">
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <div className="font-semibold text-indigo-800 text-sm">{productoSeleccionado.nombre}</div>
                  <div className="text-xs text-indigo-600">{productoSeleccionado.codigo_producto}</div>
                </div>

                {/* Sucursal */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Sucursal</label>
                  <select
                    value={sucursalSeleccionada}
                    onChange={e => setSucursalSeleccionada(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="">Seleccionar...</option>
                    {sucursales.map(s => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Tipo ENTRADA / SALIDA */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Tipo de ajuste</label>
                  <div className="flex gap-2">
                    {(['ENTRADA', 'SALIDA'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setTipoSeleccionado(t)}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${
                          tipoSeleccionado === t
                            ? t === 'ENTRADA'
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-red-500 text-white border-red-500'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                        }`}
                      >
                        {t === 'ENTRADA' ? '▲ Entrada' : '▼ Salida'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cantidad */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Cantidad</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0"
                    value={cantidadNueva}
                    onChange={e => setCantidadNueva(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                {errorLinea && <p className="text-xs text-red-500">{errorLinea}</p>}

                <button
                  onClick={handleAgregarLinea}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" /> Agregar a la lista
                </button>
              </div>
            )}

            {!productoSeleccionado && (
              <p className="text-sm text-gray-400 text-center py-6">Busca un producto para agregarlo</p>
            )}
          </div>

          {/* Panel derecho: lista + motivo + confirmar */}
          <div className="bg-white rounded-2xl shadow p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-gray-800">
                Lista del lote
                {lineas.length > 0 && <span className="ml-2 text-indigo-600">({lineas.length})</span>}
              </h2>
            </div>

            {lineas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Layers className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">Agrega productos para comenzar</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-xs font-bold text-gray-500 uppercase border-b">
                        <th className="pb-2 text-left">Producto</th>
                        <th className="pb-2 text-left">Sucursal</th>
                        <th className="pb-2 text-center">Tipo</th>
                        <th className="pb-2 text-right">Cantidad</th>
                        <th className="pb-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {lineas.map(l => (
                        <tr key={l.key}>
                          <td className="py-3 font-medium text-gray-800 max-w-[140px] truncate">{l.producto.nombre}</td>
                          <td className="py-3 text-gray-500 text-xs">{l.sucursal_nombre}</td>
                          <td className="py-3 text-center">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              l.tipo === 'ENTRADA' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {l.tipo === 'ENTRADA' ? '▲' : '▼'} {l.tipo}
                            </span>
                          </td>
                          <td className={`py-3 text-right font-bold ${l.tipo === 'ENTRADA' ? 'text-green-700' : 'text-red-600'}`}>
                            {l.tipo === 'ENTRADA' ? '+' : '-'}{l.cantidad}
                          </td>
                          <td className="py-3 pl-2">
                            <button onClick={() => handleEliminarLinea(l.key)} className="text-red-400 hover:text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {lineas.map(l => (
                    <div key={l.key} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800 text-sm truncate">{l.producto.nombre}</div>
                        <div className="text-xs text-gray-500">{l.sucursal_nombre}</div>
                      </div>
                      <div className="flex items-center gap-3 ml-3">
                        <span className={`font-bold text-sm ${l.tipo === 'ENTRADA' ? 'text-green-700' : 'text-red-600'}`}>
                          {l.tipo === 'ENTRADA' ? '+' : '-'}{l.cantidad}
                        </span>
                        <button onClick={() => handleEliminarLinea(l.key)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Motivo global + confirmar (siempre visible) */}
            <div className="mt-5 border-t pt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Motivo del ajuste <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Conteo físico de inventario, corrección de stock..."
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  maxLength={255}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <button
                onClick={handleConfirmar}
                disabled={!canConfirm || submitting}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              >
                {submitting
                  ? 'Procesando...'
                  : `Confirmar ajuste de ${lineas.length} producto${lineas.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
