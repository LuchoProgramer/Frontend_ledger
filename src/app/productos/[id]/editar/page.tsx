'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getApiClient } from '@/lib/api';
import ProductForm from '@/components/ProductForm';
import PresentationsManager from '@/components/PresentationsManager';
import type { Producto } from '@/lib/types/productos';
import DashboardLayout from '@/components/DashboardLayout';

// En Next.js App Router, params se recibe como prop y debe ser usado con use() si es async,
// pero en page components params es una promesa en versiones recientes o directo.
// Para seguridad en cliente, usamos React.use() o lo tratamos como Props.
// En Next 15 params es Promise.
import { use } from 'react';

export default function EditarProductoPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    // Unwrap params
    const { id } = use(params);
    const productId = Number(id);

    const [producto, setProducto] = useState<Producto | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/');
            return;
        }

        const cargarProducto = async () => {
            try {
                const api = getApiClient();
                const response = await api.getProducto(productId);

                if (response.success && response.data) {
                    setProducto(response.data);
                } else {
                    setError(response.error || 'Producto no encontrado');
                }
            } catch (err) {
                console.error('Error cargando producto', err);
                setError('Error al cargar el producto');
            } finally {
                setLoading(false);
            }
        };

        cargarProducto();
    }, [user, authLoading, productId, router]);

    if (authLoading || loading) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>;
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 p-8 flex justify-center">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-red-200 text-red-700">
                    <h2 className="text-lg font-bold mb-2">Error</h2>
                    <p>{error}</p>
                    <button
                        onClick={() => router.back()}
                        className="mt-4 px-4 py-2 bg-gray-100 rounded text-gray-700 hover:bg-gray-200"
                    >
                        Volver
                    </button>
                </div>
            </div>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Editar Producto</h1>
                {producto && (
                    <>
                        <ProductForm initialData={producto} />
                        <PresentationsManager productoId={producto.id} />
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
