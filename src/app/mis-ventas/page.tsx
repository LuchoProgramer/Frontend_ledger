'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getApiClient } from '@/lib/api';
import { Factura } from '@/lib/types/ventas';

export default function MisVentasPage() {
    const router = useRouter();
    const [facturas, setFacturas] = useState<Factura[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const apiClient = getApiClient();

    const loadFacturas = async () => {
        setLoading(true);
        try {
            const res = await apiClient.getHistorialVentas({
                page,
                start_date: startDate,
                end_date: endDate,
                search
            });
            setFacturas(res.results);
            // Calculate total pages if count provided
            if (res.count) {
                setTotalPages(Math.ceil(res.count / 20));
            }
        } catch (error) {
            console.error('Error cargando facturas', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Debounce search slightly
        const timeout = setTimeout(() => {
            loadFacturas();
        }, 500);
        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, startDate, endDate, search]);

    // Auto-refresh para facturas en procesamiento
    useEffect(() => {
        const hasProcessing = facturas.some(f => f.estado_sri === 'PPR');
        if (!hasProcessing) return;

        const interval = setInterval(() => {
            loadFacturas();
        }, 10000);

        return () => clearTimeout(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [facturas]);

    const getEstadoBadge = (estado: string) => {
        const badges = {
            'AUT': { bg: 'bg-green-100', text: 'text-green-800', label: 'AUTORIZADO' },
            'PPR': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'PROCESANDO' },
            'NAT': { bg: 'bg-red-100', text: 'text-red-800', label: 'NO AUTORIZADO' },
            'DEV': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'DEVUELTA' },
        };
        const badge = badges[estado as keyof typeof badges] || { bg: 'bg-gray-100', text: 'text-gray-800', label: 'PENDIENTE' };
        return (
            <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${badge.bg} ${badge.text}`}>
                {badge.label}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Simple Header for Vendor */}
            <header className="bg-white shadow-sm border-b mb-6">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/')}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            ←
                        </button>
                        <h1 className="text-xl font-bold text-gray-900">Mis Ventas</h1>
                    </div>
                    <button
                        onClick={() => loadFacturas()}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Actualizar"
                    >
                        🔄
                    </button>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 pb-8">
                {/* Search & Filters */}
                <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input
                            type="text"
                            placeholder="Buscar cliente o número..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full p-2.5 border border-gray-300 rounded-lg"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
                            />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Mobile-first List View */}
                <div className="space-y-4">
                    {loading && (
                        <div className="bg-white p-8 rounded-xl shadow-sm text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                            <p className="mt-2 text-gray-500">Cargando ventas...</p>
                        </div>
                    )}

                    {!loading && facturas.length === 0 && (
                        <div className="bg-white p-8 rounded-xl shadow-sm text-center text-gray-500">
                            No se encontraron ventas recientes.
                        </div>
                    )}

                    {facturas.map((fact) => (
                        <div key={fact.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="font-bold text-gray-900">{fact.numero_autorizacion}</div>
                                    <div className="text-xs text-gray-500">
                                        {new Date(fact.fecha_emision).toLocaleString('es-EC')}
                                    </div>
                                </div>
                                {getEstadoBadge(fact.estado_sri || 'PENDIENTE')}
                            </div>

                            <div className="mb-3 pl-2 border-l-2 border-gray-200">
                                <div className="text-sm text-gray-800">{fact.cliente_nombre}</div>
                                <div className="text-lg font-bold text-indigo-900 mt-1">
                                    ${Number(fact.total_con_impuestos).toFixed(2)}
                                </div>
                            </div>

                            <div className="flex gap-2 pt-3 border-t border-gray-50">
                                <button
                                    onClick={async () => {
                                        try {
                                            await apiClient.descargarFacturaPDF(fact.id, fact.numero_autorizacion);
                                        } catch (e) {
                                            alert('Error descargando PDF');
                                        }
                                    }}
                                    className="flex-1 py-2 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 flex items-center justify-center gap-2"
                                >
                                    <span>📄</span> Descargar RIDE
                                </button>
                                {/* Botón opcional para reenviar email si se implementa */}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pagination */}
                <div className="flex justify-center gap-4 mt-8">
                    <button
                        disabled={page <= 1}
                        onClick={() => setPage(p => p - 1)}
                        className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50"
                    >
                        Anterior
                    </button>
                    <span className="py-2 text-gray-600">Pág {page} de {totalPages}</span>
                    <button
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => p + 1)}
                        className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50"
                    >
                        Siguiente
                    </button>
                </div>
            </div>
        </div>
    );
}
