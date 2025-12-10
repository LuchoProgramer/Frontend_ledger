'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getApiClient } from '@/lib/api';
import Link from 'next/link';

interface Stats {
    total_facturas: number;
    autorizadas: number;
    rechazadas: number;
    pendientes: number;
    total_ventas: number;
}

interface FacturaError {
    id: number;
    numero: string;
    cliente: string;
    fecha: string;
    error: string;
}

export default function FacturacionDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [rechazadas, setRechazadas] = useState<FacturaError[]>([]);
    const [loading, setLoading] = useState(true);
    const apiClient = getApiClient();

    const loadStats = async () => {
        setLoading(true);
        try {
            const res = await apiClient.getFacturacionStats();

            // Mapear respuesta del backend al estado del frontend
            setStats({
                total_facturas: res.total_mes,
                autorizadas: res.autorizadas,
                rechazadas: res.rechazadas,
                pendientes: res.pendientes,
                total_ventas: res.total_ventas_autorizadas
            });

            // Mapear lista de errores
            setRechazadas(res.ultimos_errores || []);
        } catch (error) {
            console.error('Error loading stats', error);
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        loadStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    interface StatCardProps {
        title: string;
        value: number;
        color: string;
        icon: string;
    }

    const StatCard = ({ title, value, color, icon }: StatCardProps) => (
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4" style={{ borderColor: color }}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                    <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
                </div>
                <div className="p-2 rounded-full bg-gray-50 text-2xl">
                    {icon}
                </div>
            </div>
        </div>
    );

    return (
        <DashboardLayout>
            <div className="p-6">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-800">Facturación Electrónica SRI</h1>
                    <button
                        onClick={loadStats}
                        className="px-4 py-2 bg-white text-gray-700 border rounded hover:bg-gray-50"
                    >
                        ↻ Actualizar
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-10">Cargando métricas...</div>
                ) : (
                    <>
                        {/* KPI Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <StatCard
                                title="Total Facturas"
                                value={stats?.total_facturas || 0}
                                color="#6366f1"
                                icon="🧾"
                            />
                            <StatCard
                                title="Autorizadas"
                                value={stats?.autorizadas || 0}
                                color="#10b981"
                                icon="✅"
                            />
                            <StatCard
                                title="Pendientes"
                                value={stats?.pendientes || 0}
                                color="#f59e0b"
                                icon="⏳"
                            />
                            <StatCard
                                title="Rechazadas"
                                value={stats?.rechazadas || 0}
                                color="#ef4444"
                                icon="❌"
                            />
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-sm mb-8 border border-green-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900">Ventas Autorizadas (Total)</h3>
                                    <p className="text-sm text-gray-500">Monto acumulado de facturas autorizadas por el SRI</p>
                                </div>
                                <div className="text-3xl font-bold text-green-600">
                                    ${Number(stats?.total_ventas || 0).toFixed(2)}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Rejected List */}
                            <div className="bg-white rounded-lg shadow-sm">
                                <div className="px-6 py-4 border-b flex justify-between items-center">
                                    <h3 className="text-lg font-medium text-gray-900">Últimos Errores (Rechazadas)</h3>
                                    {rechazadas.length > 0 && (
                                        <Link href="/ventas?estado=rechazada" className="text-sm text-indigo-600 hover:text-indigo-800">
                                            Ver todas
                                        </Link>
                                    )}
                                </div>
                                <div className="divide-y">
                                    {rechazadas.length === 0 ? (
                                        <div className="p-6 text-center text-gray-500">
                                            No hay facturas rechazadas de forma reciente. ¡Excelente!
                                        </div>
                                    ) : (
                                        rechazadas.map((err) => (
                                            <div key={err.id} className="p-4 hover:bg-gray-50">
                                                <div className="flex justify-between mb-1">
                                                    <span className="font-medium text-red-600">{err.numero}</span>
                                                    <span className="text-sm text-gray-500">{new Date(err.fecha).toLocaleDateString()}</span>
                                                </div>
                                                <div className="text-sm text-gray-800 mb-1">{err.cliente}</div>
                                                <div className="text-xs text-red-500 bg-red-50 p-2 rounded">
                                                    {err.error}
                                                </div>
                                                <div className="mt-2 text-right">
                                                    <Link
                                                        href={`/ventas/factura/${err.id}`}
                                                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                                                    >
                                                        Gestionar →
                                                    </Link>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="bg-white rounded-lg shadow-sm p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Acciones Rápidas</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    <Link href="/facturacion/notas-credito" className="flex items-center p-4 border rounded hover:bg-gray-50 transition">
                                        <span className="text-2xl mr-4">📝</span>
                                        <div>
                                            <div className="font-medium text-gray-900">Emitir Nota de Crédito</div>
                                            <div className="text-sm text-gray-500">Anular factura o realizar devolución</div>
                                        </div>
                                    </Link>
                                    <Link href="/facturacion/retenciones" className="flex items-center p-4 border rounded hover:bg-gray-50 transition">
                                        <span className="text-2xl mr-4">💵</span>
                                        <div>
                                            <div className="font-medium text-gray-900">Gestionar Retenciones</div>
                                            <div className="text-sm text-gray-500">Ver retenciones recibidas y emitidas</div>
                                        </div>
                                    </Link>
                                    <Link href="/impuestos" className="flex items-center p-4 border rounded hover:bg-gray-50 transition">
                                        <span className="text-2xl mr-4">⚙️</span>
                                        <div>
                                            <div className="font-medium text-gray-900">Configuración de Impuestos</div>
                                            <div className="text-sm text-gray-500">Actualizar porcentajes de IVA/ICE</div>
                                        </div>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
