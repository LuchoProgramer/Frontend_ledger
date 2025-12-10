'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Truck, Save, Search, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Producto } from '@/lib/types/productos';

interface Sucursal {
    id: number;
    nombre: string;
    direccion: string;
}

export default function TransferenciasInventarioPage() {
    const { api } = useAuth();
    const router = useRouter();

    // Estado de carga
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Catálogos
    const [productos, setProductos] = useState<Producto[]>([]);
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);

    // Formulario
    const [formData, setFormData] = useState({
        producto_id: '',
        origen_id: '',
        destino_id: '',
        cantidad: '',
        generar_guia: false,
        transportista_ruc: '',
        transportista_razon_social: '',
        transportista_placa: ''
    });

    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [prodsRes, sucsRes] = await Promise.all([
                    api.getProductos({ page_size: 100, activo: true }),
                    api.getSucursalesList({ page_size: 50 })
                ]);
                setProductos(prodsRes.results || []);
                setSucursales(sucsRes.results || []);
            } catch (error) {
                setMessage({ type: 'error', text: 'Error cargando datos.' });
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [api]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage(null);

        // Validaciones
        if (formData.origen_id === formData.destino_id) {
            setMessage({ type: 'error', text: 'La sucursal de origen y destino no pueden ser la misma.' });
            setSubmitting(false);
            return;
        }

        if (formData.generar_guia) {
            if (!formData.transportista_ruc || !formData.transportista_razon_social) {
                setMessage({ type: 'error', text: 'Para generar guía, complete RUC y Razón Social del transportista.' });
                setSubmitting(false);
                return;
            }
        }

        try {
            await api.transferenciaInventario({
                producto_id: parseInt(formData.producto_id),
                origen_id: parseInt(formData.origen_id),
                destino_id: parseInt(formData.destino_id),
                cantidad: parseFloat(formData.cantidad),
                generar_guia: formData.generar_guia,
                transportista: formData.generar_guia ? {
                    ruc: formData.transportista_ruc,
                    razon_social: formData.transportista_razon_social,
                    placa: formData.transportista_placa
                } : undefined
            });

            setMessage({ type: 'success', text: 'Transferencia realizada con éxito.' });

            // Resetear formulario parcial
            setFormData(prev => ({
                ...prev,
                cantidad: '',
                producto_id: '' // Opcional: limpiar producto para seguir transfiriendo otro
            }));

        } catch (error: any) {
            setMessage({
                type: 'error',
                text: error.message || 'Error al procesar transferencia.'
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando...</div>;

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <Truck className="w-8 h-8 text-blue-600" />
                    Transferencias entre Sucursales
                </h1>
                <p className="text-gray-500 mt-2">
                    Mueve stock de una sucursal a otra y genera Guías de Remisión si es necesario.
                </p>
            </div>

            {message && (
                <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                    <p>{message.text}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Panel Principal: Datos de Movimiento */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
                        <h2 className="text-lg font-semibold text-gray-900 mb-6 pb-2 border-b">Detalles del Traslado</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                            {/* Flecha visual en desktop */}
                            <div className="hidden md:block absolute left-1/2 top-9 -translate-x-1/2 bg-white p-2 z-10">
                                <ArrowRight className="text-gray-400" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Origen (Sale)</label>
                                <select
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-red-50/50"
                                    value={formData.origen_id}
                                    onChange={(e) => setFormData({ ...formData, origen_id: e.target.value })}
                                    required
                                >
                                    <option value="">Seleccionar origen...</option>
                                    {sucursales.map(s => (
                                        <option key={s.id} value={s.id}>{s.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Destino (Entra)</label>
                                <select
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none bg-green-50/50"
                                    value={formData.destino_id}
                                    onChange={(e) => setFormData({ ...formData, destino_id: e.target.value })}
                                    required
                                >
                                    <option value="">Seleccionar destino...</option>
                                    {sucursales.map(s => (
                                        <option key={s.id} value={s.id}>{s.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="mt-8 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Producto a Transferir</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                    <select
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                        value={formData.producto_id}
                                        onChange={(e) => setFormData({ ...formData, producto_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Buscar producto...</option>
                                        {productos.map(p => (
                                            <option key={p.id} value={p.id}>{p.codigo_producto} - {p.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Cantidad</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    placeholder="0.00"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.cantidad}
                                    onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Panel Lateral: Transporte y Acciones */}
                <div className="space-y-6">

                    {/* Opciones de Guía */}
                    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all ${formData.generar_guia ? 'ring-2 ring-blue-500 border-transparent' : ''}`}>
                        <div className="flex items-center justify-between mb-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                                    checked={formData.generar_guia}
                                    onChange={(e) => setFormData({ ...formData, generar_guia: e.target.checked })}
                                />
                                <span className="font-medium text-gray-900">Generar Guía de Remisión</span>
                            </label>
                        </div>

                        {formData.generar_guia && (
                            <div className="space-y-4 pt-4 border-t border-gray-100 animate-in slide-in-from-top-2 fade-in">
                                <p className="text-xs text-blue-600 mb-2 font-medium">Datos del Transportista (Requeridos)</p>

                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">RUC Transportista</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 rounded border border-gray-300 text-sm focus:border-blue-500 outline-none"
                                        value={formData.transportista_ruc}
                                        onChange={(e) => setFormData({ ...formData, transportista_ruc: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Razón Social</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 rounded border border-gray-300 text-sm focus:border-blue-500 outline-none"
                                        value={formData.transportista_razon_social}
                                        onChange={(e) => setFormData({ ...formData, transportista_razon_social: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Placa Vehículo</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 rounded border border-gray-300 text-sm focus:border-blue-500 outline-none"
                                        value={formData.transportista_placa}
                                        onChange={(e) => setFormData({ ...formData, transportista_placa: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-col gap-3">
                        <button
                            type="submit"
                            disabled={submitting}
                            className={`w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl shadow-lg hover:bg-blue-700 transition-all font-bold ${submitting ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-0.5'
                                }`}
                        >
                            <Save className="w-5 h-5" />
                            {submitting ? 'Procesando...' : 'Confirmar Transferencia'}
                        </button>

                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="w-full px-6 py-3 text-gray-500 hover:text-gray-800 font-medium transition-colors text-center"
                        >
                            Cancelar Operación
                        </button>
                    </div>
                </div>

            </form>
        </div>
    );
}
