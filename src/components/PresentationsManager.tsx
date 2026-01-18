'use client';

import { useState, useEffect, useCallback } from 'react';
import { getApiClient } from '@/lib/api';
import type { Presentacion } from '@/lib/types/productos';

interface PresentationsManagerProps {
    productoId: number;
}

export default function PresentationsManager({ productoId }: PresentationsManagerProps) {
    const [presentaciones, setPresentaciones] = useState<Presentacion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Form State
    const [isAdding, setIsAdding] = useState(false);
    const [newForm, setNewForm] = useState({
        nombre_presentacion: '',
        cantidad: '',
        precio: '',
        canal: 'LOCAL'
    });
    const [submitting, setSubmitting] = useState(false);

    const cargarPresentaciones = useCallback(async () => {
        try {
            setLoading(true);
            const api = getApiClient();
            const response = await api.getPresentaciones(productoId);
            if (response.success && response.data) {
                setPresentaciones(response.data);
            }
        } catch (err) {
            console.error('Error cargando presentaciones', err);
            setError('Error al cargar presentaciones');
        } finally {
            setLoading(false);
        }
    }, [productoId]);

    useEffect(() => {
        cargarPresentaciones();
    }, [cargarPresentaciones]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            const api = getApiClient();
            const response = await api.crearPresentacion(productoId, newForm);

            if (response.success) {
                setNewForm({ nombre_presentacion: '', cantidad: '', precio: '', canal: 'LOCAL' });
                setIsAdding(false);
                cargarPresentaciones();
            } else {
                setError(response.error || 'Error al crear presentación');
            }
        } catch (err: any) {
            setError(err.message || 'Error al crear presentación');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Estás seguro de eliminar esta presentación de todas las sucursales?')) return;

        try {
            const api = getApiClient();
            const response = await api.eliminarPresentacion(productoId, id);

            if (response.success) {
                cargarPresentaciones();
            } else {
                alert(response.error || 'Error al eliminar');
            }
        } catch (err) {
            alert('Error al eliminar presentación');
        }
    };

    if (loading && presentaciones.length === 0) return <div className="text-gray-500 text-sm">Cargando presentaciones...</div>;

    return (
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Presentaciones y Precios</h3>
                <button
                    type="button"
                    onClick={() => setIsAdding(!isAdding)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                    {isAdding ? 'Cancelar' : '+ Agregar Presentación'}
                </button>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">
                    {error}
                </div>
            )}

            {isAdding && (
                <form onSubmit={handleAdd} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Nombre (ej: Caja x12)</label>
                            <input
                                type="text"
                                required
                                value={newForm.nombre_presentacion}
                                onChange={e => setNewForm({ ...newForm, nombre_presentacion: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                                placeholder="Nombre"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Cantidad Unidades</label>
                            <input
                                type="number"
                                required
                                min="1"
                                value={newForm.cantidad}
                                onChange={e => setNewForm({ ...newForm, cantidad: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                                placeholder="Ej: 12"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Precio Venta</label>
                            <input
                                type="number"
                                required
                                step="0.01"
                                min="0"
                                value={newForm.precio}
                                onChange={e => setNewForm({ ...newForm, precio: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Canal de Venta</label>
                            <select
                                required
                                value={newForm.canal}
                                onChange={e => setNewForm({ ...newForm, canal: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                            >
                                <option value="LOCAL">🏪 Local / POS</option>
                                <option value="UBER">🚗 Uber Eats</option>
                                <option value="RAPPI">🛵 Rappi</option>
                                <option value="WEB">🌐 Tienda Online</option>
                            </select>
                        </div>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                        >
                            {submitting ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            )}

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contenido</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Canal</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Global</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {presentaciones.map((p) => (
                            <tr key={p.id}>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{p.nombre_presentacion}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{p.cantidad} unidades</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${p.canal === 'LOCAL' ? 'bg-blue-100 text-blue-800' :
                                            p.canal === 'UBER' ? 'bg-green-100 text-green-800' :
                                                p.canal === 'RAPPI' ? 'bg-orange-100 text-orange-800' :
                                                    'bg-purple-100 text-purple-800'
                                        }`}>
                                        {p.canal_display || p.canal}
                                    </span>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 font-medium">${p.precio}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                                    {p.nombre_presentacion !== 'Unidad' && (
                                        <button
                                            onClick={() => handleDelete(p.id)}
                                            className="text-red-600 hover:text-red-900 ml-3"
                                        >
                                            Eliminar
                                        </button>
                                    )}
                                    {p.nombre_presentacion === 'Unidad' && (
                                        <span className="text-gray-400 text-xs italic">Principal</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="mt-2 text-xs text-gray-500 italic">
                * "Unidad" es la presentación base y su precio se edita arriba. Las nuevas presentaciones se aplican a todas las sucursales.
            </p>
        </div>
    );
}
