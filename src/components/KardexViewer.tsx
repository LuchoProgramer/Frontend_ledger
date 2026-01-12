'use client';

import { useState, useEffect } from 'react';
import { getApiClient } from '@/lib/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Movimiento {
    id: number;
    producto_nombre: string;
    sucursal_nombre: string;
    tipo_movimiento: string;
    cantidad: number; // API returns number
    saldo_posterior?: number; // Snapshot
    motivo: string;
    usuario_nombre: string | null;
    fecha: string;
}

interface KardexViewerProps {
    productoId: number;
}

export default function KardexViewer({ productoId }: KardexViewerProps) {
    const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchKardex = async () => {
            setLoading(true);
            try {
                const api = getApiClient();
                // Nota: Asumimos que getKardex existe o llamamos al endpoint genérico
                // Dado que getApiClient es tipado, deberíamos agregarlo ahí o hacer fetch directo autenticado.
                // Por ahora usaré el método genérico si existe o simularé la llamada.

                // Opción A: Extender getApiClient (Mejor práctica)
                // Opción B: Llamada directa aquí para rapidez

                const response = await api.getMovimientos({ producto: productoId, page });

                if (response && response.results) {
                    setMovimientos(response.results);
                    setTotalPages(response.num_pages);
                } else {
                    setError('No se pudo cargar el historial');
                }
            } catch (err) {
                console.error(err);
                setError('Error de conexión');
            } finally {
                setLoading(false);
            }
        };

        fetchKardex();
    }, [productoId, page]);

    const getTipoBadge = (tipo: string) => {
        const classes: Record<string, string> = {
            'COMPRA': 'bg-green-100 text-green-800',
            'VENTA': 'bg-blue-100 text-blue-800',
            'AJUSTE': 'bg-yellow-100 text-yellow-800',
            'TRANSFERENCIA_ENTRADA': 'bg-purple-100 text-purple-800',
            'TRANSFERENCIA_SALIDA': 'bg-orange-100 text-orange-800',
        };
        const label = tipo.replace('_', ' ');
        return (
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${classes[tipo] || 'bg-gray-100 text-gray-800'}`}>
                {label}
            </span>
        );
    };

    if (error) {
        return <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-200 mt-6">{error}</div>;
    }

    return (
        <div className="bg-white shadow rounded-lg border border-gray-200 mt-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    📜 Kardex del Producto
                </h3>
                <span className="text-xs text-gray-500">Historial de Movimientos</span>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sucursal</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Motivo</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 border-l border-gray-200">Saldo</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i}>
                                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-12 ml-auto animate-pulse"></div></td>
                                    <td className="px-6 py-4 border-l border-gray-200"><div className="h-4 bg-gray-300 rounded w-12 ml-auto animate-pulse"></div></td>
                                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div></td>
                                </tr>
                            ))
                        ) : movimientos.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-10 text-center text-gray-500 italic">
                                    No hay movimientos registrados para este producto.
                                </td>
                            </tr>
                        ) : (
                            movimientos.map((mov) => {
                                const cantidadNum = mov.cantidad;
                                const saldoNum = mov.saldo_posterior !== undefined && mov.saldo_posterior !== null ? mov.saldo_posterior : null;

                                return (
                                    <tr key={mov.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {format(new Date(mov.fecha), 'dd/MM/yyyy HH:mm', { locale: es })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                            {mov.sucursal_nombre}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getTipoBadge(mov.tipo_movimiento)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate" title={mov.motivo}>
                                            {mov.motivo}
                                        </td>
                                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${cantidadNum < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {cantidadNum > 0 ? '+' : ''}{cantidadNum}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-gray-900 bg-gray-50 border-l border-gray-200">
                                            {saldoNum !== null ? saldoNum : <span className="text-gray-400 text-xs italic">N/A</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {mov.usuario_nombre || 'Sistema'}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                    <div className="flex-1 flex justify-between sm:hidden">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                            Anterior
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                            Siguiente
                        </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                Página <span className="font-medium">{page}</span> de <span className="font-medium">{totalPages}</span>
                            </p>
                        </div>
                        <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    <span>Anterior</span>
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    <span>Siguiente</span>
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
