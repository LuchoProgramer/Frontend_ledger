'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { getApiClient } from '@/lib/api';

const formatFecha = (val: string | null | undefined) => {
    if (!val) return '—';
    const d = new Date(val);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })
        + ' ' + d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
};

export default function AuditoriaListPage() {
    const [auditorias, setAuditorias] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const apiClient = getApiClient();

    useEffect(() => {
        loadAuditorias();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadAuditorias = async () => {
        setLoading(true);
        try {
            const res = await apiClient.getAuditorias();
            setAuditorias((res as any)?.results ?? res ?? []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleNuevaAuditoria = async () => {
        if (!confirm('¿Iniciar una nueva auditoría? Se tomará una foto del stock actual.')) return;
        try {
            const res = await apiClient.createAuditoria({ tipo: 'ALEATORIO', aleatorio_cantidad: 20 });
            router.push(`/inventario/auditoria/${(res as any).id}`);
        } catch (error: any) {
            alert(error.message || 'Error al iniciar auditoría');
        }
    };

    return (
        <DashboardLayout>
            <div className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Auditoría de Inventario</h1>
                        <p className="text-gray-500 text-sm">Gestiona y verifica tu stock físico.</p>
                    </div>
                    <button
                        onClick={handleNuevaAuditoria}
                        className="w-full md:w-auto px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 shadow-sm flex items-center justify-center gap-2"
                    >
                        <span>+</span> Nueva Auditoría
                    </button>
                </div>

                {/* Tabla desktop */}
                <div className="hidden md:block bg-white rounded-lg shadow overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sucursal</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsable</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading && (
                                <tr><td colSpan={7} className="p-4 text-center text-gray-400">Cargando...</td></tr>
                            )}
                            {!loading && auditorias.length === 0 && (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500">No hay auditorías registradas.</td></tr>
                            )}
                            {auditorias.map((aud) => (
                                <tr key={aud.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">#{aud.id}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatFecha(aud.fecha_creacion)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{aud.sucursal ?? '—'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{aud.usuario_nombre || aud.usuario || '—'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-center">
                                        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full
                                            ${aud.estado === 'FINALIZADA' ? 'bg-green-100 text-green-800' :
                                              aud.estado === 'AJUSTADA' ? 'bg-blue-100 text-blue-800' :
                                              'bg-yellow-100 text-yellow-800'}`}>
                                            {aud.estado}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-500">{aud.total_items ?? 0}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => router.push(`/inventario/auditoria/${aud.id}`)}
                                            className="text-indigo-600 hover:text-indigo-900"
                                        >
                                            {aud.estado === 'PENDIENTE' ? 'Continuar' : 'Ver Resultados'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Cards mobile */}
                <div className="md:hidden space-y-3">
                    {loading && <div className="p-4 text-center bg-white rounded-lg shadow text-gray-400">Cargando...</div>}
                    {!loading && auditorias.length === 0 && (
                        <div className="p-8 text-center bg-white rounded-lg shadow text-gray-500">No hay auditorías registradas.</div>
                    )}
                    {auditorias.map((aud) => (
                        <div key={aud.id} className="bg-white rounded-lg shadow p-4 space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-semibold text-gray-900">Auditoría #{aud.id}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">{formatFecha(aud.fecha_creacion)}</div>
                                </div>
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full
                                    ${aud.estado === 'FINALIZADA' ? 'bg-green-100 text-green-800' :
                                      aud.estado === 'AJUSTADA' ? 'bg-blue-100 text-blue-800' :
                                      'bg-yellow-100 text-yellow-800'}`}>
                                    {aud.estado}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-gray-500 block text-xs">Sucursal</span>
                                    <span className="text-gray-900">{aud.sucursal ?? '—'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block text-xs">Items</span>
                                    <span className="text-gray-900">{aud.total_items ?? 0}</span>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-gray-500 block text-xs">Responsable</span>
                                    <span className="text-gray-900">{aud.usuario_nombre || aud.usuario || '—'}</span>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-gray-100">
                                <button
                                    onClick={() => router.push(`/inventario/auditoria/${aud.id}`)}
                                    className="w-full py-2 text-center text-indigo-600 font-medium hover:bg-indigo-50 rounded transition-colors"
                                >
                                    {aud.estado === 'PENDIENTE' ? 'Continuar Auditoría' : 'Ver Resultados'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
}
