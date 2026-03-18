'use client';

import { useState, useEffect, useRef, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { getApiClient } from '@/lib/api';

interface PageProps {
    params: Promise<{ id: string }>;
}

const formatFecha = (val: string | null | undefined) => {
    if (!val) return '—';
    const d = new Date(val);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })
        + ' ' + d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
};

export default function AuditoriaDetailPage(props: PageProps) {
    const params = use(props.params);
    const id = params.id;
    const [auditoria, setAuditoria] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoriaInput, setCategoriaInput] = useState('');
    const [selectedCategoria, setSelectedCategoria] = useState<string | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [saving, setSaving] = useState(false);
    const categoriaRef = useRef<HTMLDivElement>(null);

    const router = useRouter();
    const apiClient = getApiClient();

    useEffect(() => {
        loadDetalle();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (categoriaRef.current && !categoriaRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const loadDetalle = async () => {
        setLoading(true);
        try {
            const res = await apiClient.getAuditoria(Number(id));
            if (!res) throw new Error('No data');
            setAuditoria(res);
            const mappedItems = ((res as any).detalles || []).map((d: any) => ({
                id: d.id,
                producto_id: d.producto,
                codigo: d.producto_codigo || '—',
                nombre: d.producto_nombre || 'Producto',
                categoria: d.categoria_nombre || 'General',
                stock_sistema: d.cantidad_sistema,
                conteo_fisico: d.cantidad_fisica,
                diferencia: d.diferencia,
                modificado: false,
            }));
            setItems(mappedItems);
        } catch (error) {
            console.error(error);
            alert('Error al cargar auditoría');
        } finally {
            setLoading(false);
        }
    };

    const handleConteoChange = (itemId: number, cantidad: string) => {
        setItems(prev => prev.map(item => {
            if (item.id !== itemId) return item;
            const val = cantidad === '' ? null : parseFloat(cantidad);
            const diff = val !== null ? val - Number(item.stock_sistema) : null;
            return { ...item, conteo_fisico: val, diferencia: diff, modificado: true };
        }));
    };

    const guardarAvance = async () => {
        setSaving(true);
        try {
            const payload = items
                .filter(i => i.conteo_fisico !== null && i.conteo_fisico !== undefined)
                .map(i => ({ id: i.id, cantidad_fisica: i.conteo_fisico }));
            if (payload.length > 0) {
                await apiClient.updateAuditoriaCount(Number(id), payload);
                await loadDetalle();
            }
            alert('Avance guardado.');
        } catch (error) {
            console.error(error);
            alert('Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const finalizarAuditoria = async () => {
        if (!confirm('¿Finalizar la auditoría? Esto cerrará el conteo y generará el reporte final.')) return;
        try {
            await guardarAvance();
            await apiClient.finalizeAuditoria(Number(id));
            alert('Auditoría finalizada correctamente.');
            router.push('/inventario/auditoria');
        } catch (error: any) {
            alert(error.message || 'Error al finalizar');
        }
    };

    // Unique sorted categories derived from loaded items
    const categoriasUnicas = useMemo(
        () => [...new Set(items.map(i => i.categoria))].sort(),
        [items]
    );

    const suggestions = categoriaInput.trim() === ''
        ? categoriasUnicas
        : categoriasUnicas.filter(c => c.toLowerCase().includes(categoriaInput.toLowerCase()));

    const filteredItems = items.filter(item => {
        const matchesSearch =
            item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.codigo.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategoria = selectedCategoria === null || item.categoria === selectedCategoria;
        return matchesSearch && matchesCategoria;
    });

    const contados = items.filter(i => i.conteo_fisico !== null && i.conteo_fisico !== undefined).length;
    const isPendiente = auditoria?.estado === 'PENDIENTE';

    if (loading) return <DashboardLayout><div className="p-8 text-center text-gray-400">Cargando...</div></DashboardLayout>;
    if (!auditoria) return <DashboardLayout><div className="p-8 text-center text-gray-500">Auditoría no encontrada</div></DashboardLayout>;

    return (
        <DashboardLayout>
            <div className="p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-sm">← Volver</button>
                            <h1 className="text-xl font-bold text-gray-800">Auditoría #{auditoria.id}</h1>
                            <span className={`px-2 py-0.5 text-xs rounded-full font-bold
                                ${auditoria.estado === 'FINALIZADA' ? 'bg-green-100 text-green-800' :
                                  auditoria.estado === 'AJUSTADA' ? 'bg-blue-100 text-blue-800' :
                                  'bg-yellow-100 text-yellow-800'}`}>
                                {auditoria.estado}
                            </span>
                        </div>
                        <p className="text-gray-500 text-sm mt-1">
                            Inicio: {formatFecha(auditoria.fecha_creacion)}
                            {auditoria.fecha_finalizacion && (
                                <> · Fin: {formatFecha(auditoria.fecha_finalizacion)}</>
                            )}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Contados: <span className="font-semibold text-gray-600">{contados}</span> / {items.length}
                        </p>
                    </div>

                    {isPendiente && (
                        <div className="flex gap-2 w-full md:w-auto">
                            <button
                                onClick={guardarAvance}
                                disabled={saving}
                                className="flex-1 md:flex-none px-4 py-2 border border-gray-300 bg-white rounded text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm"
                            >
                                {saving ? 'Guardando...' : 'Guardar Avance'}
                            </button>
                            <button
                                onClick={finalizarAuditoria}
                                disabled={saving}
                                className="flex-1 md:flex-none px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 shadow-sm disabled:opacity-50 text-sm"
                            >
                                Finalizar
                            </button>
                        </div>
                    )}
                </div>

                {/* Buscador + filtro de categoría */}
                <div className="mb-4 flex flex-col sm:flex-row gap-2">
                    <input
                        type="text"
                        placeholder="Buscar por nombre o código..."
                        className="flex-1 p-2 border rounded shadow-sm text-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />

                    {/* Autocomplete de categoría */}
                    <div ref={categoriaRef} className="relative sm:w-56">
                        <div className={`flex items-center border rounded shadow-sm bg-white ${showSuggestions ? 'ring-2 ring-indigo-500 border-indigo-500' : ''}`}>
                            <input
                                type="text"
                                placeholder="Categoría..."
                                className="flex-1 p-2 text-sm bg-transparent outline-none min-w-0"
                                value={selectedCategoria !== null ? selectedCategoria : categoriaInput}
                                onFocus={() => {
                                    if (selectedCategoria !== null) setCategoriaInput('');
                                    setShowSuggestions(true);
                                }}
                                onChange={e => {
                                    setCategoriaInput(e.target.value);
                                    setSelectedCategoria(null);
                                    setShowSuggestions(true);
                                }}
                            />
                            {selectedCategoria !== null && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedCategoria(null);
                                        setCategoriaInput('');
                                    }}
                                    className="px-2 text-gray-400 hover:text-gray-600"
                                    title="Limpiar filtro"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Suggestions dropdown */}
                        {showSuggestions && suggestions.length > 0 && (
                            <ul className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                                {suggestions.map(cat => (
                                    <li key={cat}>
                                        <button
                                            type="button"
                                            onMouseDown={e => e.preventDefault()} // evita blur antes del click
                                            onClick={() => {
                                                setSelectedCategoria(cat);
                                                setCategoriaInput('');
                                                setShowSuggestions(false);
                                            }}
                                            className={`w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-colors ${
                                                selectedCategoria === cat ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'
                                            }`}
                                        >
                                            {cat}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Tabla desktop */}
                <div className="hidden md:block bg-white rounded-lg shadow overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stock Sistema</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Conteo Físico</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Diferencia</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredItems.length === 0 && (
                                <tr><td colSpan={6} className="p-6 text-center text-gray-400">Sin productos{(searchTerm || selectedCategoria) && ' con ese criterio'}.</td></tr>
                            )}
                            {filteredItems.map((item) => (
                                <tr key={item.id} className={`hover:bg-gray-50 ${item.modificado ? 'bg-blue-50/30' : ''}`}>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-mono">{item.codigo}</td>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.nombre}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{item.categoria}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                                        {Number(item.stock_sistema).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right">
                                        {isPendiente ? (
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className={`w-24 p-1 border rounded text-right text-sm focus:ring-2 focus:ring-indigo-500
                                                    ${item.conteo_fisico !== null && item.conteo_fisico !== undefined
                                                        ? 'bg-blue-50 border-blue-300'
                                                        : 'bg-white border-gray-300'}`}
                                                value={item.conteo_fisico === null || item.conteo_fisico === undefined ? '' : item.conteo_fisico}
                                                onChange={(e) => handleConteoChange(item.id, e.target.value)}
                                                placeholder="0.00"
                                            />
                                        ) : (
                                            <span className="text-sm font-semibold">
                                                {item.conteo_fisico !== null && item.conteo_fisico !== undefined
                                                    ? Number(item.conteo_fisico).toFixed(2) : '—'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold">
                                        {item.conteo_fisico !== null && item.conteo_fisico !== undefined ? (
                                            <span className={
                                                (item.diferencia ?? 0) < 0 ? 'text-red-600' :
                                                (item.diferencia ?? 0) > 0 ? 'text-green-600' : 'text-gray-400'
                                            }>
                                                {(item.diferencia ?? 0) > 0 ? '+' : ''}{Number(item.diferencia ?? 0).toFixed(2)}
                                            </span>
                                        ) : (
                                            <span className="text-gray-300">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Cards mobile */}
                <div className="md:hidden space-y-3">
                    {filteredItems.length === 0 && (
                        <div className="p-6 text-center bg-white rounded-lg shadow text-gray-400">
                            Sin productos{(searchTerm || selectedCategoria) && ' con ese criterio'}.
                        </div>
                    )}
                    {filteredItems.map((item) => (
                        <div key={item.id} className={`bg-white rounded-lg shadow p-4 space-y-3 ${item.modificado ? 'border-l-4 border-indigo-400' : ''}`}>
                            <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0">
                                    <div className="font-medium text-gray-900 truncate">{item.nombre}</div>
                                    <div className="text-xs text-gray-400 font-mono">{item.codigo} · {item.categoria}</div>
                                </div>
                                {item.conteo_fisico !== null && item.conteo_fisico !== undefined && (
                                    <span className={`text-sm font-bold shrink-0
                                        ${(item.diferencia ?? 0) < 0 ? 'text-red-600' :
                                          (item.diferencia ?? 0) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                        {(item.diferencia ?? 0) > 0 ? '+' : ''}{Number(item.diferencia ?? 0).toFixed(2)}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="text-sm text-gray-500">
                                    Sistema: <span className="font-semibold text-gray-700">{Number(item.stock_sistema).toFixed(2)}</span>
                                </div>
                                <div className="text-sm text-gray-500 flex items-center gap-1">
                                    Físico:
                                    {isPendiente ? (
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className={`w-20 p-1 border rounded text-right text-sm ml-1 focus:ring-2 focus:ring-indigo-500
                                                ${item.conteo_fisico !== null && item.conteo_fisico !== undefined
                                                    ? 'bg-blue-50 border-blue-300'
                                                    : 'bg-white border-gray-300'}`}
                                            value={item.conteo_fisico === null || item.conteo_fisico === undefined ? '' : item.conteo_fisico}
                                            onChange={(e) => handleConteoChange(item.id, e.target.value)}
                                            placeholder="0.00"
                                        />
                                    ) : (
                                        <span className="font-semibold text-gray-700 ml-1">
                                            {item.conteo_fisico !== null && item.conteo_fisico !== undefined
                                                ? Number(item.conteo_fisico).toFixed(2) : '—'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Botones flotantes en mobile cuando está pendiente */}
                {isPendiente && (
                    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 flex gap-2 z-10">
                        <button
                            onClick={guardarAvance}
                            disabled={saving}
                            className="flex-1 py-2 border border-gray-300 rounded text-gray-700 text-sm font-medium disabled:opacity-50"
                        >
                            {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button
                            onClick={finalizarAuditoria}
                            disabled={saving}
                            className="flex-1 py-2 bg-green-600 text-white rounded text-sm font-medium disabled:opacity-50"
                        >
                            Finalizar
                        </button>
                    </div>
                )}
                {/* Espacio para los botones flotantes en mobile */}
                {isPendiente && <div className="md:hidden h-16" />}
            </div>
        </DashboardLayout>
    );
}
