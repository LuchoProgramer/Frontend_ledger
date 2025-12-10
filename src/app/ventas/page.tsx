'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getApiClient } from '@/lib/api';
import { Factura } from '@/lib/types/ventas';

export default function SalesHistoryPage() {
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
        // Verificar si hay facturas en estado PPR (procesando)
        const hasProcessing = facturas.some(f => f.estado_sri === 'PPR');

        if (!hasProcessing) return;

        // Auto-refresh cada 10 segundos si hay facturas procesando
        const interval = setInterval(() => {
            console.log('Auto-refreshing facturas en procesamiento...');
            loadFacturas();
        }, 10000); // 10 segundos

        return () => clearInterval(interval);
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
        <DashboardLayout>
            {/* Max-width container for better readability on large screens */}
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Historial de Ventas</h1>
                        {facturas.some(f => f.estado_sri === 'PPR') && (
                            <p className="text-sm text-yellow-600 mt-1 flex items-center gap-2">
                                <span className="animate-pulse">●</span>
                                Auto-actualizando facturas en procesamiento...
                            </p>
                        )}
                    </div>
                    <button
                        onClick={() => loadFacturas()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        🔄 Actualizar
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm mb-6 border border-gray-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Desde</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Hasta</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
                            <input
                                type="text"
                                placeholder="Cliente o número de factura..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Factura</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cliente</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loading && (
                                    <tr><td colSpan={6} className="p-8 text-center text-gray-500">
                                        <div className="flex justify-center items-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                            <span className="ml-3">Cargando...</span>
                                        </div>
                                    </td></tr>
                                )}
                                {!loading && facturas.length === 0 && (
                                    <tr><td colSpan={6} className="p-8 text-center text-gray-500">
                                        No hay facturas registradas
                                    </td></tr>
                                )}
                                {facturas.map((fact) => (
                                    <tr key={fact.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {new Date(fact.fecha_emision).toLocaleDateString('es-EC')}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(fact.fecha_emision).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-col max-w-xs">
                                                <span className="text-sm font-medium text-gray-900">{fact.numero_autorizacion}</span>
                                                {fact.clave_acceso && (
                                                    <span
                                                        className="text-xs text-gray-400 font-mono truncate cursor-help"
                                                        title={fact.clave_acceso}
                                                    >
                                                        {fact.clave_acceso.substring(0, 15)}...
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="text-sm text-gray-900 max-w-xs truncate" title={fact.cliente_nombre}>
                                                {fact.cliente_nombre}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right">
                                            <span className="text-sm font-bold text-gray-900">
                                                ${Number(fact.total_con_impuestos).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                            {getEstadoBadge(fact.estado_sri || 'PENDIENTE')}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await apiClient.descargarFacturaPDF(fact.id, fact.numero_autorizacion);
                                                        } catch (e) {
                                                            alert('Error descargando PDF');
                                                        }
                                                    }}
                                                    className="px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1"
                                                    title="Descargar RIDE (PDF)"
                                                >
                                                    <span>📄</span> PDF
                                                </button>
                                                <button
                                                    className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                                                    title="Descargar XML"
                                                >
                                                    📋 XML
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-4">
                    {loading && (
                        <div className="bg-white p-8 rounded-xl shadow-sm text-center">
                            <div className="flex justify-center items-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                <span className="ml-3 text-gray-500">Cargando...</span>
                            </div>
                        </div>
                    )}
                    {!loading && facturas.length === 0 && (
                        <div className="bg-white p-8 rounded-xl shadow-sm text-center text-gray-500">
                            No hay facturas registradas
                        </div>
                    )}
                    {facturas.map((fact) => (
                        <div key={fact.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="text-sm font-medium text-gray-900">{fact.numero_autorizacion}</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {new Date(fact.fecha_emision).toLocaleString('es-EC')}
                                    </div>
                                </div>
                                {getEstadoBadge(fact.estado_sri || 'PENDIENTE')}
                            </div>

                            <div className="space-y-2 mb-3">
                                <div>
                                    <span className="text-xs text-gray-500">Cliente:</span>
                                    <div className="text-sm text-gray-900">{fact.cliente_nombre}</div>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500">Total:</span>
                                    <div className="text-lg font-bold text-gray-900">
                                        ${Number(fact.total_con_impuestos).toFixed(2)}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-3 border-t border-gray-100">
                                <button
                                    onClick={async () => {
                                        try {
                                            await apiClient.descargarFacturaPDF(fact.id, fact.numero_autorizacion);
                                        } catch (e) {
                                            alert('Error descargando PDF');
                                        }
                                    }}
                                    className="flex-1 px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <span>📄</span> PDF
                                </button>
                                <button className="flex-1 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                                    📋 XML
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
                    <span className="text-sm text-gray-600">
                        Página <span className="font-semibold">{page}</span> de <span className="font-semibold">{totalPages}</span>
                    </span>
                    <div className="flex gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            ← Anterior
                        </button>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Siguiente →
                        </button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
