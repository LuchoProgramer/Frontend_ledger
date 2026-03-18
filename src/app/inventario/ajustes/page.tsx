'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Search,
  ChevronRight,
  ChevronLeft,
  Package,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  ArrowRight,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface DesgloseItem {
  id: number;
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

interface AjusteReceipt {
  productoNombre: string;
  productoCodigo: string;
  sucursalNombre: string;
  stockAnterior: number;
  stockNuevo: number;
  diferencia: number;
  tipo: 'ENTRADA' | 'SALIDA';
  motivo: string;
  usuario: string;
  fecha: string;
}

type Step = 'search' | 'sucursal' | 'form' | 'confirm' | 'receipt';

const STEP_LABELS: Record<Exclude<Step, 'receipt'>, string> = {
  search: 'Buscar',
  sucursal: 'Sucursal',
  form: 'Cantidad',
  confirm: 'Confirmar',
};

const STEP_ORDER: Exclude<Step, 'receipt'>[] = ['search', 'sucursal', 'form', 'confirm'];

// ── Component ────────────────────────────────────────────────────────────────

export default function AjustesInventarioPage() {
  const { api, user } = useAuth();
  const router = useRouter();

  // Role guard — admin/staff only
  useEffect(() => {
    if (!user) return;
    const isAdmin =
      user.is_staff ||
      user.is_superuser ||
      (user.groups ?? []).includes('Administrador');
    if (!isAdmin) router.replace('/inventario');
  }, [user, router]);

  // ── Wizard state ──────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('search');

  // Step 1 — search
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [searchResults, setSearchResults] = useState<ProductoConStock[]>([]);
  const [searching, setSearching] = useState(false);

  // Step 2 — sucursal
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductoConStock | null>(null);

  // Step 3 — form
  const [selectedSucursal, setSelectedSucursal] = useState<{
    id: number;
    nombre: string;
    currentStock: number;
  } | null>(null);
  const [targetQty, setTargetQty] = useState('');
  const [motivo, setMotivo] = useState('');

  // Shared
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<AjusteReceipt | null>(null);

  // ── Data loading ──────────────────────────────────────────────────────────

  // Load sucursales once on mount
  useEffect(() => {
    api
      .getSucursalesList({ page_size: 50 })
      .then((res: any) => setSucursales(res.results ?? []))
      .catch(() => {});
  }, [api]);

  // Debounced product search
  useEffect(() => {
    if (debouncedSearch.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    api
      .getInventario({ search: debouncedSearch, agrupado: true })
      .then((res: any) => setSearchResults((res.results ?? []) as ProductoConStock[]))
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false));
  }, [debouncedSearch, api]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleSelectProduct(producto: ProductoConStock) {
    setSelectedProduct(producto);
    setStep('sucursal');
  }

  function handleSelectSucursal(id: number, nombre: string, currentStock: number) {
    setSelectedSucursal({ id, nombre, currentStock });
    setTargetQty(currentStock.toString());
    setFormError('');
    setStep('form');
  }

  function handleReviewAjuste() {
    const qty = parseFloat(targetQty);
    if (isNaN(qty) || qty < 0) {
      setFormError('Ingresa una cantidad válida (número mayor o igual a 0).');
      return;
    }
    if (!motivo.trim()) {
      setFormError('El motivo del ajuste es obligatorio.');
      return;
    }
    if (qty === selectedSucursal!.currentStock) {
      setFormError(
        'La cantidad ingresada es igual al stock actual. No hay diferencia que ajustar.'
      );
      return;
    }
    setFormError('');
    setStep('confirm');
  }

  async function handleSubmit() {
    if (!selectedProduct || !selectedSucursal) return;

    const targetQtyNum = parseFloat(targetQty);
    const diff = targetQtyNum - selectedSucursal.currentStock;
    const tipo: 'ENTRADA' | 'SALIDA' = diff > 0 ? 'ENTRADA' : 'SALIDA';
    const cantidad = Math.abs(diff);

    setSubmitting(true);
    try {
      await api.ajusteInventario({
        producto_id: selectedProduct.id,
        sucursal_id: selectedSucursal.id,
        tipo,
        cantidad,
        motivo: motivo.trim(),
      });

      setReceipt({
        productoNombre: selectedProduct.nombre,
        productoCodigo: selectedProduct.codigo_producto,
        sucursalNombre: selectedSucursal.nombre,
        stockAnterior: selectedSucursal.currentStock,
        stockNuevo: targetQtyNum,
        diferencia: diff,
        tipo,
        motivo: motivo.trim(),
        usuario: user?.username ?? user?.email ?? 'Sistema',
        fecha: new Date().toLocaleString('es-EC', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      });
      setStep('receipt');
    } catch (err: any) {
      setFormError(err?.message ?? 'Error al procesar el ajuste. Intenta de nuevo.');
      setStep('confirm');
    } finally {
      setSubmitting(false);
    }
  }

  function handleNuevoAjuste() {
    setStep('search');
    setSearchTerm('');
    setSearchResults([]);
    setSelectedProduct(null);
    setSelectedSucursal(null);
    setTargetQty('');
    setMotivo('');
    setFormError('');
    setReceipt(null);
  }

  // ── Derived values ────────────────────────────────────────────────────────

  // Merge all sucursales with stock from selected product's desglose
  const sucursalesConStock = sucursales.map((s) => {
    const entry = selectedProduct?.desglose.find((d) => d.sucursal === s.id);
    return { id: s.id, nombre: s.nombre, currentStock: entry?.cantidad ?? 0 };
  });

  const targetQtyNum = parseFloat(targetQty) || 0;
  const diff = targetQtyNum - (selectedSucursal?.currentStock ?? 0);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">

        {/* Page header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <SlidersHorizontal className="w-6 h-6 text-indigo-600 shrink-0" />
            <h1 className="text-2xl font-bold text-gray-900">Ajuste de Inventario</h1>
          </div>
          <p className="text-sm text-gray-500 ml-9">
            Solo administradores · Los cambios quedan registrados en el kardex
          </p>
        </div>

        {/* Step progress indicator */}
        {step !== 'receipt' && (
          <div className="flex items-center gap-2 mb-6 text-sm select-none">
            {STEP_ORDER.map((s, i) => {
              const currentIdx = STEP_ORDER.indexOf(step as Exclude<Step, 'receipt'>);
              const isDone = i < currentIdx;
              const isCurrent = s === step;
              return (
                <div key={s} className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                      isDone
                        ? 'bg-indigo-600 text-white'
                        : isCurrent
                        ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isDone ? '✓' : i + 1}
                  </span>
                  <span
                    className={`hidden sm:inline ${
                      isCurrent ? 'text-indigo-700 font-medium' : 'text-gray-400'
                    }`}
                  >
                    {STEP_LABELS[s]}
                  </span>
                  {i < STEP_ORDER.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── STEP 1: SEARCH ─────────────────────────────────────────────── */}
        {step === 'search' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">¿Qué producto deseas ajustar?</h2>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                type="search"
                autoFocus
                placeholder="Busca por nombre o código..."
                className="w-full pl-10 pr-4 py-3 text-base rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {searching && (
              <p className="text-center py-6 text-gray-400 text-sm">Buscando...</p>
            )}

            {!searching && debouncedSearch.trim().length >= 2 && searchResults.length === 0 && (
              <p className="text-center py-6 text-gray-400 text-sm">
                Sin resultados para &quot;{debouncedSearch}&quot;
              </p>
            )}

            {!searching && searchResults.length > 0 && (
              <ul className="divide-y divide-gray-100 -mx-2">
                {searchResults.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectProduct(p)}
                      className="w-full flex items-center justify-between px-4 py-3 min-h-[56px] rounded-lg hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-500 text-left transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-gray-400 shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{p.nombre}</p>
                          <p className="text-xs text-gray-500">{p.codigo_producto}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className="text-sm text-gray-600">
                          {p.stock_total_global} uds
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {debouncedSearch.trim().length < 2 && (
              <p className="text-sm text-gray-400 text-center py-4">
                Escribe al menos 2 caracteres para buscar
              </p>
            )}
          </div>
        )}

        {/* ── STEP 2: SUCURSAL ───────────────────────────────────────────── */}
        {step === 'sucursal' && selectedProduct && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => { setStep('search'); setSelectedProduct(null); }}
              className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 min-h-[44px] font-medium"
            >
              <ChevronLeft className="w-4 h-4" /> Cambiar producto
            </button>

            <ProductoBadge product={selectedProduct} />

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">¿En qué sucursal vas a ajustar?</h2>
              {sucursalesConStock.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">
                  Cargando sucursales...
                </p>
              ) : (
                <ul className="divide-y divide-gray-100 -mx-2">
                  {sucursalesConStock.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectSucursal(s.id, s.nombre, s.currentStock)}
                        className="w-full flex items-center justify-between px-4 py-3 min-h-[56px] rounded-lg hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-500 text-left transition-colors"
                      >
                        <span className="font-medium text-gray-900 text-sm">{s.nombre}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-sm font-medium ${
                              s.currentStock === 0 ? 'text-gray-400' : 'text-gray-700'
                            }`}
                          >
                            {s.currentStock} uds
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 3: FORM ───────────────────────────────────────────────── */}
        {step === 'form' && selectedProduct && selectedSucursal && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setStep('sucursal')}
              className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 min-h-[44px] font-medium"
            >
              <ChevronLeft className="w-4 h-4" /> Cambiar sucursal
            </button>

            <ContextoBadge product={selectedProduct} sucursal={selectedSucursal} />

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
              {/* Target quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad correcta <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Ingresa cuántas unidades <strong>deben existir</strong> (no la diferencia).
                </p>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  autoFocus
                  placeholder={`Ej: ${selectedSucursal.currentStock}`}
                  className="w-full px-4 py-3 text-lg rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  value={targetQty}
                  onChange={(e) => { setTargetQty(e.target.value); setFormError(''); }}
                />
                {/* Live diff preview */}
                {targetQty !== '' && !isNaN(parseFloat(targetQty)) && (
                  <p
                    className={`text-sm mt-2 font-medium ${
                      diff > 0
                        ? 'text-green-600'
                        : diff < 0
                        ? 'text-red-600'
                        : 'text-gray-400'
                    }`}
                  >
                    {diff > 0 && `▲ Entrada de ${diff.toFixed(2)} unidades`}
                    {diff < 0 && `▼ Salida de ${Math.abs(diff).toFixed(2)} unidades`}
                    {diff === 0 && '— Sin diferencia con el stock actual'}
                  </p>
                )}
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo del ajuste <span className="text-red-500">*</span>
                </label>
                <textarea
                  placeholder="Ej: Conteo físico corregido, merma por vencimiento, rotura..."
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none h-24"
                  value={motivo}
                  maxLength={255}
                  onChange={(e) => { setMotivo(e.target.value); setFormError(''); }}
                />
                <p className="text-xs text-gray-400 text-right">{motivo.length}/255</p>
              </div>

              {formError && <ErrorBanner message={formError} />}

              <button
                type="button"
                onClick={handleReviewAjuste}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 transition-colors min-h-[48px]"
              >
                Revisar ajuste <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: CONFIRM ────────────────────────────────────────────── */}
        {step === 'confirm' && selectedProduct && selectedSucursal && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                Confirma el ajuste
              </h2>

              <dl className="space-y-3 text-sm">
                <SummaryRow label="Producto">
                  {selectedProduct.nombre}{' '}
                  <span className="text-gray-400">({selectedProduct.codigo_producto})</span>
                </SummaryRow>
                <SummaryRow label="Sucursal">{selectedSucursal.nombre}</SummaryRow>

                <hr className="border-gray-100" />

                <SummaryRow label="Stock actual">
                  {selectedSucursal.currentStock} uds
                </SummaryRow>
                <SummaryRow label="Nuevo stock">
                  <span className="font-bold">{targetQtyNum} uds</span>
                </SummaryRow>

                <div className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2">
                  <dt className="font-medium text-gray-600">Movimiento</dt>
                  <dd
                    className={`font-bold ${diff > 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} uds (
                    {diff > 0 ? 'ENTRADA' : 'SALIDA'})
                  </dd>
                </div>

                <hr className="border-gray-100" />

                <div className="flex flex-col gap-1">
                  <dt className="text-gray-500">Motivo</dt>
                  <dd className="text-gray-900 bg-gray-50 rounded-lg px-3 py-2 break-words">
                    {motivo}
                  </dd>
                </div>
              </dl>
            </div>

            {formError && <ErrorBanner message={formError} />}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => { setStep('form'); setFormError(''); }}
                className="flex-1 flex items-center justify-center gap-1 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 min-h-[48px] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Editar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 disabled:opacity-60 min-h-[48px] transition-colors"
              >
                {submitting ? 'Aplicando...' : 'Aplicar ajuste'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 5: RECEIPT ────────────────────────────────────────────── */}
        {step === 'receipt' && receipt && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Receipt header */}
              <div className="bg-green-50 border-b border-green-100 px-6 py-4 flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-800">Ajuste aplicado correctamente</p>
                  <p className="text-xs text-green-600 mt-0.5">{receipt.fecha}</p>
                </div>
              </div>

              {/* Receipt body */}
              <div className="p-6">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  Comprobante de Ajuste
                </h3>
                <dl className="space-y-3 text-sm">
                  <SummaryRow label="Realizado por">{receipt.usuario}</SummaryRow>

                  <hr className="border-gray-100" />

                  <SummaryRow label="Producto">
                    <span className="font-medium">{receipt.productoNombre}</span>
                  </SummaryRow>
                  <SummaryRow label="Código">{receipt.productoCodigo}</SummaryRow>
                  <SummaryRow label="Sucursal">{receipt.sucursalNombre}</SummaryRow>

                  <hr className="border-gray-100" />

                  <SummaryRow label="Stock anterior">{receipt.stockAnterior} uds</SummaryRow>
                  <SummaryRow label="Stock nuevo">
                    <span className="font-bold">{receipt.stockNuevo} uds</span>
                  </SummaryRow>

                  <div className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2">
                    <dt className="font-medium text-gray-600">Movimiento</dt>
                    <dd
                      className={`font-bold ${
                        receipt.tipo === 'ENTRADA' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {receipt.tipo === 'ENTRADA' ? '+' : ''}
                      {receipt.diferencia.toFixed(2)} uds ({receipt.tipo})
                    </dd>
                  </div>

                  <hr className="border-gray-100" />

                  <div className="flex flex-col gap-1">
                    <dt className="text-gray-500">Motivo</dt>
                    <dd className="text-gray-900 bg-gray-50 rounded-lg px-3 py-2 break-words">
                      {receipt.motivo}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <button
              type="button"
              onClick={handleNuevoAjuste}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 min-h-[48px] transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" /> Nuevo ajuste
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// ── Small helper components ───────────────────────────────────────────────────

function ProductoBadge({ product }: { product: ProductoConStock }) {
  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3">
      <p className="text-xs text-indigo-500 uppercase tracking-wide font-medium mb-0.5">
        Producto
      </p>
      <p className="font-semibold text-indigo-900">{product.nombre}</p>
      <p className="text-xs text-indigo-600 mt-0.5">
        {product.codigo_producto} · Stock total: {product.stock_total_global} uds
      </p>
    </div>
  );
}

function ContextoBadge({
  product,
  sucursal,
}: {
  product: ProductoConStock;
  sucursal: { nombre: string; currentStock: number };
}) {
  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3">
      <p className="text-xs text-indigo-500 uppercase tracking-wide font-medium mb-0.5">
        {sucursal.nombre}
      </p>
      <p className="font-semibold text-indigo-900">{product.nombre}</p>
      <p className="text-sm text-indigo-700 mt-1">
        Stock actual:{' '}
        <span className="font-bold">{sucursal.currentStock} unidades</span>
      </p>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-start gap-3">
      <dt className="text-gray-500 shrink-0">{label}</dt>
      <dd className="text-gray-900 text-right">{children}</dd>
    </div>
  );
}
