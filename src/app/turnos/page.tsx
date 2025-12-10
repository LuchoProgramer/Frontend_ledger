'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getApiClient } from '@/lib/api';

interface Turno {
    id: number;
    usuario: number;
    usuario_nombre: string;
    sucursal_nombre: string;
    inicio_turno: string;
    fin_turno: string | null;
    total_ventas: string;
    estado: string;
}

export default function TurnosPage() {
    const [turnos, setTurnos] = useState<Turno[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const apiClient = getApiClient();

    const loadTurnos = async () => {
        setLoading(true);
        try {
            const res = await apiClient.getTurnosHistorico({
                page,
                start_date: startDate,
                end_date: endDate,
            });
            setTurnos(res.results);
            if (res.count) {
                setTotalPages(Math.ceil(res.count / 20));
            }
        } catch (error) {
            console.error('Error cargando turnos', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTurnos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, startDate, endDate]);

    return (
        <DashboardLayout>
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Historial de Turnos (Cajas)</h1>
                    <button
                        onClick={() => loadTurnos()}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                        Actualizar
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                            className="p-2 border rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                            className="p-2 border rounded-md"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sucursal</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Apertura</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cierre</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ventas</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading && (
                                <tr><td colSpan={6} className="p-4 text-center">Cargando...</td></tr>
                            )}
                            {!loading && turnos.length === 0 && (
                                <tr><td colSpan={6} className="p-4 text-center text-gray-500">No hay turnos registrados</td></tr>
                            )}
                            {turnos.map((turno) => (
                                <tr key={turno.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {turno.usuario_nombre}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {turno.sucursal_nombre}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(turno.inicio_turno).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {turno.fin_turno ? new Date(turno.fin_turno).toLocaleString() : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold">
                                        ${Number(turno.total_ventas || 0).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${turno.estado === 'Abierto' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {turno.estado}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex justify-between items-center mt-4">
                    <span className="text-sm text-gray-700">Página {page} de {totalPages}</span>
                    <div className="space-x-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                        >
                            Anterior
                        </button>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
