'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProductForm from '@/components/ProductForm';
import DashboardLayout from '@/components/DashboardLayout';
import PresentationsManager from '@/components/PresentationsManager';
import type { Producto } from '@/lib/types/productos';

export default function NuevoProductoPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [createdProduct, setCreatedProduct] = useState<Producto | null>(null);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    if (loading) return null;
    if (!user) return null;

    const handleSuccess = (producto: Producto) => {
        console.log('Producto creado/actualizado:', producto);
        setCreatedProduct(producto);
        // Pequeño delay para que el usuario note que se guardó
        setTimeout(() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }, 100);
    };

    return (
        <DashboardLayout>
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">
                    {createdProduct ? 'Editar Producto y Presentaciones' : 'Nuevo Producto'}
                </h1>

                {createdProduct && (
                    <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 animate-fade-in-down">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-green-800">Producto guardado correctamente</h3>
                                <div className="mt-2 text-sm text-green-700">
                                    <p>Ahora puedes agregar presentaciones adicionales abajo.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Usamos key para forzar re-render si el producto cambia (ej: de null a creado) */}
                <ProductForm
                    key={createdProduct ? `edit-${createdProduct.id}` : 'new'}
                    onSuccess={handleSuccess}
                    initialData={createdProduct || undefined}
                />

                {createdProduct && (
                    <div className="mt-8 pt-8 border-t border-gray-200 animate-fade-in-up">
                        <PresentationsManager productoId={createdProduct.id} />

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => router.push('/productos')}
                                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
                            >
                                Finalizar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
