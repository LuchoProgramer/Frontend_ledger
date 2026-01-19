'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getApiClient } from '@/lib/api';
import { Factura } from '@/lib/types/ventas';
import Link from 'next/link';

export default function CreditNotesPage() {
    const [notas, setNotas] = useState<Factura[]>([]);
    const [loading, setLoading] = useState(false);

    const apiClient = getApiClient();

    const loadNotas = async () => {
        setLoading(true);
        try {
            const res = await apiClient.getHistorialVentas({
                tipo_comprobante: '04' // Nota de Crédito
            });
            setNotas(res.results || []);
        } catch (error) {
            console.error('Error cargando notas de crédito', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNotas();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <DashboardLayout>
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Notas de Crédito</h1>
                    <Link
                        href="/facturacion/notas-credito/nueva"
                        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        title="Nueva Nota de Crédito"
                    >
                        + Nueva Nota de Crédito
                    </Link>
                </div>

                <div className="bg-white rounded-lg shadow overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado SRI</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading && (
                                <tr><td colSpan={6} className="p-4 text-center">Cargando...</td></tr>
                            )}
                            {!loading && notas.length === 0 && (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-500">
                                    No se encontraron Notas de Crédito emitidas.
                                </td></tr>
                            )}
                            {notas.map((nc) => (
                                <tr key={nc.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(nc.fecha_emision).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {nc.numero_autorizacion}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {nc.cliente_nombre}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold">
                                        ${Number(nc.total_con_impuestos).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        {/* Mock status based on estado field if estado_sri not available in view yet */}
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${nc.estado === 'AUTORIZADA' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {nc.estado}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button className="text-indigo-600 hover:text-indigo-900">PDF</button>
                                        <span className="mx-2 text-gray-300">|</span>
                                        <button className="text-indigo-600 hover:text-indigo-900">XML</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
}
