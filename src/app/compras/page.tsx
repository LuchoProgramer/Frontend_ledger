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
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Upload Modal
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [sucursales, setSucursales] = useState<any[]>([]); // Need sucursales for upload

    const apiClient = getApiClient();

    const loadCompras = async () => {
        setLoading(true);
        try {
            const [res, sucRes] = await Promise.all([
                apiClient.getCompras({ page, start_date: startDate, end_date: endDate }),
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

    const handleUploadSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fileInput = form.elements.namedItem('file') as HTMLInputElement;
        const sucursalSelect = form.elements.namedItem('sucursal_id') as HTMLSelectElement;

        if (!fileInput.files || fileInput.files.length === 0) return;

        setUploading(true);
        try {
            const res = await apiClient.uploadCompraXML(fileInput.files[0], Number(sucursalSelect.value));
            if (res.success) {
                alert(res.message);
                setShowUploadModal(false);
                loadCompras();
            } else {
                alert(`Error: ${res.error}`);
            }
        } catch (err: any) {
            alert('Error subiendo XML');
        } finally {
            setUploading(false);
        }
    };

    useEffect(() => {
        loadCompras();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, startDate, endDate]);

    return (
        <DashboardLayout>
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Historial de Compras</h1>
                    <div className="space-x-2">
                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                            Importar XML
                        </button>
                        <Link
                            href="/compras/nueva"
                            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        >
                            + Registrar Compra
                        </Link>
                        <button
                            onClick={() => loadCompras()}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                            Actualizar
                        </button>
                    </div>
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Factura</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading && (
                                <tr><td colSpan={5} className="p-4 text-center">Cargando...</td></tr>
                            )}
                            {!loading && compras.length === 0 && (
                                <tr><td colSpan={5} className="p-4 text-center text-gray-500">No hay compras registradas</td></tr>
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
            </div>

            {/* MODAL UPLOAD XML */}
            {showUploadModal && (
                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setShowUploadModal(false)}>
                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                        </div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <form onSubmit={handleUploadSubmit}>
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Importar Factura Electrónica (XML)</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Sucursal Destino</label>
                                            <select name="sucursal_id" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required>
                                                {sucursales.map(s => (
                                                    <option key={s.id} value={s.id}>{s.nombre}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Archivo XML</label>
                                            <input type="file" name="file" accept=".xml" className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" required />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                    <button type="submit" disabled={uploading} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
                                        {uploading ? 'Procesando...' : 'Importar'}
                                    </button>
                                    <button type="button" onClick={() => setShowUploadModal(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
