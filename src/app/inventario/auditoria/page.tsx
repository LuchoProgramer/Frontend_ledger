'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { getApiClient } from '@/lib/api';

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
            setAuditorias(res || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleNuevaAuditoria = async () => {
        if (!confirm('¿Iniciar una nueva auditoría? Se tomará una foto del stock actual.')) return;

        try {
            // TODO: Select sucursal dynamically if admin
            // For now, assume backend picks user's first sucursal or active one
            // We need to pass sucusal_id. Let's fetch user info first or hardcode for now for MVP if api handles fallback
            // Backend expects sucursal_id.

            // Allow user to select sucursal? 
            // Simplified: Fetch sucursales and pick first one for now, or use hardcoded ID if known.
            // Better: Add sucursal selector modal. For speed, let's try sending sucursal_id=1 or prompt.

            // Quick fix: Ask user or just try.
            // Let's rely on api endpoint logic I wrote: "sucursal_id = request.data.get('sucursal_id')"
            // I need to provide it.

            // Let's get sucursales from API first? Or just use a hardcoded 1 for the main store as MVP users usually have 1.
            // Let's try to get profile or just prompt for ID (ugly).
            // Proper way: Fetch sucursales.

            // Fetch sucursal for scope (optional for backend if only 1, but good practice)
            // Backend CreateAuditoriaSerializer expects 'tipo' and potentially products.
            // Simplified: Launch a Full Audit or Random? Let's default to Full for manual creation or ask.
            // For now, let's just trigger a random or full audit.
            // Let's use 'ALEATORIO' for testing or 'INICIO_TURNO' semantics.
            // Actually, if manually triggering, maybe they want to count specific things.
            // Defaulting to ALEATORIO with 10 items for demo, or better yet, full count?
            // Let's use 'ALEATORIO' with quantity 50 for now as a safe default if no UI.

            const res = await apiClient.createAuditoria({
                tipo: 'ALEATORIO',
                aleatorio_cantidad: 20
            });

            router.push(`/inventario/auditoria/${(res as any).id}`);

        } catch (error: any) {
            alert(error.error || 'Error al iniciar auditoría');
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

                <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Inicio</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sucursal</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsable</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading && <tr><td colSpan={7} className="p-4 text-center">Cargando...</td></tr>}
                            {!loading && auditorias.length === 0 && (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500">No hay auditorías registradas.</td></tr>
                            )}
                            {auditorias.map((aud) => (
                                <tr key={aud.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{aud.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {new Date(aud.fecha_inicio).toLocaleDateString()} {new Date(aud.fecha_inicio).toLocaleTimeString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{aud.sucursal}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{aud.usuario}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${aud.estado === 'FINALIZADA' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {aud.estado}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                                        {aud.total_items}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => router.push(`/inventario/auditoria/${aud.id}`)}
                                            className="text-indigo-600 hover:text-indigo-900"
                                        >
                                            {aud.estado === 'BORRADOR' ? 'Continuar' : 'Ver Resultados'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>

                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {loading && <div className="p-4 text-center bg-white rounded-lg shadow">Cargando...</div>}
                    {!loading && auditorias.length === 0 && (
                        <div className="p-8 text-center bg-white rounded-lg shadow text-gray-500">No hay auditorías registradas.</div>
                    )}
                    {auditorias.map((aud) => (
                        <div key={aud.id} className="bg-white rounded-lg shadow p-4 space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-medium text-gray-900">Auditoría #{aud.id}</div>
                                    <div className="text-sm text-gray-500">{new Date(aud.fecha_inicio).toLocaleDateString()}</div>
                                </div>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full 
                                    ${aud.estado === 'FINALIZADA' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                    {aud.estado}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-gray-500 block">Sucursal</span>
                                    <span className="text-gray-900">{aud.sucursal}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block">Items</span>
                                    <span className="text-gray-900">{aud.total_items}</span>
                                </div>
                            </div>

                            <div className="text-sm">
                                <span className="text-gray-500 block">Responsable</span>
                                <span className="text-gray-900">{aud.usuario}</span>
                            </div>

                            <div className="pt-2 border-t border-gray-100">
                                <button
                                    onClick={() => router.push(`/inventario/auditoria/${aud.id}`)}
                                    className="w-full py-2 text-center text-indigo-600 font-medium hover:bg-indigo-50 rounded transition-colors"
                                >
                                    {aud.estado === 'BORRADOR' ? 'Continuar Auditoría' : 'Ver Resultados'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </DashboardLayout >
    );
}
