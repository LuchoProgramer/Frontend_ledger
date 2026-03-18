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
  PackagePlus,
  ArrowRight,
  Plus,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface IngresoReceipt {
  productoNombre: string;
  productoCodigo: string;
  sucursalNombre: string;
  stockAnterior: number;
  cantidadIngresada: number;
  stockNuevo: number;
  origen: string;
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

const MOTIVO_CHIPS = ['Producción propia', 'Compra informal', 'Donación', 'Muestra'];

// ── Component ─────────────────────────────────────────────────────────────────

export default function IngresosInventarioPage() {
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

  // ── State ─────────────────────────────────────────────────────────────────

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
  const [cantidad, setCantidad] = useState('');
  const [origen, setOrigen] = useState('');
  const [motivo, setMotivo] = useState('');

  // Shared
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<IngresoReceipt | null>(null);

  // ── Data loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    api
      .getSucursalesList({ page_size: 50 })
      .then((res: any) => setSucursales(res.results ?? []))
      .catch(() => {});
  }, [api]);

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

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleSelectProduct(producto: ProductoConStock) {
    setSelectedProduct(producto);
    setStep('sucursal');
  }

  function handleSelectSucursal(id: number, nombre: string, currentStock: number) {
    setSelectedSucursal({ id, nombre, currentStock });
    setCantidad('');
    setFormError('');
    setStep('form');
  }

  function handleChipClick(chip: string) {
    setMotivo(chip);
    setFormError('');
  }

  function handleReviewIngreso() {
    const qty = parseFloat(cantidad);
    if (isNaN(qty) || qty < 0.01) {
      setFormError('Ingresa una cantidad mayor a 0.');
      return;
    }
    if (!motivo.trim()) {
      setFormError('El motivo es obligatorio.');
      return;
    }
    setFormError('');
    setStep('confirm');
  }

  async function handleSubmit() {
    if (!selectedProduct || !selectedSucursal) return;

    const cantidadNum = parseFloat(cantidad);

    // Origen se embebe en el motivo para que quede registrado en el kardex
    const motivoFinal = origen.trim()
      ? `${motivo.trim()} — Origen: ${origen.trim()}`
      : motivo.trim();

    setSubmitting(true);
    try {
      await api.ajusteInventario({
        producto_id: selectedProduct.id,
        sucursal_id: selectedSucursal.id,
        tipo: 'ENTRADA',
        cantidad: cantidadNum,
        motivo: motivoFinal,
      });

      setReceipt({
        productoNombre: selectedProduct.nombre,
        productoCodigo: selectedProduct.codigo_producto,
        sucursalNombre: selectedSucursal.nombre,
        stockAnterior: selectedSucursal.currentStock,
        cantidadIngresada: cantidadNum,
        stockNuevo: selectedSucursal.currentStock + cantidadNum,
        origen: origen.trim(),
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
      setFormError(err?.message ?? 'Error al registrar el ingreso. Intenta de nuevo.');
      setStep('confirm');
    } finally {
      setSubmitting(false);
    }
  }

  function handleNuevoIngreso() {
    setStep('search');
    setSearchTerm('');
    setSearchResults([]);
    setSelectedProduct(null);
    setSelectedSucursal(null);
    setCantidad('');
    setOrigen('');
    setMotivo('');
    setFormError('');
    setReceipt(null);
  }

  // ── Derived values ────────────────────────────────────────────────────────

  const sucursalesConStock = sucursales.map((s) => {
    const entry = selectedProduct?.desglose.find((d) => d.sucursal === s.id);
    return { id: s.id, nombre: s.nombre, currentStock: entry?.cantidad ?? 0 };
  });

  const cantidadNum = parseFloat(cantidad) || 0;
  const stockNuevo = (selectedSucursal?.currentStock ?? 0) + cantidadNum;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">

        {/* Page header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <PackagePlus className="w-6 h-6 text-green-600 shrink-0" />
            <h1 className="text-2xl font-bold text-gray-900">Ingreso de Inventario</h1>
          </div>
          <p className="text-sm text-gray-500 ml-9">
            Producción propia, compras informales, donaciones — sin factura
          </p>
        </div>

        {/* Step indicator */}
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
                        ? 'bg-green-600 text-white'
                        : isCurrent
                        ? 'bg-green-100 text-green-700 border-2 border-green-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isDone ? '✓' : i + 1}
                  </span>
                  <span
                    className={`hidden sm:inline ${
                      isCurrent ? 'text-green-700 font-medium' : 'text-gray-400'
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

        {/* ── STEP 1: SEARCH ───────────────────────────────────────────────── */}
        {step === 'search' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">¿Qué producto estás ingresando?</h2>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                type="search"
                autoFocus
                placeholder="Busca por nombre o código..."
                className="w-full pl-10 pr-4 py-3 text-base rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
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
                      className="w-full flex items-center justify-between px-4 py-3 min-h-[56px] rounded-lg hover:bg-green-50 focus-visible:ring-2 focus-visible:ring-green-500 text-left transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-gray-400 shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{p.nombre}</p>
                          <p className="text-xs text-gray-500">{p.codigo_producto}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className="text-sm text-gray-600">{p.stock_total_global} uds</span>
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

        {/* ── STEP 2: SUCURSAL ─────────────────────────────────────────────── */}
        {step === 'sucursal' && selectedProduct && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => { setStep('search'); setSelectedProduct(null); }}
              className="flex items-center gap-1 text-sm text-green-600 hover:text-green-800 min-h-[44px] font-medium"
            >
              <ChevronLeft className="w-4 h-4" /> Cambiar producto
            </button>

            <ProductoBadge product={selectedProduct} />

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">
                ¿En qué sucursal entra la mercadería?
              </h2>
              {sucursalesConStock.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Cargando sucursales...</p>
              ) : (
                <ul className="divide-y divide-gray-100 -mx-2">
                  {sucursalesConStock.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectSucursal(s.id, s.nombre, s.currentStock)}
                        className="w-full flex items-center justify-between px-4 py-3 min-h-[56px] rounded-lg hover:bg-green-50 focus-visible:ring-2 focus-visible:ring-green-500 text-left transition-colors"
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

        {/* ── STEP 3: FORM ─────────────────────────────────────────────────── */}
        {step === 'form' && selectedProduct && selectedSucursal && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setStep('sucursal')}
              className="flex items-center gap-1 text-sm text-green-600 hover:text-green-800 min-h-[44px] font-medium"
            >
              <ChevronLeft className="w-4 h-4" /> Cambiar sucursal
            </button>

            <ContextoBadge product={selectedProduct} sucursal={selectedSucursal} />

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">

              {/* Cantidad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad a ingresar <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Cuántas unidades están entrando en esta operación.
                </p>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  autoFocus
                  placeholder="Ej: 24"
                  className="w-full px-4 py-3 text-lg rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  value={cantidad}
                  onChange={(e) => { setCantidad(e.target.value); setFormError(''); }}
                />
                {cantidad !== '' && !isNaN(parseFloat(cantidad)) && parseFloat(cantidad) > 0 && (
                  <p className="text-sm mt-2 font-medium text-green-600">
                    ▲ Stock quedará en{' '}
                    {(selectedSucursal.currentStock + parseFloat(cantidad)).toFixed(2)} uds
                  </p>
                )}
              </div>

              {/* Origen / Proveedor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Origen / Proveedor{' '}
                  <span className="text-xs text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Fábrica San José, mercado central..."
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  value={origen}
                  maxLength={150}
                  onChange={(e) => setOrigen(e.target.value)}
                />
                <p className="text-xs text-gray-400 text-right mt-0.5">{origen.length}/150</p>
              </div>

              {/* Motivo con chips */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {MOTIVO_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleChipClick(chip)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors min-h-[36px] ${
                        motivo === chip
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-green-400 hover:text-green-700'
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <textarea
                  placeholder="O escribe el motivo directamente..."
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none h-20"
                  value={motivo}
                  maxLength={255}
                  onChange={(e) => { setMotivo(e.target.value); setFormError(''); }}
                />
                <p className="text-xs text-gray-400 text-right">{motivo.length}/255</p>
              </div>

              {formError && <ErrorBanner message={formError} />}

              <button
                type="button"
                onClick={handleReviewIngreso}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 transition-colors min-h-[48px]"
              >
                Revisar ingreso <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: CONFIRM ──────────────────────────────────────────────── */}
        {step === 'confirm' && selectedProduct && selectedSucursal && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                Confirma el ingreso
              </h2>

              <dl className="space-y-3 text-sm">
                <SummaryRow label="Producto">
                  {selectedProduct.nombre}{' '}
                  <span className="text-gray-400">({selectedProduct.codigo_producto})</span>
                </SummaryRow>
                <SummaryRow label="Sucursal">{selectedSucursal.nombre}</SummaryRow>

                <hr className="border-gray-100" />

                {/* Stock equation */}
                <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-3">
                  <p className="text-xs text-green-600 font-medium uppercase tracking-wide mb-2">
                    Cálculo de stock
                  </p>
                  <div className="flex items-center gap-2 text-sm font-medium flex-wrap">
                    <span className="text-gray-700">{selectedSucursal.currentStock} uds</span>
                    <Plus className="w-4 h-4 text-green-600 shrink-0" />
                    <span className="text-green-700 font-bold">{cantidadNum} uds</span>
                    <span className="text-gray-400">=</span>
                    <span className="text-gray-900 font-bold text-base">
                      {stockNuevo.toFixed(2)} uds
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Stock actual + Ingreso = Stock nuevo</p>
                </div>

                <hr className="border-gray-100" />

                {origen && <SummaryRow label="Origen">{origen}</SummaryRow>}

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
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 disabled:opacity-60 min-h-[48px] transition-colors"
              >
                {submitting ? 'Registrando...' : 'Registrar ingreso'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 5: RECEIPT ──────────────────────────────────────────────── */}
        {step === 'receipt' && receipt && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

              {/* Receipt header */}
              <div className="bg-green-50 border-b border-green-100 px-6 py-4 flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-800">Ingreso registrado correctamente</p>
                  <p className="text-xs text-green-600 mt-0.5">{receipt.fecha}</p>
                </div>
              </div>

              {/* Receipt body */}
              <div className="p-6">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  Comprobante de Ingreso
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

                  {/* Stock equation in receipt */}
                  <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-3">
                    <p className="text-xs text-green-600 font-medium uppercase tracking-wide mb-2">
                      Stock
                    </p>
                    <div className="flex items-center gap-2 text-sm font-medium flex-wrap">
                      <span className="text-gray-600">{receipt.stockAnterior} uds</span>
                      <Plus className="w-4 h-4 text-green-600 shrink-0" />
                      <span className="text-green-700 font-bold">
                        +{receipt.cantidadIngresada} uds
                      </span>
                      <span className="text-gray-400">=</span>
                      <span className="text-gray-900 font-bold text-base">
                        {receipt.stockNuevo.toFixed(2)} uds
                      </span>
                    </div>
                  </div>

                  <hr className="border-gray-100" />

                  {receipt.origen && (
                    <SummaryRow label="Origen">{receipt.origen}</SummaryRow>
                  )}
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
              onClick={handleNuevoIngreso}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 min-h-[48px] transition-colors"
            >
              <PackagePlus className="w-4 h-4" /> Nuevo ingreso
            </button>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────

function ProductoBadge({ product }: { product: ProductoConStock }) {
  return (
    <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-3">
      <p className="text-xs text-green-500 uppercase tracking-wide font-medium mb-0.5">
        Producto
      </p>
      <p className="font-semibold text-green-900">{product.nombre}</p>
      <p className="text-xs text-green-600 mt-0.5">
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
    <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-3">
      <p className="text-xs text-green-500 uppercase tracking-wide font-medium mb-0.5">
        {sucursal.nombre}
      </p>
      <p className="font-semibold text-green-900">{product.nombre}</p>
      <p className="text-sm text-green-700 mt-1">
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
