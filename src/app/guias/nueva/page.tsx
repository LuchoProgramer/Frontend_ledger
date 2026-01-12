'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { getApiClient } from '@/lib/api';
import { Truck, ShoppingCart, Search, ArrowRight, User, AlertCircle } from 'lucide-react';

export default function NuevaGuiaPage() {
    const router = useRouter();
    const apiClient = getApiClient();
    const [mode, setMode] = useState<'SELECTION' | 'VENTA' | 'TRASLADO'>('SELECTION');

    // Venta Mode State
    const [facturas, setFacturas] = useState<any[]>([]);
    const [searchFactura, setSearchFactura] = useState('');
    const [selectedFactura, setSelectedFactura] = useState<any>(null);
    const [loadingFacturas, setLoadingFacturas] = useState(false);

    // Transportista Form
    const [transportista, setTransportista] = useState({
        ruc: '',
        razon_social: '',
        placa: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Search Facturas
    const searchFacturas = async (term: string) => {
        setLoadingFacturas(true);
        try {
            const res = await apiClient.getFacturas({
                search: term,
                page: 1,
                estado_sri: 'AUT' // Only authorized invoices
            });
            setFacturas(res.results);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingFacturas(false);
        }
    };

    // Debounce search
    useEffect(() => {
        if (mode === 'VENTA') {
            const timeout = setTimeout(() => {
                searchFacturas(searchFactura);
            }, 500);
            return () => clearTimeout(timeout);
        }
    }, [searchFactura, mode]);

    const handleSubmitVenta = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!selectedFactura) {
            setError('Debe seleccionar una factura.');
            return;
        }
        if (!transportista.ruc || !transportista.razon_social || !transportista.placa) {
            setError('Todos los datos del transportista son obligatorios.');
            return;
        }

        setSubmitting(true);
        try {
            // Construct payload similar to test script structure
            const payload = {
                tipo_guia: 'VENTA',
                factura_id: selectedFactura.id,
                transportista: {
                    ruc: transportista.ruc,
                    razon_social: transportista.razon_social,
                    placa: transportista.placa
                },
                destinatario: {
                    // Logic to extract from factura is handled by backend usually, 
                    // or we pass explicit fields if backend expects them.
                    // Let's assume backend `GenericGuiaSerializer` or similar handles validation.
                    // We'll send what the CreateView expects.
                    // If creating manually, we might need more data.
                    // Let's try sending the ID and let backend populate.
                }
            };

            await apiClient.crearGuia(payload);
            router.push('/guias');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error al crear la guía');
        } finally {
            setSubmitting(false);
        }
    };

    if (mode === 'SELECTION') {
        return (
            <DashboardLayout>
                <div className="max-w-4xl mx-auto p-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Nueva Guía de Remisión</h1>
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Option 1: Venta */}
                        <div
                            onClick={() => setMode('VENTA')}
                            className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all group"
                        >
                            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors">
                                <ShoppingCart className="w-8 h-8 text-indigo-600 group-hover:text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Por Venta a Cliente</h3>
                            <p className="text-gray-500">
                                Generar guía a partir de una Factura existente.
                                Utiliza los datos del cliente y productos de la factura.
                            </p>
                        </div>

                        {/* Option 2: Traslado */}
                        <div
                            onClick={() => router.push('/inventario')} // Redirect to Inventory for now
                            className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:border-green-500 hover:shadow-md cursor-pointer transition-all group"
                        >
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-green-600 transition-colors">
                                <Truck className="w-8 h-8 text-green-600 group-hover:text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Traslado entre Sucursales</h3>
                            <p className="text-gray-500">
                                Mover mercadería entre mis propios locales.
                                (Gestionar desde módulo Inventario).
                            </p>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-3xl mx-auto p-6">
                <button
                    onClick={() => setMode('SELECTION')}
                    className="mb-6 text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1"
                >
                    ← Volver
                </button>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900">Nueva Guía por Venta</h2>
                        <p className="text-sm text-gray-500">Seleccione la factura y asigne el transportista</p>
                    </div>

                    <div className="p-6 space-y-8">
                        {/* Step 1: Select Factura */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Buscar Factura Autorizada</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Buscar por cliente o número..."
                                    value={searchFactura}
                                    onChange={(e) => setSearchFactura(e.target.value)}
                                />
                            </div>

                            {/* Results List */}
                            {loadingFacturas && <p className="text-sm text-gray-400 mt-2">Buscando...</p>}
                            <div className="mt-2 max-h-60 overflow-y-auto border border-gray-100 rounded-lg">
                                {facturas.map(f => (
                                    <div
                                        key={f.id}
                                        onClick={() => { setSelectedFactura(f); setSearchFactura(''); }}
                                        className={`p-3 cursor-pointer hover:bg-gray-50 flex justify-between items-center ${selectedFactura?.id === f.id ? 'bg-indigo-50 border-indigo-200' : ''}`}
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{f.numero_autorizacion} - {f.cliente_nombre}</p>
                                            <p className="text-xs text-gray-500">{f.fecha_emision} | Total: ${f.total_con_impuestos}</p>
                                        </div>
                                        {selectedFactura?.id === f.id && <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>}
                                    </div>
                                ))}
                            </div>

                            {selectedFactura && (
                                <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-100 flex items-start gap-3">
                                    <div className="p-2 bg-indigo-100 rounded-full">
                                        <FileText className="w-5 h-5 text-indigo-700" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-indigo-900">Factura Seleccionada</p>
                                        <p className="text-sm text-indigo-700">{selectedFactura.numero_autorizacion}</p>
                                        <p className="text-xs text-indigo-600">Cliente: {selectedFactura.cliente_nombre}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Step 2: Transportista */}
                        <div className="border-t border-gray-100 pt-6">
                            <h3 className="text-md font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <User className="w-5 h-5 text-gray-500" />
                                Datos del Transportista
                            </h3>

                            <div className="grid gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 uppercase mb-1">Cédula / RUC Chofer</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        value={transportista.ruc}
                                        onChange={e => setTransportista({ ...transportista, ruc: e.target.value })}
                                        placeholder="171..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 uppercase mb-1">Nombre / Razón Social</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        value={transportista.razon_social}
                                        onChange={e => setTransportista({ ...transportista, razon_social: e.target.value })}
                                        placeholder="Juan Perez"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 uppercase mb-1">Placa Vehículo</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        value={transportista.placa}
                                        onChange={e => setTransportista({ ...transportista, placa: e.target.value })}
                                        placeholder="PBA-1234"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <div className="flex justify-end pt-4">
                            <button
                                onClick={handleSubmitVenta}
                                disabled={submitting}
                                className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-shadow shadow-md flex items-center gap-2 disabled:opacity-50"
                            >
                                {submitting ? 'Generando...' : 'Generar Guía'}
                                {!submitting && <ArrowRight className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

// Icon helper
function FileText({ className }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
    )
}
