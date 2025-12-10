
'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getApiClient } from '@/lib/api';

export default function ConfiguracionPage() {
    const [formData, setFormData] = useState({
        nombre_comercial: '',
        razon_social: '',
        ruc: '',
        direccion: '',
        telefono: '',
        correo_electronico: '',
        ambiente: '1',
        obligado_contabilidad: false,
        contribuyente_especial: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const api = getApiClient();
            const res = await api.getConfiguracion();
            if (res.success) {
                setFormData(res.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');

        try {
            const api = getApiClient();
            const res = await api.updateConfiguracion(formData);
            if (res.success) {
                setMessage('Configuración guardada correctamente');
            } else {
                setMessage('Error al guardar configuración');
            }
        } catch (err) {
            setMessage('Error de conexión');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <DashboardLayout><div>Cargando...</div></DashboardLayout>;

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Configuración General</h1>

                <div className="bg-white shadow rounded-lg p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Razón Social</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-50"
                                    value={formData.razon_social}
                                    readOnly
                                    title="Para cambiar la Razón Social contáctese con soporte"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">RUC</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-50"
                                    value={formData.ruc}
                                    readOnly
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Nombre Comercial</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={formData.nombre_comercial}
                                    onChange={e => setFormData({ ...formData, nombre_comercial: e.target.value })}
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Dirección Matriz</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={formData.direccion}
                                    onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={formData.telefono}
                                    onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input
                                    type="email"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={formData.correo_electronico}
                                    onChange={e => setFormData({ ...formData, correo_electronico: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Ambiente SRI</label>
                                <select
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={formData.ambiente}
                                    onChange={e => setFormData({ ...formData, ambiente: e.target.value })}
                                >
                                    <option value="1">PRUEBAS</option>
                                    <option value="2">PRODUCCIÓN</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nro. Contribuyente Especial</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={formData.contribuyente_especial}
                                    onChange={e => setFormData({ ...formData, contribuyente_especial: e.target.value })}
                                    placeholder="Dejar vacío si no aplica"
                                />
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="obligado"
                                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                                    checked={formData.obligado_contabilidad}
                                    onChange={e => setFormData({ ...formData, obligado_contabilidad: e.target.checked })}
                                />
                                <label htmlFor="obligado" className="ml-2 block text-sm text-gray-900">
                                    Obligado a llevar contabilidad
                                </label>
                            </div>
                        </div>

                        {message && (
                            <div className={`text-sm ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                                {message}
                            </div>
                        )}

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={saving}
                                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50"
                            >
                                {saving ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
