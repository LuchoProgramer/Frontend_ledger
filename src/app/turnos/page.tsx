'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { getApiClient } from '@/lib/api';

interface Turno {
    id: number;
    usuario: number;
    usuario_nombre: string;
    sucursal: number;
    sucursal_nombre: string;
    inicio_turno: string;
    fin_turno: string | null;
    total_ventas: string;
    total_efectivo: string;
    otros_metodos_pago: string;
    estado: string;
    diferencia_total: string | null;
}

interface Sucursal {
    id: number;
    nombre: string;
}

function DiferenciaBadge({ diferencia }: { diferencia: string | null }) {
    if (diferencia === null) return <span className="text-gray-400 text-xs">—</span>;
    const val = parseFloat(diferencia);
    if (Math.abs(val) < 0.01) {
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                ✓ Cuadra
            </span>
        );
    }
    if (val > 0) {
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                +${val.toFixed(2)}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            −${Math.abs(val).toFixed(2)}
        </span>
    );
}

function duracionTurno(inicio: string, fin: string | null): string {
    if (!fin) return 'En curso';
    const ms = new Date(fin).getTime() - new Date(inicio).getTime();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
}

function fmtHora(dt: string): string {
    return new Date(dt).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
}

function fmtFecha(dt: string): string {
    return new Date(dt).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function TurnosPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [turnos, setTurnos] = useState<Turno[]>([]);
    const [loading, setLoading] = useState(false);
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sucursalId, setSucursalId] = useState('');
    const [cajeroSearch, setCajeroSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const PAGE_SIZE = 20;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    const apiClient = getApiClient();

    useEffect(() => {
        if (!authLoading) {
            if (!user) router.push('/login');
            else if (user.groups?.includes('Vendedor') && !user.is_superuser && !user.is_staff)
                router.push('/');
        }
    }, [authLoading, user, router]);

    useEffect(() => {
        apiClient.getSucursales().then((res: any) => {
            setSucursales(res.results || res || []);
        }).catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadTurnos = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.getTurnosHistorico({
                page,
                start_date: startDate || undefined,
                end_date: endDate || undefined,
                sucursal_id: sucursalId || undefined,
                cajero: cajeroSearch || undefined,
            });
            setTurnos(res.results || []);
            setTotalCount(res.count || 0);
        } catch (error) {
            console.error('Error cargando turnos', error);
        } finally {
            setLoading(false);
        }
    }, [page, startDate, endDate, sucursalId, cajeroSearch]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        loadTurnos();
    }, [loadTurnos]);

    const resumen = {
        totalVentas: turnos.reduce((s, t) => s + parseFloat(t.total_ventas || '0'), 0),
        cuadran: turnos.filter(t => t.diferencia_total !== null && Math.abs(parseFloat(t.diferencia_total)) < 0.01).length,
        faltantes: turnos.filter(t => t.diferencia_total !== null && parseFloat(t.diferencia_total) < -0.01).length,
    };

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Historial de Turnos</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Cierre de caja y auditoría por cajero</p>
                    </div>
                    <button
                        onClick={loadTurnos}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-2 shadow-sm"
                    >
                        🔄 Actualizar
                    </button>
                </div>

                {/* KPIs */}
                {totalCount > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                            <p className="text-xs text-gray-500 font-medium uppercase">Turnos</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{totalCount}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                            <p className="text-xs text-gray-500 font-medium uppercase">Ventas (página)</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">${resumen.totalVentas.toFixed(2)}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-green-100 shadow-sm">
                            <p className="text-xs text-green-600 font-medium uppercase">✓ Cuadran</p>
                            <p className="text-2xl font-bold text-green-700 mt-1">{resumen.cuadran}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-red-100 shadow-sm">
                            <p className="text-xs text-red-600 font-medium uppercase">⚠ Faltantes</p>
                            <p className="text-2xl font-bold text-red-700 mt-1">{resumen.faltantes}</p>
                        </div>
                    </div>
                )}

                {/* Filtros */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Sucursal</label>
                            <select
                                value={sucursalId}
                                onChange={(e) => { setSucursalId(e.target.value); setPage(1); }}
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                <option value="">Todas</option>
                                {sucursales.map(s => (
                                    <option key={s.id} value={s.id}>{s.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Cajero</label>
                            <input
                                type="text"
                                placeholder="Buscar por nombre..."
                                value={cajeroSearch}
                                onChange={(e) => { setCajeroSearch(e.target.value); setPage(1); }}
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Tabla desktop */}
                <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cajero</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sucursal</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha / Horario</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Duración</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Efectivo</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Tarjeta/Trans.</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Diferencia</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Detalle</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {loading && (
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-gray-400">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600" />
                                            Cargando...
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!loading && turnos.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-gray-400">
                                        No hay turnos para los filtros seleccionados
                                    </td>
                                </tr>
                            )}
                            {turnos.map((turno) => {
                                const total = parseFloat(turno.total_efectivo || '0') + parseFloat(turno.otros_metodos_pago || '0');
                                return (
                                    <tr
                                        key={turno.id}
                                        onClick={() => turno.estado === 'Cerrado' && router.push(`/turnos/${turno.id}`)}
                                        className={`transition-colors ${turno.estado === 'Cerrado' ? 'hover:bg-indigo-50 cursor-pointer' : 'hover:bg-gray-50'}`}
                                    >
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-semibold text-gray-900">{turno.usuario_nombre}</div>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <span className={`w-1.5 h-1.5 rounded-full ${turno.estado === 'Abierto' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                                                <span className={`text-xs ${turno.estado === 'Abierto' ? 'text-green-600' : 'text-gray-400'}`}>
                                                    {turno.estado}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{turno.sucursal_nombre}</td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-gray-900">{fmtFecha(turno.inicio_turno)}</div>
                                            <div className="text-xs text-gray-500">
                                                {fmtHora(turno.inicio_turno)} → {turno.fin_turno ? fmtHora(turno.fin_turno) : '…'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {duracionTurno(turno.inicio_turno, turno.fin_turno)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-700">
                                            ${parseFloat(turno.total_efectivo || '0').toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-700">
                                            ${parseFloat(turno.otros_metodos_pago || '0').toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                                            ${total.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <DiferenciaBadge diferencia={turno.diferencia_total} />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {turno.estado === 'Cerrado' ? (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); router.push(`/turnos/${turno.id}`); }}
                                                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                                                >
                                                    Ver →
                                                </button>
                                            ) : (
                                                <span className="text-gray-400 text-xs">En curso</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Cards mobile */}
                <div className="md:hidden space-y-3">
                    {loading && (
                        <div className="bg-white rounded-xl p-6 text-center text-gray-400 shadow-sm">Cargando...</div>
                    )}
                    {!loading && turnos.length === 0 && (
                        <div className="bg-white rounded-xl p-6 text-center text-gray-400 shadow-sm">Sin resultados</div>
                    )}
                    {turnos.map((turno) => {
                        const total = parseFloat(turno.total_efectivo || '0') + parseFloat(turno.otros_metodos_pago || '0');
                        return (
                            <div key={turno.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-semibold text-gray-900">{turno.usuario_nombre}</div>
                                        <div className="text-sm text-gray-500">{turno.sucursal_nombre}</div>
                                    </div>
                                    <DiferenciaBadge diferencia={turno.diferencia_total} />
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-xs text-gray-500 block">Fecha</span>
                                        <span>{fmtFecha(turno.inicio_turno)}</span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500 block">Duración</span>
                                        <span>{duracionTurno(turno.inicio_turno, turno.fin_turno)}</span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500 block">Efectivo</span>
                                        <span>${parseFloat(turno.total_efectivo || '0').toFixed(2)}</span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500 block">Tarjeta/Trans.</span>
                                        <span>${parseFloat(turno.otros_metodos_pago || '0').toFixed(2)}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                    <div>
                                        <span className="text-xs text-gray-500">Total</span>
                                        <span className="text-lg font-bold text-gray-900 ml-2">${total.toFixed(2)}</span>
                                    </div>
                                    {turno.estado === 'Cerrado' ? (
                                        <button
                                            onClick={() => router.push(`/turnos/${turno.id}`)}
                                            className="px-3 py-1.5 text-sm text-indigo-600 font-medium border border-indigo-200 rounded-lg hover:bg-indigo-50"
                                        >
                                            Ver cierre →
                                        </button>
                                    ) : (
                                        <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                            En curso
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Paginación */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                    <span className="text-sm text-gray-500">
                        {totalCount > 0 ? `${totalCount} turnos · Página ${page} de ${totalPages}` : ''}
                    </span>
                    <div className="flex gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            ← Anterior
                        </button>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Siguiente →
                        </button>
                    </div>
                </div>

            </div>
        </DashboardLayout>
    );
}
