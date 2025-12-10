
'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getApiClient } from '@/lib/api';

export default function CertificadosPage() {
    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Form state
    const [file, setFile] = useState<File | null>(null);
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const api = getApiClient();
            const res = await api.getConfiguracion();
            if (res.success) {
                setConfig(res.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);
        setMessage('');
        setError('');

        try {
            const formData = new FormData();
            if (file) formData.append('certificado', file);
            if (password) formData.append('password', password);

            const api = getApiClient();
            const res = await api.subirCertificado(formData);

            if (res.success) {
                setMessage('Certificado actualizado correctamente');
                setFile(null);
                setPassword('');
                loadConfig(); // Reload to see updated status if API supports it
            } else {
                setError(res.error || 'Error al subir certificado');
            }
        } catch (err: any) {
            setError(err.message || 'Error de conexión');
        } finally {
            setUploading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Certificado Digital (Firma Electrónica)</h1>

                <div className="bg-white shadow rounded-lg p-6 mb-8">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Estado Actual</h2>
                    {loading ? (
                        <p>Cargando...</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">Razón Social</p>
                                <p className="font-medium">{config?.razon_social || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">RUC</p>
                                <p className="font-medium">{config?.ruc || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Vigencia Certificado</p>
                                <p className={`font-medium ${config?.certificado_valido_hasta ? 'text-green-600' : 'text-red-500'}`}>
                                    {config?.certificado_valido_hasta || 'No configurado'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Ambiente SRI</p>
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${config?.ambiente === '2' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                    {config?.ambiente === '2' ? 'PRODUCCIÓN' : 'PRUEBAS'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Actualizar Certificado</h2>

                    <form onSubmit={handleUpload} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Archivo .p12
                            </label>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition-colors cursor-pointer relative">
                                <div className="space-y-1 text-center">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <div className="flex text-sm text-gray-600">
                                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                                            <span>Subir un archivo</span>
                                            <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".p12" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                                        </label>
                                        <p className="pl-1">o arrastrar y soltar</p>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        {file ? `Seleccionado: ${file.name}` : 'Solo archivos .p12 hasta 10MB'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Contraseña del Certificado
                            </label>
                            <input
                                type="password"
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Ingrese la contraseña del archivo .p12"
                            />
                        </div>

                        {message && <div className="text-green-600 text-sm">{message}</div>}
                        {error && <div className="text-red-600 text-sm">{error}</div>}

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={uploading}
                                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50"
                            >
                                {uploading ? 'Subiendo...' : 'Actualizar Certificado'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
