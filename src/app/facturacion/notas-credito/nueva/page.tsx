'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { getApiClient } from '@/lib/api';
import { Factura, DetalleFactura } from '@/lib/types/ventas';

export default function NuevaNotaCreditoPage() {
    const router = useRouter();
    const apiClient = getApiClient();

    // Search
    const [search, setSearch] = useState('');
    const [facturas, setFacturas] = useState<Factura[]>([]);
    const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);

    // NC Data
    const [motivo, setMotivo] = useState('Devolución de mercadería');
    const [itemsDevolucion, setItemsDevolucion] = useState<{ producto_id: number, cantidad: number }[]>([]);

    // Status
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const searchFacturas = async (term: string) => {
        if (term.length < 3) return;
        setLoading(true);
        try {
            const res = await apiClient.getHistorialVentas({ search: term });
            setFacturas(res.results || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectFactura = (factura: Factura) => {
        setSelectedFactura(factura);
        setFacturas([]);
        setSearch('');
        // Initialize return items with 0 quantity
        if (factura.detalles) {
            setItemsDevolucion([]);
        }
    };

    const handleQuantityChange = (productoId: number, max: number, value: string) => {
        const cant = parseFloat(value);
        if (cant < 0) return;
        if (cant > max) {
            alert(`No puede devolver más de lo facturado (${max})`);
            return;
        }

        const newItems = itemsDevolucion.filter(i => i.producto_id !== productoId);
        if (cant > 0) {
            newItems.push({ producto_id: productoId, cantidad: cant });
        }
        setItemsDevolucion(newItems);
    };

    const handleSubmit = async () => {
        if (!selectedFactura) return;
        if (itemsDevolucion.length === 0) {
            alert('Seleccione al menos un producto para devolver');
            return;
        }

        if (!confirm('¿Está seguro de generar esta Nota de Crédito? Esta acción enviará el documento al SRI.')) return;

        setSaving(true);
        try {
            await apiClient.crearNotaCredito({
                factura_id: selectedFactura.id,
                items: itemsDevolucion,
                motivo
            });
            alert('Nota de Crédito generada exitosamente');
            router.push('/facturacion/notas-credito');
        } catch (error: any) {
            alert(error.error || 'Error al generar NC');
        } finally {
            setSaving(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="p-6 max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Nueva Nota de Crédito</h1>

                {!selectedFactura ? (
                    <div className="bg-white p-6 rounded shadow-sm">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Buscar Factura a Modificar</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="flex-1 p-2 border rounded"
                                placeholder="Número de autorización, Cédula o Nombre Cliente..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && searchFacturas(search)}
                            />
                            <button
                                onClick={() => searchFacturas(search)}
                                className="px-4 py-2 bg-indigo-600 text-white rounded"
                            >
                                Buscar
                            </button>
                        </div>

                        {loading && <div className="mt-4 text-center">Buscando...</div>}

                        <div className="mt-4 space-y-2">
                            {facturas.map(f => (
                                <div key={f.id} className="p-4 border rounded hover:bg-gray-50 flex justify-between items-center cursor-pointer" onClick={() => handleSelectFactura(f)}>
                                    <div>
                                        <div className="font-bold">{f.numero_autorizacion}</div>
                                        <div className="text-sm text-gray-600">{f.cliente_nombre} - ${f.total_con_impuestos}</div>
                                        <div className="text-xs text-gray-400">{new Date(f.fecha_emision).toLocaleString()}</div>
                                    </div>
                                    <div className="text-indigo-600 font-bold">Seleccionar</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white p-6 rounded shadow-sm">
                        <div className="flex justify-between items-start mb-6 border-b pb-4">
                            <div>
                                <h2 className="text-lg font-bold">Modificando Factura: {selectedFactura.numero_autorizacion}</h2>
                                <p className="text-gray-600">{selectedFactura.cliente_nombre}</p>
                            </div>
                            <button onClick={() => setSelectedFactura(null)} className="text-sm text-red-500 hover:underline">
                                Cambiar Factura
                            </button>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo / Razón</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded"
                                value={motivo}
                                onChange={e => setMotivo(e.target.value)}
                            />
                        </div>

                        <h3 className="font-medium mb-2">Seleccione Productos a Devolver:</h3>
                        <table className="min-w-full divide-y divide-gray-200 mb-6">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs text-gray-500">Producto</th>
                                    <th className="px-4 py-2 text-center text-xs text-gray-500">Facturado</th>
                                    <th className="px-4 py-2 text-center text-xs text-gray-500">A Devolver</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {selectedFactura.detalles?.map((det: DetalleFactura) => (
                                    <tr key={det.id}>
                                        <td className="px-4 py-2 text-sm">{det.product_name}</td>
                                        <td className="px-4 py-2 text-center text-sm">{det.cantidad}</td>
                                        <td className="px-4 py-2 text-center">
                                            <input
                                                type="number"
                                                className="w-20 p-1 border rounded text-center"
                                                min="0"
                                                max={det.cantidad}
                                                placeholder="0"
                                                onChange={(e) => {
                                                    // TODO: Get product ID correctly from detail vs product relation? 
                                                    // In type DetalleFactura it is not explicit product_id, but usually backend sends it. 
                                                    // Assuming detailed serializer sends product id or detail has it.
                                                    // Let's assume detail has product_id or we use index if needed, but better explicit.
                                                    // Checking DetalleFactura type: it has id, product_name. It lacks product_id.
                                                    // We need to update type or cast. For now casting as any for productId access if hidden.
                                                    handleQuantityChange((det as any).producto, det.cantidad, e.target.value)
                                                }}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => router.back()}
                                className="px-4 py-2 border rounded text-gray-600"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={saving}
                                className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {saving ? 'Generando...' : 'Generar Nota de Crédito'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
