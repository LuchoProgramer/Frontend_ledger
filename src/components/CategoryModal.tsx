'use client';

import { useState } from 'react';
import PortalModal from './ui/PortalModal';
import { getApiClient } from '@/lib/api';
import type { Categoria } from '@/lib/types/productos';

interface CategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (categoria: Categoria) => void;
}

export default function CategoryModal({ isOpen, onClose, onSuccess }: CategoryModalProps) {
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [googleCategoryId, setGoogleCategoryId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!nombre.trim()) {
            setError('El nombre es obligatorio');
            setLoading(false);
            return;
        }

        try {
            const api = getApiClient();
            const res = await api.crearCategoria({
                nombre,
                descripcion,
                google_category_id: googleCategoryId || undefined
            });

            if (res.success && res.data) {
                onSuccess(res.data);
                onClose();
                // Limpiar campos
                setNombre('');
                setDescripcion('');
                setGoogleCategoryId('');
            } else {
                setError(res.error || 'Error al crear la categoría');
            }
        } catch (err: any) {
            console.error('Category creation error:', err);
            setError(err.message || 'Error de conexión al crear la categoría');
        } finally {
            setLoading(false);
        }
    };

    return (
        <PortalModal isOpen={isOpen} onClose={onClose}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 w-full">
                <div className="sm:flex sm:items-start w-full">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                            Nueva Categoría
                        </h3>
                        <div className="mt-4 w-full">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && (
                                    <div className="p-2 bg-red-50 text-red-700 text-sm rounded border border-red-200">
                                        {error}
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 text-left">Nombre</label>
                                    <input
                                        type="text"
                                        value={nombre}
                                        onChange={(e) => setNombre(e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        placeholder="Ej: Bebidas"
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 text-left">Descripción (Opcional)</label>
                                    <textarea
                                        value={descripcion}
                                        onChange={(e) => setDescripcion(e.target.value)}
                                        rows={3}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 text-left">
                                        Google Category ID (Opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={googleCategoryId}
                                        onChange={(e) => setGoogleCategoryId(e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        placeholder="Ej: 499 (Bebidas Alcohólicas)"
                                    />
                                    <p className="mt-1 text-xs text-gray-500 text-left">
                                        ID de categoría de Google Merchant Center.
                                        <a
                                            href="https://www.google.com/basepages/producttype/taxonomy-with-ids.es-ES.txt"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline ml-1"
                                        >
                                            Ver lista completa
                                        </a>
                                    </p>
                                </div>
                                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-2">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm disabled:opacity-50"
                                    >
                                        {loading ? 'Guardando...' : 'Crear Categoría'}
                                    </button>
                                    <button
                                        type="button"
                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                                        onClick={onClose}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </PortalModal>
    );
}
