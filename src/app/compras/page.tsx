'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getApiClient } from '@/lib/api';
import { Compra } from '@/lib/types/compras';
import Link from 'next/link';

export default function PurchasesPage() {
    const [compras, setCompras] = useState<Compra[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sucursalFilter, setSucursalFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [sucursales, setSucursales] = useState<any[]>([]);

    const apiClient = getApiClient();

    const loadCompras = async () => {
        setLoading(true);
        try {
            const [res, sucRes] = await Promise.all([
                apiClient.getCompras({ page, start_date: startDate, end_date: endDate, sucursal_id: sucursalFilter || undefined }),
                apiClient.getSucursalesList({ page_size: 100 })
            ]);
            setCompras(res.results || []);
            if (res.count) {
                setTotalPages(Math.ceil(res.count / 20));
            }
            if (sucRes.results) setSucursales(sucRes.results);
        } catch (error) {
            console.error('Error cargando compras', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCompras();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, startDate, endDate, sucursalFilter]);

    return (
        <DashboardLayout>
            <div className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Historial de Compras</h1>
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <Link
                            href="/compras/importar"
                            className="flex-1 md:flex-none px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-center whitespace-nowrap"
                        >
                            Importar por clave de acceso
                        </Link>
                        <Link
                            href="/compras/nueva"
                            className="flex-1 md:flex-none px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-center whitespace-nowrap"
                        >
                            + Registrar
                        </Link>
                        <button
                            onClick={() => loadCompras()}
                            className="flex-none px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                            ↻
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-end">
                    <div className="w-full md:w-auto">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
                        <select
                            value={sucursalFilter}
                            onChange={(e) => { setSucursalFilter(e.target.value); setPage(1); }}
                            className="w-full p-2 border rounded-md"
                        >
                            <option value="">Todas</option>
                            {sucursales.map(s => (
                                <option key={s.id} value={s.id}>{s.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div className="w-full md:w-auto">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                            className="w-full p-2 border rounded-md"
                        />
                    </div>
                    <div className="w-full md:w-auto">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                            className="w-full p-2 border rounded-md"
                        />
                    </div>
                </div>

                {/* Table - Desktop */}
                <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Factura</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sucursal</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading && (
                                <tr><td colSpan={6} className="p-4 text-center">Cargando...</td></tr>
                            )}
                            {!loading && compras.length === 0 && (
                                <tr><td colSpan={6} className="p-4 text-center text-gray-500">No hay compras registradas</td></tr>
                            )}
                            {compras.map((compra) => (
                                <tr key={compra.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(compra.fecha_emision).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <Link href={`/compras/${compra.id}`} className="text-indigo-600 hover:text-indigo-900">
                                            {compra.numero_factura || '-'}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {compra.proveedor_nombre}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {(compra as any).sucursal_nombre || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold">
                                        ${Number(compra.total_con_impuestos).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                            {compra.estado}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {loading && <div className="p-4 text-center bg-white rounded-lg shadow">Cargando...</div>}
                    {!loading && compras.length === 0 && (
                        <div className="p-4 text-center bg-white rounded-lg shadow text-gray-500">No hay compras registradas</div>
                    )}
                    {compras.map((compra) => (
                        <div key={compra.id} className="bg-white rounded-lg shadow p-4 space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-medium text-gray-900">{compra.proveedor_nombre}</div>
                                    <Link href={`/compras/${compra.id}`} className="text-sm text-indigo-600 font-mono hover:underline">
                                        {compra.numero_factura || 'Sin Factura'}
                                    </Link>
                                </div>
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                    {compra.estado}
                                </span>
                            </div>

                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                <span>{new Date(compra.fecha_emision).toLocaleDateString()}</span>
                                {(compra as any).sucursal_nombre && (
                                    <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">{(compra as any).sucursal_nombre}</span>
                                )}
                            </div>

                            <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-700">Total</span>
                                <span className="text-lg font-bold text-gray-900">${Number(compra.total_con_impuestos).toFixed(2)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </DashboardLayout>
    );
}
