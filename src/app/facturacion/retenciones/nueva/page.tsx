'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { getApiClient } from '@/lib/api';

export default function NuevaRetencionPage() {
    const router = useRouter();
    const apiClient = getApiClient();

    // Form Data
    const [identificacion, setIdentificacion] = useState('');
    const [proveedor, setProveedor] = useState<any | null>(null);

    // Doc Sustento
    const [docTipo, setDocTipo] = useState('01'); // Factura
    const [docNumero, setDocNumero] = useState('');
    const [docFecha, setDocFecha] = useState('');
    const [docBase, setDocBase] = useState('');
    const [docTotal, setDocTotal] = useState('');

    // Impuesto a agregar
    const [impCodigo, setImpCodigo] = useState('1'); // 1 Renta, 2 IVA
    const [impRetCode, setImpRetCode] = useState('312');
    const [impBase, setImpBase] = useState('');
    const [impPorcentaje, setImpPorcentaje] = useState('1.75');

    interface ImpuestoRetencion {
        codigo_impuesto: string;
        codigo_retencion: string;
        base_imponible: number;
        porcentaje: number;
        valor_retenido: number;
    }

    const [impuestos, setImpuestos] = useState<ImpuestoRetencion[]>([]);

    const [loading, setLoading] = useState(false);

    const buscarProveedor = async () => {
        // Mock simple search or implement specific endpoint
        // For now, assume manual entry or using existing getProveedores logic if available
        // Or create new generic client search.
        // Let's assume user enters valid ID and we send it to backend to resolve/validate on create or add separate lookup.
        // Simplification: Just allow ID input and assume "Consumidor Final" or generic if not found, 
        // BUT retentions require valid provider.
        // We will try to find client/provider by ID using existing search
        try {
            const res = await apiClient.getProveedores({ search: identificacion });
            if (res.results && res.results.length > 0) {
                setProveedor(res.results[0]);
            } else {
                alert('Proveedor no encontrado. (Asegúrese de que esté registrado como Proveedor/Cliente)');
                setProveedor(null);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const agregarImpuesto = () => {
        const base = parseFloat(impBase);
        const porc = parseFloat(impPorcentaje);
        if (!base || !porc) return;

        const val = (base * porc / 100).toFixed(2);

        setImpuestos([...impuestos, {
            codigo_impuesto: impCodigo,
            codigo_retencion: impRetCode,
            base_imponible: base,
            porcentaje: porc,
            valor_retenido: parseFloat(val)
        }]);

        // Reset inputs
        setImpBase('');
    };

    const eliminarImpuesto = (idx: number) => {
        const newImps = [...impuestos];
        newImps.splice(idx, 1);
        setImpuestos(newImps);
    };

    const handleSubmit = async () => {
        if (!proveedor) {
            alert('Seleccione un proveedor');
            return;
        }
        if (impuestos.length === 0) {
            alert('Agregue al menos un impuesto a retener');
            return;
        }

        setLoading(true);
        try {
            await apiClient.crearRetencion({
                proveedor: { id: proveedor.id },
                documento_sustento: {
                    tipo_documento: docTipo,
                    numero_documento: docNumero,
                    fecha_emision: docFecha,
                    base_imponible_total: parseFloat(docBase),
                    total_documento: parseFloat(docTotal)
                },
                impuestos: impuestos
            });
            alert('Retención generada exitosamente');
            router.push('/facturacion/retenciones');
        } catch (error: any) {
            alert(error.error || 'Error al crear retención');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="p-6 max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Nueva Retención</h1>

                {/* Paso 1: Proveedor */}
                <div className="bg-white p-6 rounded shadow-sm mb-6">
                    <h2 className="text-lg font-bold mb-4 border-b pb-2">1. Proveedor / Sujeto Retenido</h2>
                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700">RUC / Cédula</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded"
                                value={identificacion}
                                onChange={e => setIdentificacion(e.target.value)}
                                placeholder="Ingrese identificación"
                            />
                        </div>
                        <button
                            onClick={buscarProveedor}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Buscar
                        </button>
                    </div>
                    {proveedor && (
                        <div className="mt-4 p-4 bg-green-50 rounded text-green-800">
                            <strong>Seleccionado:</strong> {proveedor.razon_social} ({proveedor.identificacion})
                        </div>
                    )}
                </div>

                {/* Paso 2: Documento Sustento */}
                <div className="bg-white p-6 rounded shadow-sm mb-6">
                    <h2 className="text-lg font-bold mb-4 border-b pb-2">2. Documento Sustento</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tipo Documento</label>
                            <select
                                className="w-full p-2 border rounded"
                                value={docTipo}
                                onChange={e => setDocTipo(e.target.value)}
                            >
                                <option value="01">Factura</option>
                                <option value="03">Liquidación de Compra</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Número (001-001-123456789)</label>
                            <input type="text" className="w-full p-2 border rounded" value={docNumero} onChange={e => setDocNumero(e.target.value)} placeholder="001-001-000000001" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Fecha Emisión</label>
                            <input type="date" className="w-full p-2 border rounded" value={docFecha} onChange={e => setDocFecha(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Base Imponible Total</label>
                            <input type="number" className="w-full p-2 border rounded" value={docBase} onChange={e => setDocBase(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Total Documento</label>
                            <input type="number" className="w-full p-2 border rounded" value={docTotal} onChange={e => setDocTotal(e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* Paso 3: Impuestos */}
                <div className="bg-white p-6 rounded shadow-sm mb-6">
                    <h2 className="text-lg font-bold mb-4 border-b pb-2">3. Impuestos a Retener</h2>

                    <div className="p-4 bg-gray-50 rounded mb-4">
                        <div className="grid grid-cols-5 gap-2 items-end">
                            <div className="col-span-1">
                                <label className="text-xs text-gray-500">Impuesto</label>
                                <select className="w-full p-1 border rounded text-sm" value={impCodigo} onChange={e => setImpCodigo(e.target.value)}>
                                    <option value="1">RENTA</option>
                                    <option value="2">IVA</option>
                                </select>
                            </div>
                            <div className="col-span-1">
                                <label className="text-xs text-gray-500">Cód. Retención</label>
                                <input type="text" className="w-full p-1 border rounded text-sm" value={impRetCode} onChange={e => setImpRetCode(e.target.value)} placeholder="Ej. 312" />
                            </div>
                            <div className="col-span-1">
                                <label className="text-xs text-gray-500">Base Imp.</label>
                                <input type="number" className="w-full p-1 border rounded text-sm" value={impBase} onChange={e => setImpBase(e.target.value)} placeholder="0.00" />
                            </div>
                            <div className="col-span-1">
                                <label className="text-xs text-gray-500">% Retener</label>
                                <input type="number" className="w-full p-1 border rounded text-sm" value={impPorcentaje} onChange={e => setImpPorcentaje(e.target.value)} placeholder="%" />
                            </div>
                            <button onClick={agregarImpuesto} className="bg-green-600 text-white p-1 rounded hover:bg-green-700 text-sm">Agregar</button>
                        </div>
                    </div>

                    <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                            <tr>
                                <th className="text-left text-xs text-gray-500">Impuesto</th>
                                <th className="text-left text-xs text-gray-500">Código</th>
                                <th className="text-right text-xs text-gray-500">Base</th>
                                <th className="text-right text-xs text-gray-500">%</th>
                                <th className="text-right text-xs text-gray-500">Valor Retenido</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {impuestos.map((imp, idx) => (
                                <tr key={idx}>
                                    <td className="text-sm">{imp.codigo_impuesto === '1' ? 'RENTA' : 'IVA'}</td>
                                    <td className="text-sm">{imp.codigo_retencion}</td>
                                    <td className="text-sm text-right">${imp.base_imponible.toFixed(2)}</td>
                                    <td className="text-sm text-right">{imp.porcentaje}%</td>
                                    <td className="text-sm text-right font-bold">${imp.valor_retenido.toFixed(2)}</td>
                                    <td className="text-right">
                                        <button onClick={() => eliminarImpuesto(idx)} className="text-red-500 text-xs">Eliminar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={4} className="text-right font-bold pt-4">Total Retenido:</td>
                                <td className="text-right font-bold pt-4 text-lg">
                                    ${impuestos.reduce((acc, curr) => acc + curr.valor_retenido, 0).toFixed(2)}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 border rounded text-gray-600"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {loading ? 'Emitiendo...' : 'Emitir Retención'}
                    </button>
                </div>
            </div>
        </DashboardLayout>
    );
}
