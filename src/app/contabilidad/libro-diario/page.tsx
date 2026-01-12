'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getApiClient } from '@/lib/api';
import { Book, ChevronDown, ChevronRight, Search, FileSpreadsheet } from 'lucide-react';

export default function LibroDiarioPage() {
    const [asientos, setAsientos] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Expanded rows
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

    const apiClient = getApiClient();

    const loadAsientos = async () => {
        setLoading(true);
        try {
            const res = await apiClient.getAsientos({
                page,
                start_date: startDate,
                end_date: endDate,
                search
            });
            setAsientos(res.results || []);
            if (res.count) {
                setTotalPages(Math.ceil(res.count / 20));
            }
        } catch (error) {
            console.error('Error loading asientos', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            loadAsientos();
        }, 500);
        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, startDate, endDate, search]);

    const toggleRow = (id: number) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRows(newExpanded);
    };

    // Formatter
    const currency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(val));

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Book className="w-8 h-8 text-indigo-600" />
                        Libro Diario
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Registro cronológico de todas las transacciones contables
                    </p>
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
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Hasta</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Glosa, Referencia..."
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="w-10 px-4 py-3"></th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha / Asiento</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Glosa (Descripción)</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Referencia</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading && (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Cargando...</td></tr>
                            )}
                            {!loading && asientos.length === 0 && (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-500">No hay asientos contables</td></tr>
                            )}
                            {asientos.map((asiento) => (
                                <>
                                    <tr
                                        key={`header-${asiento.id}`}
                                        className={`hover:bg-gray-50 transition-colors cursor-pointer ${expandedRows.has(asiento.id) ? 'bg-gray-50' : ''}`}
                                        onClick={() => toggleRow(asiento.id)}
                                    >
                                        <td className="px-4 py-4 text-gray-400">
                                            {expandedRows.has(asiento.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-900">Asiento #{asiento.id}</div>
                                            <div className="text-xs text-gray-500">{new Date(asiento.fecha).toLocaleDateString('es-EC')}</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="text-sm text-gray-900">{asiento.glosa}</div>
                                            <div className="text-xs text-gray-500">Origen: {asiento.origen}</div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {asiento.referencia}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                                            {currency(asiento.detalles?.reduce((acc: number, d: any) => acc + Number(d.debe), 0) || 0)}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${asiento.estado === 'VALIDADO' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {asiento.estado}
                                            </span>
                                        </td>
                                    </tr>

                                    {/* Expanded Details */}
                                    {expandedRows.has(asiento.id) && (
                                        <tr key={`detail-${asiento.id}`} className="bg-gray-50">
                                            <td colSpan={6} className="px-4 pb-4 pt-0">
                                                <div className="ml-10 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-inner">
                                                    <table className="min-w-full text-sm">
                                                        <thead className="bg-gray-100 border-b border-gray-200">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Cuenta</th>
                                                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Descripción</th>
                                                                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Debe</th>
                                                                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Haber</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {asiento.detalles?.map((detalle: any, idx: number) => (
                                                                <tr key={idx} className="border-b border-gray-100 last:border-0">
                                                                    <td className="px-4 py-2 font-mono text-gray-700">
                                                                        {detalle.cuenta_codigo} - {detalle.cuenta_nombre}
                                                                    </td>
                                                                    <td className="px-4 py-2 text-gray-600">
                                                                        {detalle.descripcion}
                                                                    </td>
                                                                    <td className="px-4 py-2 text-right text-gray-800 font-medium">
                                                                        {Number(detalle.debe) > 0 ? currency(detalle.debe) : '-'}
                                                                    </td>
                                                                    <td className="px-4 py-2 text-right text-gray-800 font-medium">
                                                                        {Number(detalle.haber) > 0 ? currency(detalle.haber) : '-'}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                            <tr className="bg-gray-50 font-bold">
                                                                <td colSpan={2} className="px-4 py-2 text-right">Totales:</td>
                                                                <td className="px-4 py-2 text-right text-indigo-700">
                                                                    {currency(asiento.total_debe || asiento.detalles?.reduce((acc: any, d: any) => acc + Number(d.debe), 0))}
                                                                </td>
                                                                <td className="px-4 py-2 text-right text-indigo-700">
                                                                    {currency(asiento.total_haber || asiento.detalles?.reduce((acc: any, d: any) => acc + Number(d.haber), 0))}
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex justify-between items-center gap-4 mt-6">
                    <button
                        disabled={page <= 1}
                        onClick={() => setPage(p => p - 1)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                        ← Anterior
                    </button>
                    <span className="text-sm text-gray-600">Página {page} de {totalPages}</span>
                    <button
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => p + 1)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                        Siguiente →
                    </button>
                </div>
            </div>
        </DashboardLayout>
    );
}
