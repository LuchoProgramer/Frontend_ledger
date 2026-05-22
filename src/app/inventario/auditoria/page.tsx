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

const TIPOS = [
    {
        tipo: 'INICIO_TURNO' as const,
        titulo: 'Apertura de Turno',
        descripcion: 'Auditoría completa al abrir el turno. Incluye todos los productos activos.',
        color: 'indigo',
    },
    {
        tipo: 'FIN_TURNO' as const,
        titulo: 'Cierre de Turno',
        descripcion: 'Auditoría completa al cerrar el turno. Compara el stock contra la apertura.',
        color: 'green',
    },
];

export default function AuditoriaListPage() {
    const [auditorias, setAuditorias] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [creando, setCreando] = useState(false);
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

    const handleSeleccionarTipo = async (tipo: 'INICIO_TURNO' | 'FIN_TURNO') => {
        setCreando(true);
        try {
            const res = await apiClient.createAuditoria({ tipo });
            router.push(`/inventario/auditoria/${(res as any).id}`);
        } catch (error: any) {
            alert(error.message || 'Error al iniciar auditoría');
            setCreando(false);
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
                        onClick={() => setShowModal(true)}
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

            {/* Modal selección de tipo */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-1">Nueva Auditoría</h2>
                        <p className="text-sm text-gray-500 mb-5">Selecciona el tipo de auditoría a realizar.</p>

                        <div className="space-y-3">
                            {TIPOS.map(({ tipo, titulo, descripcion, color }) => (
                                <button
                                    key={tipo}
                                    onClick={() => handleSeleccionarTipo(tipo)}
                                    disabled={creando}
                                    className={`w-full text-left p-4 rounded-xl border-2 transition-colors disabled:opacity-50
                                        ${color === 'indigo'
                                            ? 'border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50'
                                            : 'border-green-200 hover:border-green-500 hover:bg-green-50'
                                        }`}
                                >
                                    <div className={`font-semibold text-sm ${color === 'indigo' ? 'text-indigo-800' : 'text-green-800'}`}>
                                        {titulo}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-0.5">{descripcion}</div>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setShowModal(false)}
                            disabled={creando}
                            className="mt-4 w-full py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
                        >
                            Cancelar
                        </button>

                        {creando && (
                            <p className="text-center text-xs text-gray-400 mt-2">Creando auditoría, espera un momento...</p>
                        )}
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
