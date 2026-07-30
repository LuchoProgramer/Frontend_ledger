'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getApiClient } from '@/lib/api';
import Link from 'next/link';
import { combinarNotas, formatearFecha, NotaCreditoFila } from './_notasCredito';

const ESTILO_SRI: Record<string, string> = {
    AUT: 'bg-green-100 text-green-800',
    PPR: 'bg-yellow-100 text-yellow-800',
    ENV: 'bg-yellow-100 text-yellow-800',
    DEV: 'bg-red-100 text-red-800',
    NAT: 'bg-red-100 text-red-800',
};

export default function CreditNotesPage() {
    const [notas, setNotas] = useState<NotaCreditoFila[]>([]);
    const [loading, setLoading] = useState(false);

    const apiClient = getApiClient();

    const loadNotas = async () => {
        setLoading(true);
        try {
            // Dos fuentes distintas: las NC electrónicas viven en el modelo
            // NotaCredito y las internas son Factura tipo 04. Se piden en
            // paralelo y si una falla igual se muestra la otra.
            const [electronicas, internas] = await Promise.allSettled([
                apiClient.getNotasCredito(),
                apiClient.getHistorialVentas({ tipo_comprobante: '04' }),
            ]);

            const datos = (r: PromiseSettledResult<any>) =>
                r.status === 'fulfilled' ? (r.value?.results ?? r.value ?? []) : [];

            if (electronicas.status === 'rejected') {
                console.error('Error cargando NC electrónicas', electronicas.reason);
            }
            if (internas.status === 'rejected') {
                console.error('Error cargando notas internas', internas.reason);
            }

            setNotas(combinarNotas(datos(electronicas), datos(internas)));
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
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo / Estado SRI</th>
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
                                <tr key={nc.key} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatearFecha(nc.fecha)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {nc.numero}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {nc.cliente}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold">
                                        ${nc.total.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        {nc.origen === 'ELECTRONICA' ? (
                                            <span
                                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ESTILO_SRI[nc.estadoSri || ''] || 'bg-gray-100 text-gray-800'}`}
                                                title="Nota de crédito electrónica enviada al SRI"
                                            >
                                                {nc.estadoSri || 'SIN ESTADO'}
                                            </span>
                                        ) : (
                                            <span
                                                className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-600"
                                                title="Documento interno: NO se envió al SRI y no anula nada ante el SRI"
                                            >
                                                Interna
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {nc.origen === 'ELECTRONICA' ? (
                                            <button
                                                onClick={() => apiClient.descargarNotaCreditoXML(nc.id)}
                                                className="text-indigo-600 hover:text-indigo-900"
                                            >
                                                XML
                                            </button>
                                        ) : (
                                            <span className="text-gray-400">—</span>
                                        )}
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
