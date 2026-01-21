'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getApiClient } from '@/lib/api';
import type { Categoria } from '@/lib/types/catalogos';
import DashboardLayout from '@/components/DashboardLayout';

export default function CategoriasPage() {
    const { user, loading: authLoading, isAdmin } = useAuth();
    const router = useRouter();
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [mounted, setMounted] = useState(false);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({ nombre: '', descripcion: '', google_category_id: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (!authLoading && !isAdmin) {
            router.push('/');
        }
    }, [authLoading, isAdmin, router]);

    const cargarCategorias = useCallback(async () => {
        try {
            setLoading(true);
            const api = getApiClient();
            const response = await api.getCategorias();
            if (response.success && response.data) {
                setCategorias(response.data);
            } else {
                setError(response.error || 'Error al cargar categorías');
            }
        } catch (err) {
            setError('Error de conexión al cargar categorías');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAdmin) {
            cargarCategorias();
        }
    }, [isAdmin, cargarCategorias]);

    const handleOpenCreate = () => {
        setEditingId(null);
        setFormData({ nombre: '', descripcion: '', google_category_id: '' });
        setShowModal(true);
        setError('');
    };

    const handleOpenEdit = (cat: Categoria) => {
        setEditingId(cat.id);
        setFormData({ nombre: cat.nombre, descripcion: cat.descripcion || '', google_category_id: cat.google_category_id || '' });
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
                response = await api.actualizarCategoria(editingId, formData);
            } else {
                response = await api.crearCategoria(formData);
            }

            if (response.success) {
                setShowModal(false);
                cargarCategorias();
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
        if (!window.confirm('¿Estás seguro de eliminar esta categoría?')) return;

        try {
            const api = getApiClient();
            const response = await api.eliminarCategoria(id);
            if (response.success) {
                cargarCategorias();
            } else {
                alert(response.error || 'Error al eliminar');
            }
        } catch (err) {
            alert('Error al eliminar');
        }
    };

    if (authLoading || (loading && categorias.length === 0)) {
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
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <h1 className="text-2xl font-bold text-gray-900">Categorías</h1>
                    <button
                        onClick={handleOpenCreate}
                        className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center"
                    >
                        <span className="mr-2">+</span> Nueva Categoría
                    </button>
                </div>

                {error && (
                    <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
                        {error}
                    </div>
                )}

                {/* Desktop Table View */}
                <div className="hidden md:block bg-white shadow overflow-hidden sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {categorias.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                                        No hay categorías registradas
                                    </td>
                                </tr>
                            ) : (
                                categorias.map((cat) => (
                                    <tr key={cat.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cat.nombre}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{cat.descripcion}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleOpenEdit(cat)}
                                                className="text-indigo-600 hover:text-indigo-900 mr-4"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => handleDelete(cat.id)}
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

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {categorias.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 bg-white rounded-lg shadow">
                            No hay categorías registradas
                        </div>
                    ) : (
                        categorias.map((cat) => (
                            <div key={cat.id} className="bg-white shadow rounded-lg p-4 space-y-3">
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900">{cat.nombre}</h3>
                                    <p className="text-sm text-gray-500 mt-1">{cat.descripcion || 'Sin descripción'}</p>
                                </div>
                                <div className="flex justify-end space-x-3 border-t pt-3">
                                    <button
                                        onClick={() => handleOpenEdit(cat)}
                                        className="text-indigo-600 font-medium text-sm px-3 py-1 bg-indigo-50 rounded"
                                    >
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => handleDelete(cat.id)}
                                        className="text-red-600 font-medium text-sm px-3 py-1 bg-red-50 rounded"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* MODAL with Portal */}
            {showModal && mounted && createPortal(
                <div className="fixed inset-0 z-[9999] overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowModal(false)}></div>
                        </div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-[10000]">
                            <form onSubmit={handleSubmit}>
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <div className="sm:flex sm:items-start">
                                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                            <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                                {editingId ? 'Editar Categoría' : 'Nueva Categoría'}
                                            </h3>
                                            <div className="mt-4 space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Nombre</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        value={formData.nombre}
                                                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Descripción</label>
                                                    <textarea
                                                        rows={3}
                                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        value={formData.descripcion}
                                                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">ID Google Merchant (Opcional)</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Ej: 436 (Aguas), 499678 (Whisky)"
                                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        value={formData.google_category_id}
                                                        onChange={(e) => setFormData({ ...formData, google_category_id: e.target.value })}
                                                    />
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
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </DashboardLayout>
    );
}
