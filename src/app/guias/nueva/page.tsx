'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { getApiClient } from '@/lib/api';
import { Truck, ShoppingCart, Search, ArrowRight, User, AlertCircle } from 'lucide-react';

type TrasladoStep = 'sucursales' | 'carrito' | 'transportista' | 'confirmacion' | 'comprobante';

interface CartItem {
    producto_id: number;
    nombre: string;
    codigo: string;
    stock: number;
    cantidad: number;
}

interface Sucursal {
    id: number;
    nombre: string;
}

export default function NuevaGuiaPage() {
    const router = useRouter();
    const apiClient = getApiClient();
    const [mode, setMode] = useState<'SELECTION' | 'VENTA' | 'TRASLADO'>('SELECTION');

    // Venta Mode State
    const [facturas, setFacturas] = useState<any[]>([]);
    const [searchFactura, setSearchFactura] = useState('');
    const [selectedFactura, setSelectedFactura] = useState<any>(null);
    const [loadingFacturas, setLoadingFacturas] = useState(false);

    // Transportista Form (Venta)
    const [transportista, setTransportista] = useState({ ruc: '', razon_social: '', placa: '' });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Traslado State
    const [trasladoStep, setTrasladoStep] = useState<TrasladoStep>('sucursales');
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [origenId, setOrigenId] = useState<number | null>(null);
    const [destinoId, setDestinoId] = useState<number | null>(null);
    const [searchProducto, setSearchProducto] = useState('');
    const [productosDisponibles, setProductosDisponibles] = useState<any[]>([]);
    const [loadingProductos, setLoadingProductos] = useState(false);
    const [cartTraslado, setCartTraslado] = useState<CartItem[]>([]);
    const [transportistaTraslado, setTransportistaTraslado] = useState({ ruc: '', razon_social: '', placa: '' });
    const [submittingTraslado, setSubmittingTraslado] = useState(false);
    const [guiaGenerada, setGuiaGenerada] = useState<string | null>(null);

    // Search Facturas (Venta)
    const searchFacturas = async (term: string) => {
        setLoadingFacturas(true);
        try {
            const res = await apiClient.getFacturas({ search: term, page: 1, estado_sri: 'AUT' });
            setFacturas(res.results);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingFacturas(false);
        }
    };

    useEffect(() => {
        if (mode === 'VENTA') {
            const timeout = setTimeout(() => searchFacturas(searchFactura), 500);
            return () => clearTimeout(timeout);
        }
    }, [searchFactura, mode]);

    // Load sucursales when entering TRASLADO mode
    useEffect(() => {
        if (mode === 'TRASLADO') {
            apiClient.getSucursalesList({ page_size: 50 })
                .then((res: any) => setSucursales(res.results ?? []))
                .catch(() => {});
        }
    }, [mode]);

    // Search productos by sucursal origen (debounced)
    useEffect(() => {
        if (mode !== 'TRASLADO' || trasladoStep !== 'carrito' || !origenId) return;
        const t = setTimeout(async () => {
            setLoadingProductos(true);
            try {
                const res = await apiClient.getProductos({
                    search: searchProducto,
                    sucursal: origenId,
                    activo: true,
                    page_size: 20,
                } as any);
                setProductosDisponibles((res as any).results || (res as any).data || []);
            } catch { /* silent */ } finally {
                setLoadingProductos(false);
            }
        }, 400);
        return () => clearTimeout(t);
    }, [searchProducto, origenId, trasladoStep, mode]);

    // Cart helpers
    const addToCart = (prod: any) => {
        setCartTraslado(prev => {
            if (prev.find(i => i.producto_id === prod.id)) return prev;
            return [...prev, {
                producto_id: prod.id,
                nombre: prod.nombre,
                codigo: prod.codigo_producto || '—',
                stock: prod.stock ?? 0,
                cantidad: 1,
            }];
        });
    };

    const updateCartQty = (producto_id: number, qty: number) => {
        if (qty < 1) return;
        setCartTraslado(prev => prev.map(i => i.producto_id === producto_id ? { ...i, cantidad: qty } : i));
    };

    const removeFromCart = (producto_id: number) => {
        setCartTraslado(prev => prev.filter(i => i.producto_id !== producto_id));
    };

    const handleSubmitTraslado = async () => {
        if (!origenId || !destinoId || cartTraslado.length === 0) return;
        setSubmittingTraslado(true);
        setError('');
        try {
            const res = await apiClient.trasladoBulk({
                origen_id: origenId,
                destino_id: destinoId,
                productos: cartTraslado.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad })),
                generar_guia: true,
                transportista: {
                    ruc: transportistaTraslado.ruc,
                    razon_social: transportistaTraslado.razon_social,
                    placa: transportistaTraslado.placa || undefined,
                },
            });
            setGuiaGenerada(res.guia_numero);
            setTrasladoStep('comprobante');
        } catch (err: any) {
            setError(err.message || 'Error al procesar el traslado');
        } finally {
            setSubmittingTraslado(false);
        }
    };

    const handleSubmitVenta = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!selectedFactura) { setError('Debe seleccionar una factura.'); return; }
        if (!transportista.ruc || !transportista.razon_social || !transportista.placa) {
            setError('Todos los datos del transportista son obligatorios.');
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                tipo_guia: 'VENTA',
                factura_id: selectedFactura.id,
                transportista: { ruc: transportista.ruc, razon_social: transportista.razon_social, placa: transportista.placa },
                destinatario: {}
            };
            await apiClient.crearGuia(payload);
            router.push('/guias');
        } catch (err: any) {
            setError(err.message || 'Error al crear la guía');
        } finally {
            setSubmitting(false);
        }
    };

    // ── SELECTION ───────────────────────────────────────────────────────────
    if (mode === 'SELECTION') {
        return (
            <DashboardLayout>
                <div className="max-w-4xl mx-auto p-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Nueva Guía de Remisión</h1>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div
                            onClick={() => setMode('VENTA')}
                            className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all group"
                        >
                            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors">
                                <ShoppingCart className="w-8 h-8 text-indigo-600 group-hover:text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Por Venta a Cliente</h3>
                            <p className="text-gray-500">Generar guía a partir de una Factura existente. Utiliza los datos del cliente y productos de la factura.</p>
                        </div>

                        <div
                            onClick={() => setMode('TRASLADO')}
                            className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:border-green-500 hover:shadow-md cursor-pointer transition-all group"
                        >
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-green-600 transition-colors">
                                <Truck className="w-8 h-8 text-green-600 group-hover:text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Traslado entre Sucursales</h3>
                            <p className="text-gray-500">Mover mercadería entre mis propios locales. Selecciona los productos y genera la guía automáticamente.</p>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    // ── TRASLADO ─────────────────────────────────────────────────────────────
    if (mode === 'TRASLADO') {
        const stepLabels = ['Sucursales', 'Productos', 'Transportista', 'Confirmar'];
        const stepIndex = { sucursales: 0, carrito: 1, transportista: 2, confirmacion: 3, comprobante: 4 }[trasladoStep];

        return (
            <DashboardLayout>
                <div className="max-w-3xl mx-auto p-6">
                    <button
                        onClick={() => { setMode('SELECTION'); setTrasladoStep('sucursales'); setCartTraslado([]); setGuiaGenerada(null); setError(''); }}
                        className="mb-6 text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1"
                    >
                        ← Volver
                    </button>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900">Traslado entre Sucursales</h2>
                            {trasladoStep !== 'comprobante' && (
                                <div className="flex items-center gap-2 mt-3">
                                    {stepLabels.map((label, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < stepIndex ? 'bg-green-600 text-white' : i === stepIndex ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                                {i < stepIndex ? '✓' : i + 1}
                                            </div>
                                            <span className={`text-xs ${i === stepIndex ? 'text-green-700 font-semibold' : 'text-gray-400'}`}>{label}</span>
                                            {i < stepLabels.length - 1 && <span className="text-gray-300 mx-1">›</span>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-6">
                            {/* Step 1: Sucursales */}
                            {trasladoStep === 'sucursales' && (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Sucursal Origen</label>
                                        <select
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 min-h-[44px]"
                                            value={origenId ?? ''}
                                            onChange={e => setOrigenId(Number(e.target.value))}
                                        >
                                            <option value="">Seleccionar origen...</option>
                                            {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Sucursal Destino</label>
                                        <select
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 min-h-[44px]"
                                            value={destinoId ?? ''}
                                            onChange={e => setDestinoId(Number(e.target.value))}
                                        >
                                            <option value="">Seleccionar destino...</option>
                                            {sucursales.filter(s => s.id !== origenId).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                        </select>
                                    </div>
                                    <button
                                        onClick={() => setTrasladoStep('carrito')}
                                        disabled={!origenId || !destinoId}
                                        className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-40 min-h-[44px]"
                                    >
                                        Continuar → Agregar Productos
                                    </button>
                                </div>
                            )}

                            {/* Step 2: Carrito */}
                            {trasladoStep === 'carrito' && (
                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        placeholder="Buscar producto por nombre o código..."
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                        value={searchProducto}
                                        onChange={e => setSearchProducto(e.target.value)}
                                        autoFocus
                                    />

                                    {loadingProductos && <p className="text-sm text-gray-400">Buscando...</p>}
                                    {productosDisponibles.length > 0 && (
                                        <div className="border border-gray-200 rounded-lg divide-y max-h-48 overflow-y-auto">
                                            {productosDisponibles.map(prod => {
                                                const enCarrito = cartTraslado.some(i => i.producto_id === prod.id);
                                                const stock = prod.stock ?? 0;
                                                return (
                                                    <div key={prod.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">{prod.nombre}</p>
                                                            <p className="text-xs text-gray-500">{prod.codigo_producto || 'S/C'} · Stock: {stock}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => addToCart(prod)}
                                                            disabled={enCarrito || stock === 0}
                                                            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-40 min-h-[36px]"
                                                        >
                                                            {enCarrito ? 'Agregado ✓' : '+ Agregar'}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {cartTraslado.length > 0 && (
                                        <div className="border border-green-200 rounded-lg bg-green-50 divide-y divide-green-100">
                                            <div className="px-4 py-2 text-xs font-semibold text-green-700 uppercase tracking-wide">
                                                Productos a transferir ({cartTraslado.length})
                                            </div>
                                            {cartTraslado.map(item => (
                                                <div key={item.producto_id} className="flex items-center gap-3 p-3">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 truncate">{item.nombre}</p>
                                                        <p className="text-xs text-gray-500">{item.codigo}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => updateCartQty(item.producto_id, item.cantidad - 1)}
                                                            disabled={item.cantidad <= 1}
                                                            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 font-bold"
                                                        >−</button>
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            value={String(item.cantidad)}
                                                            onFocus={e => e.target.select()}
                                                            onChange={e => {
                                                                const v = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10);
                                                                if (!isNaN(v) && v >= 1) updateCartQty(item.producto_id, v);
                                                            }}
                                                            className="w-12 min-h-[36px] text-center font-bold border border-gray-300 rounded bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => updateCartQty(item.producto_id, item.cantidad + 1)}
                                                            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 font-bold"
                                                        >+</button>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFromCart(item.producto_id)}
                                                        className="text-red-400 hover:text-red-600 text-sm p-1"
                                                    >✕</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex gap-3 pt-2">
                                        <button onClick={() => setTrasladoStep('sucursales')} className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 min-h-[44px]">
                                            ← Volver
                                        </button>
                                        <button
                                            onClick={() => setTrasladoStep('transportista')}
                                            disabled={cartTraslado.length === 0}
                                            className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-40 min-h-[44px]"
                                        >
                                            Continuar → Transportista
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Transportista */}
                            {trasladoStep === 'transportista' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 uppercase mb-1">RUC / Cédula Chofer</label>
                                        <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                            value={transportistaTraslado.ruc}
                                            onChange={e => setTransportistaTraslado(p => ({ ...p, ruc: e.target.value }))}
                                            placeholder="171..." />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 uppercase mb-1">Nombre / Razón Social</label>
                                        <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                            value={transportistaTraslado.razon_social}
                                            onChange={e => setTransportistaTraslado(p => ({ ...p, razon_social: e.target.value }))}
                                            placeholder="Juan Pérez" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 uppercase mb-1">Placa Vehículo (opcional)</label>
                                        <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                            value={transportistaTraslado.placa}
                                            onChange={e => setTransportistaTraslado(p => ({ ...p, placa: e.target.value }))}
                                            placeholder="PBA-1234" />
                                    </div>
                                    {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
                                    <div className="flex gap-3 pt-2">
                                        <button onClick={() => setTrasladoStep('carrito')} className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 min-h-[44px]">
                                            ← Volver
                                        </button>
                                        <button
                                            onClick={() => { setError(''); setTrasladoStep('confirmacion'); }}
                                            disabled={!transportistaTraslado.ruc || !transportistaTraslado.razon_social}
                                            className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-40 min-h-[44px]"
                                        >
                                            Continuar → Confirmar
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Confirmación */}
                            {trasladoStep === 'confirmacion' && (
                                <div className="space-y-4">
                                    <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                                        <div className="flex justify-between"><span className="text-gray-500">Origen</span><span className="font-medium">{sucursales.find(s => s.id === origenId)?.nombre}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-500">Destino</span><span className="font-medium">{sucursales.find(s => s.id === destinoId)?.nombre}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-500">Transportista</span><span className="font-medium">{transportistaTraslado.razon_social}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-500">Productos</span><span className="font-medium">{cartTraslado.length} ítem(s)</span></div>
                                    </div>
                                    <div className="border border-gray-200 rounded-lg divide-y">
                                        {cartTraslado.map(item => (
                                            <div key={item.producto_id} className="flex justify-between items-center px-4 py-2 text-sm">
                                                <span className="text-gray-800">{item.nombre}</span>
                                                <span className="font-bold text-gray-900">{item.cantidad} uds</span>
                                            </div>
                                        ))}
                                    </div>
                                    {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
                                    <div className="flex gap-3 pt-2">
                                        <button onClick={() => setTrasladoStep('transportista')} className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 min-h-[44px]">
                                            ← Volver
                                        </button>
                                        <button
                                            onClick={handleSubmitTraslado}
                                            disabled={submittingTraslado}
                                            className="flex-1 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 min-h-[44px]"
                                        >
                                            {submittingTraslado ? 'Procesando...' : 'Confirmar Traslado'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 5: Comprobante */}
                            {trasladoStep === 'comprobante' && (
                                <div className="text-center space-y-4 py-4">
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                        <span className="text-3xl text-green-600">✓</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">Traslado completado</h3>
                                    {guiaGenerada ? (
                                        <p className="text-sm text-gray-600">Guía de Remisión: <span className="font-mono font-bold text-green-700">{guiaGenerada}</span></p>
                                    ) : (
                                        <p className="text-sm text-gray-500">El stock fue transferido. La guía se procesará en segundo plano.</p>
                                    )}
                                    <p className="text-sm text-gray-500">
                                        {sucursales.find(s => s.id === origenId)?.nombre} → {sucursales.find(s => s.id === destinoId)?.nombre}
                                        <br />{cartTraslado.length} producto(s) transferido(s)
                                    </p>
                                    <div className="flex gap-3 justify-center pt-2">
                                        <button
                                            onClick={() => { setTrasladoStep('sucursales'); setCartTraslado([]); setGuiaGenerada(null); setOrigenId(null); setDestinoId(null); setTransportistaTraslado({ ruc: '', razon_social: '', placa: '' }); }}
                                            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                                        >
                                            Nuevo traslado
                                        </button>
                                        <button
                                            onClick={() => router.push('/guias')}
                                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                        >
                                            Ver guías
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    // ── VENTA ────────────────────────────────────────────────────────────────
    return (
        <DashboardLayout>
            <div className="max-w-3xl mx-auto p-6">
                <button
                    onClick={() => setMode('SELECTION')}
                    className="mb-6 text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1"
                >
                    ← Volver
                </button>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900">Nueva Guía por Venta</h2>
                        <p className="text-sm text-gray-500">Seleccione la factura y asigne el transportista</p>
                    </div>

                    <div className="p-6 space-y-8">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Buscar Factura Autorizada</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Buscar por cliente o número..."
                                    value={searchFactura}
                                    onChange={(e) => setSearchFactura(e.target.value)}
                                />
                            </div>

                            {loadingFacturas && <p className="text-sm text-gray-400 mt-2">Buscando...</p>}
                            <div className="mt-2 max-h-60 overflow-y-auto border border-gray-100 rounded-lg">
                                {facturas.map(f => (
                                    <div
                                        key={f.id}
                                        onClick={() => { setSelectedFactura(f); setSearchFactura(''); }}
                                        className={`p-3 cursor-pointer hover:bg-gray-50 flex justify-between items-center ${selectedFactura?.id === f.id ? 'bg-indigo-50 border-indigo-200' : ''}`}
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{f.numero_autorizacion} - {f.cliente_nombre}</p>
                                            <p className="text-xs text-gray-500">{f.fecha_emision} | Total: ${f.total_con_impuestos}</p>
                                        </div>
                                        {selectedFactura?.id === f.id && <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>}
                                    </div>
                                ))}
                            </div>

                            {selectedFactura && (
                                <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-100 flex items-start gap-3">
                                    <div className="p-2 bg-indigo-100 rounded-full">
                                        <FileText className="w-5 h-5 text-indigo-700" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-indigo-900">Factura Seleccionada</p>
                                        <p className="text-sm text-indigo-700">{selectedFactura.numero_autorizacion}</p>
                                        <p className="text-xs text-indigo-600">Cliente: {selectedFactura.cliente_nombre}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-gray-100 pt-6">
                            <h3 className="text-md font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <User className="w-5 h-5 text-gray-500" />
                                Datos del Transportista
                            </h3>
                            <div className="grid gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 uppercase mb-1">Cédula / RUC Chofer</label>
                                    <input type="text" className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        value={transportista.ruc} onChange={e => setTransportista({ ...transportista, ruc: e.target.value })} placeholder="171..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 uppercase mb-1">Nombre / Razón Social</label>
                                    <input type="text" className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        value={transportista.razon_social} onChange={e => setTransportista({ ...transportista, razon_social: e.target.value })} placeholder="Juan Perez" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 uppercase mb-1">Placa Vehículo</label>
                                    <input type="text" className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        value={transportista.placa} onChange={e => setTransportista({ ...transportista, placa: e.target.value })} placeholder="PBA-1234" />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end pt-4">
                            <button
                                onClick={handleSubmitVenta}
                                disabled={submitting}
                                className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-shadow shadow-md flex items-center gap-2 disabled:opacity-50"
                            >
                                {submitting ? 'Generando...' : 'Generar Guía'}
                                {!submitting && <ArrowRight className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

function FileText({ className }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
    );
}
