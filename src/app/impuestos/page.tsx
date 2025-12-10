'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getApiClient } from '@/lib/api';
import type { Impuesto } from '@/lib/types/catalogos';
import DashboardLayout from '@/components/DashboardLayout';
import PortalModal from '@/components/ui/PortalModal';

export default function ImpuestosPage() {
    const { user, loading: authLoading, isAdmin } = useAuth();
    const router = useRouter();
    const [impuestos, setImpuestos] = useState<Impuesto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({ nombre: '', porcentaje: '', codigo: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            router.push('/');
        }
    }, [authLoading, isAdmin, router]);

    const cargarImpuestos = useCallback(async () => {
        try {
            setLoading(true);
            const api = getApiClient();
            const response = await api.getImpuestos();
            if (response.success && response.data) {
                setImpuestos(response.data);
            } else {
                setError(response.error || 'Error al cargar impuestos');
            }
        } catch (err) {
            setError('Error de conexión al cargar impuestos');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAdmin) {
            cargarImpuestos();
        }
    }, [isAdmin, cargarImpuestos]);

    const handleOpenCreate = () => {
        setEditingId(null);
        setFormData({ nombre: '', porcentaje: '', codigo: '' });
        setShowModal(true);
        setError('');
    };

    const handleOpenEdit = (imp: Impuesto) => {
        setEditingId(imp.id);
        setFormData({ nombre: imp.nombre, porcentaje: imp.porcentaje, codigo: imp.codigo });
        setShowModal(true);
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const api = getApiClient();
            let response;
            if (editingId) {
                response = await api.actualizarImpuesto(editingId, formData);
            } else {
                response = await api.crearImpuesto(formData);
            }

            if (response.success) {
                setShowModal(false);
                cargarImpuestos();
            } else {
                const errorMsg = typeof response.error === 'string'
                    ? response.error
                    : JSON.stringify(response.error);
                setError(errorMsg || 'Error al guardar');
            }
        } catch (err: any) {
            setError(err.message || 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Estás seguro de eliminar este impuesto?')) return;

        try {
            const api = getApiClient();
            const response = await api.eliminarImpuesto(id);
            if (response.success) {
                cargarImpuestos();
            } else {
                alert(response.error || 'Error al eliminar');
            }
        } catch (err) {
            alert('Error al eliminar');
        }
    };

    if (authLoading || (loading && impuestos.length === 0)) {
        return (
            <DashboardLayout>
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Impuestos y Tarifas</h1>
                    <button
                        onClick={handleOpenCreate}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        + Nuevo Impuesto
                    </button>
                </div>

                {error && (
                    <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
                        {error}
                    </div>
                )}

                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Porcentaje</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código SRI</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {impuestos.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                                        No hay impuestos registrados
                                    </td>
                                </tr>
                            ) : (
                                impuestos.map((imp) => (
                                    <tr key={imp.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{imp.nombre}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{imp.porcentaje}%</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{imp.codigo}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleOpenEdit(imp)}
                                                className="text-indigo-600 hover:text-indigo-900 mr-4"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => handleDelete(imp.id)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL */}
            <PortalModal isOpen={showModal} onClose={() => setShowModal(false)}>
                <form onSubmit={handleSubmit}>
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                    {editingId ? 'Editar Impuesto' : 'Nuevo Impuesto'}
                                </h3>
                                <div className="mt-4 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Nombre</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: IVA 15%"
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            value={formData.nombre}
                                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Porcentaje (%)</label>
                                            <input
                                                type="number"
                                                required
                                                step="0.01"
                                                placeholder="15.00"
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                value={formData.porcentaje}
                                                onChange={(e) => setFormData({ ...formData, porcentaje: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Código SRI</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="2"
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                value={formData.codigo}
                                                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                        >
                            {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowModal(false)}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            </PortalModal>
        </DashboardLayout>
    );
}
