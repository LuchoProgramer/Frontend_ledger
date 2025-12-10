'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { getApiClient } from '@/lib/api';
import { Compra } from '@/lib/types/compras';

interface CompraDetail extends Omit<Compra, 'detalles'> {
    detalles: {
        id: number;
        producto: number;
        producto_nombre: string;
        codigo_principal: string;
        descripcion: string;
        cantidad: number;
        precio_unitario: number;
        total_por_producto: number;
    }[];
    sucursal_nombre: string;
}

export default function PurchaseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [compra, setCompra] = useState<CompraDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params.id) {
            loadCompra(Number(params.id));
        }
    }, [params.id]);

    const loadCompra = async (id: number) => {
        try {
            const client = getApiClient();
            const res = await client.getCompraDetail(id);
            setCompra(res);
        } catch (error) {
            console.error('Error cargando compra', error);
            alert('Error cargando detalles de la compra');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="p-6 text-center">Cargando detalles...</div>
            </DashboardLayout>
        );
    }

    if (!compra) {
        return (
            <DashboardLayout>
                <div className="p-6 text-center text-red-600">No se encontró la compra.</div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <button
                            onClick={() => router.back()}
                            className="text-indigo-600 hover:text-indigo-800 mb-2 flex items-center"
                        >
                            &larr; Volver
                        </button>
                        <h1 className="text-2xl font-bold text-gray-800">
                            Compra #{compra.numero_factura}
                        </h1>
                        <p className="text-gray-500 text-sm">
                            Autorización: {compra.numero_autorizacion}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-gray-500">Fecha de Emisión</div>
                        <div className="font-medium">{new Date(compra.fecha_emision).toLocaleDateString()}</div>
                    </div>
                </div>

                {/* Header Info */}
                <div className="bg-white p-6 rounded-lg shadow-sm mb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Proveedor</h3>
                        <p className="text-lg font-medium text-gray-900">{compra.proveedor_nombre}</p>
                    </div>
                    <div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Sucursal</h3>
                        <p className="text-lg font-medium text-gray-900">{compra.sucursal_nombre}</p>
                    </div>
                    <div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Estado</h3>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${compra.estado === 'completada' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            {compra.estado}
                        </span>
                    </div>
                </div>

                {/* Items Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">Detalle de Productos</h3>
                    </div>
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">P. Unitario</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {compra.detalles?.map((item) => (
                                <tr key={item.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {item.codigo_principal}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {item.producto_nombre}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                        {item.cantidad}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                        ${Number(item.precio_unitario).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                                        ${Number(item.total_por_producto).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                    <div className="bg-white p-6 rounded-lg shadow-sm w-full md:w-1/3">
                        <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="text-gray-600">Subtotal</span>
                            <span className="font-medium">${Number(compra.total_sin_impuestos).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="text-gray-600">Impuestos</span>
                            <span className="font-medium">${(Number(compra.total_con_impuestos) - Number(compra.total_sin_impuestos)).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between py-2 text-lg font-bold text-indigo-600 mt-2">
                            <span>Total</span>
                            <span>${Number(compra.total_con_impuestos).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
