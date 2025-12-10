'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getApiClient } from '@/lib/api';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar
} from 'recharts';
import Link from 'next/link';

export default function ReportesPage() {
    const [periodo, setPeriodo] = useState('mensual');
    const [sucursalId, setSucursalId] = useState<string>('');

    // Data States
    const [ventasData, setVentasData] = useState<any[]>([]);
    const [topProductos, setTopProductos] = useState<any[]>([]);
    const [resumen, setResumen] = useState<any>({ total_ventas: 0, transacciones: 0, ticket_promedio: 0 });
    const [loading, setLoading] = useState(true);

    const apiClient = getApiClient();

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [periodo, sucursalId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const params = { periodo, sucursal_id: sucursalId || undefined };

            const [ventasRes, topRes, resumenRes] = await Promise.all([
                apiClient.getVentasChart(params),
                apiClient.getTopProductos(params),
                apiClient.getResumenGeneral(params)
            ]);

            setVentasData(ventasRes);
            setTopProductos(topRes);
            setResumen(resumenRes);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
                {/* Header & Filtros */}
                <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm">
                    <h1 className="text-2xl font-bold text-gray-800">Dashboard Ejecutivo</h1>

                    <div className="flex gap-4 mt-4 md:mt-0">
                        <Link
                            href="/reportes/ventas"
                            className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700"
                        >
                            Ver Reporte Detallado
                        </Link>
                        <select
                            className="p-2 border rounded text-sm bg-gray-50"
                            value={periodo}
                            onChange={(e) => setPeriodo(e.target.value)}
                        >
                            <option value="mensual">Últimos 12 Meses</option>
                            <option value="diario">Últimos 30 Días</option>
                        </select>
                        {/* TODO: Load sucursales dinamically if needed */}
                        {/* <select className="p-2 border rounded text-sm bg-gray-50">
                             <option value="">Todas las Sucursales</option>
                         </select> */}
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-indigo-500">
                        <p className="text-gray-500 text-sm uppercase font-semibold">Ventas Totales</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">
                            ${Number(resumen.total_ventas).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
                        <p className="text-gray-500 text-sm uppercase font-semibold">Transacciones</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">
                            {resumen.transacciones}
                        </p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-yellow-500">
                        <p className="text-gray-500 text-sm uppercase font-semibold">Ticket Promedio</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">
                            ${Number(resumen.ticket_promedio).toFixed(2)}
                        </p>
                    </div>
                </div>

                {/* Charts Area */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Evolución Ventas */}
                    <div className="bg-white p-6 rounded-lg shadow-sm">
                        <h2 className="text-lg font-bold text-gray-700 mb-4">Evolución de Ventas</h2>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={ventasData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                    <Tooltip
                                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'Ventas']}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="venta"
                                        stroke="#6366f1"
                                        strokeWidth={3}
                                        dot={{ fill: '#6366f1', strokeWidth: 2 }}
                                        activeDot={{ r: 8 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top Productos */}
                    <div className="bg-white p-6 rounded-lg shadow-sm">
                        <h2 className="text-lg font-bold text-gray-700 mb-4">Top 10 Productos Vendidos</h2>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topProductos} layout="vertical" margin={{ left: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        width={150}
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '8px' }}
                                    />
                                    <Bar dataKey="total" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
}
