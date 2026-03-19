'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getApiClient } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import ComboForm, { type ComboFormInitialData } from '../../ComboForm';

export default function EditarComboPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const comboId = Number(params.id);

    const [initialData, setInitialData] = useState<ComboFormInitialData | null>(null);
    const [loadingCombo, setLoadingCombo] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (authLoading) return;
        if (!user) { router.push('/'); return; }
        const canManage = user.is_superuser || user.is_staff || user.groups?.includes('Administrador');
        if (!canManage) { router.push('/combos'); return; }
        cargarCombo();
    }, [user, authLoading]);

    const cargarCombo = async () => {
        try {
            setLoadingCombo(true);
            const api = getApiClient();
            const data = await api.getCombo(comboId);

            // Obtener slot categorías del backend (no vienen en el serializer de lectura básico)
            // Las categorías no se exponen en ComboSlotReadSerializer — se muestran vacías inicialmente
            // El admin puede re-seleccionarlas al editar
            setInitialData({
                id: data.id,
                nombre: data.nombre,
                descripcion: data.descripcion ?? '',
                precio: data.precio,
                sucursal: data.sucursal,
                activo: data.activo,
                items: data.items,
                slots: data.slots.map(sl => ({
                    ...sl,
                    categorias: [], // No expuesto en read serializer; se re-configura al editar
                })),
            });
        } catch (err: any) {
            setError(err.message || 'Error al cargar el combo');
        } finally {
            setLoadingCombo(false);
        }
    };

    if (authLoading || loadingCombo) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (error) {
        return (
            <DashboardLayout>
                <div className="max-w-3xl mx-auto px-4 py-8">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
                    <button onClick={() => router.push('/combos')} className="mt-4 text-sm text-blue-600 hover:underline">
                        ← Volver a combos
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    if (!initialData) return null;

    return (
        <DashboardLayout>
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Editar Combo</h1>
                    <p className="mt-1 text-sm text-gray-500">{initialData.nombre}</p>
                    <p className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                        Nota: Los slots variables se guardan sin sus categorías previas. Vuelve a seleccionar las categorías para cada slot antes de guardar.
                    </p>
                </div>
                <ComboForm initialData={initialData} comboId={comboId} />
            </div>
        </DashboardLayout>
    );
}
