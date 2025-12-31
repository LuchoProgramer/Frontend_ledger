'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getApiClient } from '@/lib/api';

export default function DetailedSalesReportPage() {
    const [sales, setSales] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sucursalId, setSucursalId] = useState('');
    const [sucursales, setSucursales] = useState<any[]>([]);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const apiClient = getApiClient();

    useEffect(() => {
        loadSucursales();
        loadSales();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    const loadSucursales = async () => {
        try {
            const res = await apiClient.getSucursalesList({ page_size: 100 });
            if (res.results) setSucursales(res.results);
        } catch (error) {
            console.error(error);
        }
    };

    const loadSales = async () => {
        setLoading(true);
        try {
            const res = await apiClient.getSalesReport({
                page,
                start_date: startDate,
                end_date: endDate,
                sucursal_id: sucursalId
            });
            setSales(res.results || []);
            if (res.count) {
                setTotalPages(Math.ceil(res.count / 20)); // Assuming 20 page size
            }
        } catch (error) {
            console.error('Error loading sales', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilter = () => {
        setPage(1);
        loadSales();
    };

    // Auto-refresh logic for pending invoices
    useEffect(() => {
        const hasPending = sales.some((s: any) => s.estado === 'EN_PROCESO' || s.estado === 'PPR');
        if (!hasPending) return;

        console.log('Detectado facturas pendientes, activando auto-refresh...');
        const interval = setInterval(() => {
            loadSales();
        }, 10000); // Check every 10 seconds

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sales]);

    const handleExport = async () => {
        try {
            const blob = await apiClient.exportSalesExcel({
                start_date: startDate,
                end_date: endDate,
                sucursal_id: sucursalId
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `reporte_ventas_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            alert('Error descargando el reporte');
            console.error(error);
        }
    };

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">Reporte Detallado de Ventas</h1>
                    <div className="flex gap-2">
                        <button
                            onClick={handleExport}
                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2"
                        >
                            <span>Descargar Excel</span>
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-lg shadow-sm flex flex-wrap gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
                        <select
                            value={sucursalId}
                            onChange={(e) => setSucursalId(e.target.value)}
                            className="p-2 border rounded-md w-full"
                        >
                            <option value="">Todas</option>
                            {sucursales.map(s => (
                                <option key={s.id} value={s.id}>{s.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Desde (Fecha/Hora)</label>
                        <input
                            type="datetime-local"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="p-2 border rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hasta (Fecha/Hora)</label>
                        <input
                            type="datetime-local"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="p-2 border rounded-md"
                        />
                    </div>
                    <button
                        onClick={handleFilter}
                        className="bg-indigo-600 text-white px-4 py-2 rounded self-end hover:bg-indigo-700"
                    >
                        Filtrar
                    </button>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Factura</th>
                                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                                <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">IVA</th>
                                <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading && <tr><td colSpan={7} className="p-4 text-center">Cargando...</td></tr>}
                            {!loading && sales.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-gray-500">No se encontraron ventas</td></tr>}
                            {sales.map((sale: any) => (
                                <tr key={sale.id} className="hover:bg-gray-50">
                                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(sale.fecha_emision).toLocaleDateString()}
                                    </td>
                                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {sale.numero_autorizacion}
                                    </td>
                                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {sale.cliente?.razon_social || 'Consumidor Final'}
                                    </td>
                                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                        ${Number(sale.total_sin_impuestos).toFixed(2)}
                                    </td>
                                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                        ${Number(sale.valor_iva).toFixed(2)}
                                    </td>
                                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                                        ${Number(sale.total_con_impuestos).toFixed(2)}
                                    </td>
                                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center">
                                        {/* Status Badge Logic */}
                                        {(() => {
                                            const statusMap: Record<string, { label: string; className: string }> = {
                                                'AUTORIZADA': { label: 'Autorizada', className: 'bg-green-100 text-green-800' },
                                                'EN_PROCESO': { label: 'Pendiente SRI', className: 'bg-yellow-100 text-yellow-800' },
                                                'RECHAZADA': { label: 'Rechazada - SRI', className: 'bg-red-100 text-red-800' },
                                                'ANULADA': { label: 'Anulada', className: 'bg-gray-100 text-gray-800' }
                                            };
                                            const statusInfo = statusMap[sale.estado] || { label: sale.estado, className: 'bg-gray-100 text-gray-800' };

                                            return (
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo.className}`}>
                                                    {statusInfo.label}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex justify-between items-center">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 border rounded disabled:opacity-50"
                    >
                        Anterior
                    </button>
                    <span>Página {page} de {totalPages}</span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-4 py-2 border rounded disabled:opacity-50"
                    >
                        Siguiente
                    </button>
                </div>
            </div>
        </DashboardLayout>
    );
}
