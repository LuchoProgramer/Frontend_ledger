'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getApiClient } from '@/lib/api';
import type { Proveedor } from '@/lib/types/proveedores';
import DashboardLayout from '@/components/DashboardLayout';
import PortalModal from '@/components/ui/PortalModal';

export default function ProveedoresPage() {
    const { user, loading: authLoading, isAdmin } = useAuth();
    const router = useRouter();
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [mounted, setMounted] = useState(false);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        nombre: '',
        ruc: '',
        direccion: '',
        telefono: '',
        email: ''
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (!authLoading && !isAdmin) {
            router.push('/');
        }
    }, [authLoading, isAdmin, router]);

    const cargarProveedores = useCallback(async () => {
        try {
            setLoading(true);
            const api = getApiClient();
            const response = await api.getProveedores();
            if (response.success) {
                setProveedores(response.data || response.results || []);
            } else {
                setError(response.error || 'Error al cargar proveedores');
            }
        } catch (err) {
            setError('Error de conexión al cargar proveedores');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAdmin) {
            cargarProveedores();
        }
    }, [isAdmin, cargarProveedores]);

    const handleOpenCreate = () => {
        setEditingId(null);
        setFormData({ nombre: '', ruc: '', direccion: '', telefono: '', email: '' });
        setShowModal(true);
        setError('');
    };

    const handleOpenEdit = (prov: Proveedor) => {
        setEditingId(prov.id);
        setFormData({
            nombre: prov.nombre,
            ruc: prov.ruc,
            direccion: prov.direccion,
            telefono: prov.telefono || '',
            email: prov.email || ''
        });
        setShowModal(true);
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        // Simple Validation
        if (formData.ruc.length !== 13) {
            setError('El RUC debe tener 13 dígitos');
            setSaving(false);
            return;
        }

        try {
            const api = getApiClient();
            let response;
            if (editingId) {
                response = await api.actualizarProveedor(editingId, formData);
            } else {
                response = await api.crearProveedor(formData);
            }

            if (response.success) {
                setShowModal(false);
                cargarProveedores();
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
        if (!window.confirm('¿Estás seguro de eliminar este proveedor?')) return;

        try {
            const api = getApiClient();
            const response = await api.eliminarProveedor(id);
            if (response.success) {
                cargarProveedores();
            } else {
                alert(response.error || 'Error al eliminar');
            }
        } catch (err) {
            alert('Error al eliminar');
        }
    };

    if (authLoading || (loading && proveedores.length === 0)) {
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
                    <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
                    <button
                        onClick={handleOpenCreate}
                        className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center"
                    >
                        <span className="mr-2">+</span> Nuevo Proveedor
                    </button>
                </div>

                {error && (
                    <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
                        {error}
                    </div>
                )}

                {/* Desktop Table */}
                <div className="hidden md:block bg-white shadow overflow-hidden sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Razón Social</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RUC</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {proveedores.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                                        No hay proveedores registrados
                                    </td>
                                </tr>
                            ) : (
                                proveedores.map((prov) => (
                                    <tr key={prov.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{prov.nombre}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{prov.ruc}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{prov.telefono}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{prov.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleOpenEdit(prov)}
                                                className="text-indigo-600 hover:text-indigo-900 mr-4"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => handleDelete(prov.id)}
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

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                    {proveedores.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 bg-white rounded-lg shadow">
                            No hay proveedores registrados
                        </div>
                    ) : (
                        proveedores.map((prov) => (
                            <div key={prov.id} className="bg-white shadow rounded-lg p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900">{prov.nombre}</h3>
                                        <p className="text-sm font-mono text-gray-500 mt-1">{prov.ruc}</p>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleOpenEdit(prov)}
                                            className="text-indigo-600 bg-indigo-50 p-2 rounded-md hover:bg-indigo-100"
                                        >
                                            <span className="sr-only">Editar</span>
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => handleDelete(prov.id)}
                                            className="text-red-600 bg-red-50 p-2 rounded-md hover:bg-red-100"
                                        >
                                            <span className="sr-only">Eliminar</span>
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                                <div className="border-t pt-3 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Teléfono:</span>
                                        <span className="text-gray-900">{prov.telefono || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Email:</span>
                                        <span className="text-gray-900 break-all">{prov.email || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Dirección:</span>
                                        <span className="text-gray-900 text-right">{prov.direccion || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* MODAL */}
            <PortalModal isOpen={showModal} onClose={() => setShowModal(false)}>
                <form onSubmit={handleSubmit}>
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                    {editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                                </h3>
                                <div className="mt-4 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">RUC *</label>
                                            <input
                                                type="text"
                                                required
                                                maxLength={13}
                                                placeholder="099..."
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                value={formData.ruc}
                                                onChange={(e) => setFormData({ ...formData, ruc: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                                            <input
                                                type="text"
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                value={formData.telefono}
                                                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Razón Social *</label>
                                        <input
                                            type="text"
                                            required
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            value={formData.nombre}
                                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Email</label>
                                        <input
                                            type="email"
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Dirección</label>
                                        <input
                                            type="text"
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            value={formData.direccion}
                                            onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
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
            </PortalModal>
        </DashboardLayout>
    );
}
