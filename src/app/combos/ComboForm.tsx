'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/useDebounce';
import { getApiClient } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type Sucursal = { id: number; nombre: string };
type Categoria = { id: number; nombre: string };
type Presentacion = { id: number; nombre_presentacion: string; sucursal: number; precio: number };
type ProductoResult = { id: number; nombre: string; codigo_producto?: string };

type ComboItemRow = {
    _key: number;
    producto_id: number;
    producto_nombre: string;
    presentacion_id: number;
    presentaciones: Presentacion[];
    cantidad: string;
};

type SlotRow = {
    _key: number;
    nombre: string;
    cantidad: string;
    obligatorio: boolean;
    orden: number;
    categorias: number[]; // IDs
};

export type ComboFormInitialData = {
    id?: number;
    nombre: string;
    descripcion: string;
    precio: string;
    sucursal: number;
    activo: boolean;
    items: { id?: number; producto: number; producto_nombre: string; presentacion: number; presentacion_nombre: string; cantidad: string }[];
    slots: { id?: number; nombre: string; cantidad: string; obligatorio: boolean; orden: number; categorias?: number[] }[];
};

interface ComboFormProps {
    initialData?: ComboFormInitialData;
    comboId?: number;
}

let _keySeq = 1;
const nextKey = () => _keySeq++;

// ─── Component ────────────────────────────────────────────────────────────────

export default function ComboForm({ initialData, comboId }: ComboFormProps) {
    const router = useRouter();
    const isEditing = !!comboId;

    // Datos básicos
    const [nombre, setNombre] = useState(initialData?.nombre ?? '');
    const [descripcion, setDescripcion] = useState(initialData?.descripcion ?? '');
    const [precio, setPrecio] = useState(initialData?.precio ?? '');
    const [sucursalId, setSucursalId] = useState<number | ''>(initialData?.sucursal ?? '');
    const [activo, setActivo] = useState(initialData?.activo ?? true);

    // Items fijos
    const [items, setItems] = useState<ComboItemRow[]>(() =>
        (initialData?.items ?? []).map(it => ({
            _key: nextKey(),
            producto_id: it.producto,
            producto_nombre: it.producto_nombre,
            presentacion_id: it.presentacion,
            presentaciones: [],
            cantidad: it.cantidad,
        }))
    );

    // Slots variables
    const [slots, setSlots] = useState<SlotRow[]>(() =>
        (initialData?.slots ?? []).map(sl => ({
            _key: nextKey(),
            nombre: sl.nombre,
            cantidad: sl.cantidad,
            obligatorio: sl.obligatorio,
            orden: sl.orden,
            categorias: sl.categorias ?? [],
        }))
    );

    // Catálogos
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);

    // Búsqueda de productos para agregar items
    const [productSearch, setProductSearch] = useState('');
    const debouncedProductSearch = useDebounce(productSearch, 400);
    const [productResults, setProductResults] = useState<ProductoResult[]>([]);
    const [searchingProducts, setSearchingProducts] = useState(false);

    // UI
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Cargar catálogos
    useEffect(() => {
        const api = getApiClient();
        api.getSucursalesList().then(r => {
            const list = (r as any).results ?? (r as any).data ?? [];
            setSucursales(list);
        }).catch(() => {});
        api.getCategorias().then(r => { if (r.success && r.data) setCategorias(r.data); }).catch(() => {});
    }, []);

    // Cargar presentaciones de items existentes al montar (solo edición)
    useEffect(() => {
        if (!initialData?.items?.length || !initialData.sucursal) return;
        const api = getApiClient();
        Promise.all(
            initialData.items.map(it => api.getPresentaciones(it.producto))
        ).then(results => {
            setItems(prev => prev.map((row, i) => {
                const r = results[i];
                const pres: Presentacion[] = r?.success ? (r as any).data ?? [] : [];
                return { ...row, presentaciones: pres };
            }));
        }).catch(() => {});
    }, []);

    // Buscar productos
    useEffect(() => {
        if (!debouncedProductSearch.trim()) { setProductResults([]); return; }
        setSearchingProducts(true);
        const api = getApiClient();
        api.getProductos({ search: debouncedProductSearch, activo: true, page_size: 8 })
            .then(r => {
                const list = (r as any).results ?? (r as any).data ?? [];
                setProductResults(list);
            })
            .catch(() => {})
            .finally(() => setSearchingProducts(false));
    }, [debouncedProductSearch]);

    // Agregar producto como item
    const handleSelectProducto = async (prod: ProductoResult) => {
        setProductSearch('');
        setProductResults([]);
        const api = getApiClient();
        let pres: Presentacion[] = [];
        try {
            const r = await api.getPresentaciones(prod.id);
            pres = r?.success ? (r as any).data ?? [] : [];
        } catch {}

        // Filtrar por sucursal seleccionada si aplica
        const filtered = sucursalId ? pres.filter((p: any) => p.sucursal === sucursalId || p.sucursal === undefined) : pres;
        const presToUse = filtered.length ? filtered : pres;

        setItems(prev => [...prev, {
            _key: nextKey(),
            producto_id: prod.id,
            producto_nombre: prod.nombre,
            presentacion_id: presToUse[0]?.id ?? 0,
            presentaciones: presToUse,
            cantidad: '1.00',
        }]);
    };

    const updateItem = (key: number, field: Partial<ComboItemRow>) => {
        setItems(prev => prev.map(it => it._key === key ? { ...it, ...field } : it));
    };

    const removeItem = (key: number) => {
        setItems(prev => prev.filter(it => it._key !== key));
    };

    // Slots
    const addSlot = () => {
        setSlots(prev => [...prev, {
            _key: nextKey(),
            nombre: '',
            cantidad: '1.00',
            obligatorio: true,
            orden: prev.length + 1,
            categorias: [],
        }]);
    };

    const updateSlot = (key: number, field: Partial<SlotRow>) => {
        setSlots(prev => prev.map(sl => sl._key === key ? { ...sl, ...field } : sl));
    };

    const toggleSlotCategoria = (slotKey: number, catId: number) => {
        setSlots(prev => prev.map(sl => {
            if (sl._key !== slotKey) return sl;
            const has = sl.categorias.includes(catId);
            return { ...sl, categorias: has ? sl.categorias.filter(c => c !== catId) : [...sl.categorias, catId] };
        }));
    };

    const removeSlot = (key: number) => {
        setSlots(prev => prev.filter(sl => sl._key !== key));
    };

    // Guardar
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!nombre.trim()) { setError('El nombre es obligatorio'); return; }
        if (!precio || parseFloat(precio) <= 0) { setError('El precio debe ser mayor que cero'); return; }
        if (!sucursalId) { setError('Selecciona una sucursal'); return; }
        if (items.length === 0) { setError('Agrega al menos un producto fijo'); return; }
        if (items.some(it => !it.presentacion_id)) { setError('Todos los items deben tener una presentación seleccionada'); return; }

        for (const sl of slots) {
            if (!sl.nombre.trim()) { setError('Todos los slots deben tener nombre'); return; }
            if (sl.categorias.length === 0) { setError(`El slot "${sl.nombre}" debe tener al menos una categoría`); return; }
        }

        const payload: any = {
            nombre: nombre.trim(),
            descripcion: descripcion.trim(),
            precio: parseFloat(precio).toFixed(2),
            sucursal: sucursalId,
            activo,
            items_write: items.map(it => ({
                producto: it.producto_id,
                presentacion: it.presentacion_id,
                cantidad: parseFloat(it.cantidad).toFixed(2),
            })),
            slots_write: slots.map(sl => ({
                nombre: sl.nombre.trim(),
                cantidad: parseFloat(sl.cantidad).toFixed(2),
                obligatorio: sl.obligatorio,
                orden: sl.orden,
                categorias: sl.categorias,
                productos: [],
            })),
        };

        setSaving(true);
        try {
            const api = getApiClient();
            if (isEditing) {
                await api.actualizarCombo(comboId!, payload);
            } else {
                await api.crearCombo(payload);
            }
            router.push('/combos');
        } catch (err: any) {
            const msg = err?.data
                ? Object.entries(err.data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
                : err?.message || 'Error al guardar';
            setError(msg);
        } finally {
            setSaving(false);
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
            )}

            {/* ── Sección 1: Datos básicos ── */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-5">Datos básicos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                        <input
                            type="text"
                            value={nombre}
                            onChange={e => setNombre(e.target.value)}
                            placeholder="Ej: Combo Zhumir"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                        <textarea
                            value={descripcion}
                            onChange={e => setDescripcion(e.target.value)}
                            rows={2}
                            placeholder="Descripción opcional..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Precio fijo *</label>
                        <input
                            type="number"
                            value={precio}
                            onChange={e => setPrecio(e.target.value)}
                            step="0.01"
                            min="0.01"
                            placeholder="0.00"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal *</label>
                        <select
                            value={sucursalId}
                            onChange={e => setSucursalId(e.target.value ? Number(e.target.value) : '')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Selecciona una sucursal</option>
                            {sucursales.map(s => (
                                <option key={s.id} value={s.id}>{s.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setActivo(v => !v)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${activo ? 'bg-blue-600' : 'bg-gray-300'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${activo ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                        <span className="text-sm text-gray-700">{activo ? 'Activo' : 'Inactivo'}</span>
                    </div>
                </div>
            </div>

            {/* ── Sección 2: Productos fijos ── */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Productos fijos</h2>
                <p className="text-sm text-gray-500 mb-5">Productos que siempre se descuentan al vender este combo. Mínimo 1.</p>

                {/* Buscador */}
                <div className="relative mb-4">
                    <input
                        type="text"
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                        placeholder="Buscar producto para agregar..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {(searchingProducts || productResults.length > 0) && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {searchingProducts && (
                                <div className="p-3 text-center text-sm text-gray-500">Buscando...</div>
                            )}
                            {!searchingProducts && productResults.map(prod => (
                                <button
                                    key={prod.id}
                                    type="button"
                                    onClick={() => handleSelectProducto(prod)}
                                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-0"
                                >
                                    <span className="font-medium text-gray-900">{prod.nombre}</span>
                                    {prod.codigo_producto && (
                                        <span className="ml-2 text-xs text-gray-400 font-mono">{prod.codigo_producto}</span>
                                    )}
                                </button>
                            ))}
                            {!searchingProducts && productResults.length === 0 && debouncedProductSearch && (
                                <div className="p-3 text-center text-sm text-gray-500">Sin resultados</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Lista de items */}
                {items.length === 0 ? (
                    <p className="text-sm text-gray-400 italic text-center py-4">Busca y selecciona al menos un producto</p>
                ) : (
                    <div className="space-y-3">
                        {items.map(item => (
                            <div key={item._key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{item.producto_nombre}</p>
                                    <div className="mt-1">
                                        <select
                                            value={item.presentacion_id}
                                            onChange={e => updateItem(item._key, { presentacion_id: Number(e.target.value) })}
                                            className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                        >
                                            {item.presentaciones.length === 0 && (
                                                <option value={item.presentacion_id}>Presentación #{item.presentacion_id}</option>
                                            )}
                                            {item.presentaciones.map(p => (
                                                <option key={p.id} value={p.id}>{p.nombre_presentacion}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <label className="text-xs text-gray-500">Cant.</label>
                                    <input
                                        type="number"
                                        value={item.cantidad}
                                        onChange={e => updateItem(item._key, { cantidad: e.target.value })}
                                        step="0.01"
                                        min="0.01"
                                        className="w-20 text-sm px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-right"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeItem(item._key)}
                                    className="text-red-500 hover:text-red-700 p-1"
                                    title="Quitar"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Sección 3: Slots variables ── */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-lg font-semibold text-gray-900">Slots variables</h2>
                    <button
                        type="button"
                        onClick={addSlot}
                        className="inline-flex items-center px-3 py-1.5 bg-amber-100 text-amber-800 text-sm font-medium rounded-lg hover:bg-amber-200 transition-colors"
                    >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Agregar slot
                    </button>
                </div>
                <p className="text-sm text-gray-500 mb-5">Opciones que el cajero elige en el momento de la venta (ej: mezcladora). Opcional.</p>

                {slots.length === 0 ? (
                    <p className="text-sm text-gray-400 italic text-center py-4">Sin slots variables — el cajero agrega el combo directo al carrito</p>
                ) : (
                    <div className="space-y-4">
                        {slots.map((slot, idx) => (
                            <div key={slot._key} className="border border-amber-200 bg-amber-50 rounded-lg p-4">
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">Slot {idx + 1}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeSlot(slot._key)}
                                        className="text-red-500 hover:text-red-700 p-0.5"
                                        title="Eliminar slot"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Nombre del slot *</label>
                                        <input
                                            type="text"
                                            value={slot.nombre}
                                            onChange={e => updateSlot(slot._key, { nombre: e.target.value })}
                                            placeholder="Ej: Mezcladora"
                                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Cantidad</label>
                                        <input
                                            type="number"
                                            value={slot.cantidad}
                                            onChange={e => updateSlot(slot._key, { cantidad: e.target.value })}
                                            step="0.01"
                                            min="0.01"
                                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Orden</label>
                                        <input
                                            type="number"
                                            value={slot.orden}
                                            onChange={e => updateSlot(slot._key, { orden: Number(e.target.value) })}
                                            min="0"
                                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 mb-4">
                                    <input
                                        type="checkbox"
                                        id={`obligatorio-${slot._key}`}
                                        checked={slot.obligatorio}
                                        onChange={e => updateSlot(slot._key, { obligatorio: e.target.checked })}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <label htmlFor={`obligatorio-${slot._key}`} className="text-sm text-gray-700">
                                        Obligatorio (el cajero debe seleccionar una opción)
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-2">
                                        Categorías permitidas * <span className="text-gray-400">(el cajero verá productos de estas categorías con stock)</span>
                                    </label>
                                    {categorias.length === 0 ? (
                                        <p className="text-xs text-gray-400">Cargando categorías...</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {categorias.map(cat => {
                                                const selected = slot.categorias.includes(cat.id);
                                                return (
                                                    <button
                                                        key={cat.id}
                                                        type="button"
                                                        onClick={() => toggleSlotCategoria(slot._key, cat.id)}
                                                        className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${selected
                                                            ? 'bg-amber-500 border-amber-500 text-white'
                                                            : 'bg-white border-gray-300 text-gray-700 hover:border-amber-400'
                                                        }`}
                                                    >
                                                        {cat.nombre}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Botones ── */}
            <div className="flex items-center justify-end gap-4 pb-8">
                <button
                    type="button"
                    onClick={() => router.push('/combos')}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {saving && (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    )}
                    {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear combo'}
                </button>
            </div>
        </form>
    );
}
