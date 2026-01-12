'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { getApiClient } from '@/lib/api';
import { Truck, Plus, FileText, Send, Download } from 'lucide-react';

export default function GuiasRemisionPage() {
    const router = useRouter();
    const [guias, setGuias] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [estadoSri, setEstadoSri] = useState('');

    const apiClient = getApiClient();

    const loadGuias = async () => {
        setLoading(true);
        try {
            const res = await apiClient.getGuias({
                page,
                start_date: startDate,
                end_date: endDate,
                search,
                estado_sri: estadoSri
            });
            setGuias(res.results || []);
            // Calculate total pages if count provided
            if (res.count) {
                setTotalPages(Math.ceil(res.count / 20));
            }
        } catch (error) {
            console.error('Error cargando guías', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Debounce search slightly
        const timeout = setTimeout(() => {
            loadGuias();
        }, 500);
        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, startDate, endDate, search, estadoSri]);

    // Auto-refresh para guías en procesamiento
    useEffect(() => {
        const hasProcessing = guias.some(g => g.estado_sri === 'PPR');
        if (!hasProcessing) return;

        const interval = setInterval(() => {
            console.log('Auto-refreshing guías en procesamiento...');
            loadGuias();
        }, 10000);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [guias]);

    const getEstadoBadge = (estado: string) => {
        const badges: Record<string, { bg: string, text: string, label: string }> = {
            'AUT': { bg: 'bg-green-100', text: 'text-green-800', label: 'AUTORIZADO' },
            'PPR': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'PROCESANDO' },
            'NAT': { bg: 'bg-red-100', text: 'text-red-800', label: 'NO AUTORIZADO' },
            'DEV': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'DEVUELTA' },
        };
        const badge = badges[estado] || { bg: 'bg-gray-100', text: 'text-gray-800', label: 'PENDIENTE' };
        return (
            <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${badge.bg} ${badge.text}`}>
                {badge.label}
            </span>
        );
    };

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <Truck className="w-8 h-8 text-indigo-600" />
                            Guías de Remisión
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Gestiona tus documentos de transporte
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => loadGuias()}
                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            🔄 Actualizar
                        </button>
                        <button
                            onClick={() => router.push('/guias/nueva')}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Nueva Guía
                        </button>
                    </div>
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
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                            <select
                                value={estadoSri}
                                onChange={(e) => { setEstadoSri(e.target.value); setPage(1); }}
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Todos</option>
                                <option value="AUT">Autorizados</option>
                                <option value="PPR">Procesando</option>
                                <option value="NAT">No Autorizados</option>
                                <option value="DEV">Devueltos</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
                            <input
                                type="text"
                                placeholder="Destinatario, Placa..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha / Número</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Destinatario</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Transportista</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Motivo</th>
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
                                {!loading && guias.length === 0 && (
                                    <tr><td colSpan={6} className="p-8 text-center text-gray-500">
                                        No hay guías de remisión registradas
                                    </td></tr>
                                )}
                                {guias.map((guia) => (
                                    <tr key={guia.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {guia.numero_autorizacion}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(guia.fecha_emision).toLocaleDateString('es-EC')}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="text-sm text-gray-900">
                                                {/* Assuming first destinatario info is available or aggregated */}
                                                {guia.destinatarios?.[0]?.razon_social || 'Varios Destinatarios'}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {guia.destinatarios?.[0]?.direccion_destinatario}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="text-sm text-gray-900">
                                                {guia.razon_social_transportista}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {guia.placa_vehiculo}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                                                {guia.destinatarios?.[0]?.motivo_traslado || guia.motivo_traslado || 'Traslado'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                            {getEstadoBadge(guia.estado_sri || 'PENDIENTE')}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await apiClient.descargarGuiaPDF(guia.id, `guia_${guia.numero_autorizacion}.pdf`);
                                                        } catch (e) {
                                                            alert('Error descargando PDF');
                                                        }
                                                    }}
                                                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Descargar RIDE (PDF)"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </button>

                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const blob = await apiClient.descargarGuiaXML(guia.id);
                                                            const url = window.URL.createObjectURL(blob);
                                                            const a = document.createElement('a');
                                                            a.href = url;
                                                            a.download = `guia_${guia.numero_autorizacion}.xml`;
                                                            a.click();
                                                        } catch (e) {
                                                            alert('Error descargando XML');
                                                        }
                                                    }}
                                                    className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                                    title="Descargar XML"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>

                                                {guia.estado_sri !== 'AUT' && (
                                                    <button
                                                        onClick={async () => {
                                                            if (!confirm('¿Enviar Guía al SRI?')) return;
                                                            try {
                                                                await apiClient.enviarGuiaSRI(guia.id);
                                                                alert('Enviada. El estado se actualizará en breve.');
                                                                loadGuias();
                                                            } catch (e: any) {
                                                                alert('Error enviando al SRI: ' + (e.message || e.toString()));
                                                            }
                                                        }}
                                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                        title="Enviar al SRI"
                                                    >
                                                        <Send className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Mobile View (Simple Cards) */}
                <div className="lg:hidden space-y-4">
                    {/* ... (Mobile Implementation can be similar to desktop but simplified) ... */}
                    {/* For brevity, I'll rely on desktop table for first iteration or add basic cards just to not break mobile. */}
                    {guias.map((guia) => (
                        <div key={guia.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start mb-2">
                                <div className="text-sm font-bold text-gray-900">{guia.numero_autorizacion}</div>
                                {getEstadoBadge(guia.estado_sri)}
                            </div>
                            <div className="text-xs text-gray-500 mb-2">
                                Destino: {guia.destinatarios?.[0]?.razon_social}
                            </div>
                            <div className="flex gap-2 mt-3">
                                <button className="flex-1 py-2 bg-indigo-50 text-indigo-700 text-xs rounded font-medium" onClick={() => apiClient.descargarGuiaPDF(guia.id)}>
                                    PDF
                                </button>
                                {guia.estado_sri !== 'AUT' && (
                                    <button className="flex-1 py-2 bg-green-50 text-green-700 text-xs rounded font-medium" onClick={() => apiClient.enviarGuiaSRI(guia.id)}>
                                        SRI
                                    </button>
                                )}
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
