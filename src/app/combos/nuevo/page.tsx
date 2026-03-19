'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import ComboForm from '../ComboForm';

export default function NuevoComboPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;
        if (!user) { router.push('/'); return; }
        const canManage = user.is_superuser || user.is_staff || user.groups?.includes('Administrador');
        if (!canManage) router.push('/combos');
    }, [user, loading, router]);

    if (loading || !user) return null;

    return (
        <DashboardLayout>
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Nuevo Combo</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Los combos permiten vender múltiples productos como un solo ítem con precio fijo.
                    </p>
                </div>
                <ComboForm />
            </div>
        </DashboardLayout>
    );
}
