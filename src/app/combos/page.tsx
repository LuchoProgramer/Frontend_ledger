'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getApiClient } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';

type Combo = {
    id: number;
    nombre: string;
    descripcion: string;
    precio: string;
    activo: boolean;
    sucursal: number;
    items: { id: number; producto: number; producto_nombre: string; presentacion: number; presentacion_nombre: string; cantidad: string }[];
    slots: { id: number; nombre: string; cantidad: string; obligatorio: boolean; orden: number }[];
};

type Sucursal = { id: number; nombre: string };

export default function CombosPage() {
    const router = useRouter();
    const { user, isAdmin, loading: authLoading } = useAuth();

    const [combos, setCombos] = useState<Combo[]>([]);
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 400);
    const [sucursalFilter, setSucursalFilter] = useState<number | ''>('');
    const [activoFilter, setActivoFilter] = useState<'all' | 'active' | 'inactive'>('active');

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        if (authLoading) return;
        if (!user) router.push('/');
    }, [user, authLoading, router]);

    useEffect(() => {
        if (!user) return;
        const api = getApiClient();
        api.getSucursalesList().then(r => {
            const list = (r as any).results ?? (r as any).data ?? [];
            setSucursales(list);
        }).catch(() => {});
    }, [user]);

    useEffect(() => {
        if (!user) return;
        cargarCombos();
    }, [page, debouncedSearch, sucursalFilter, activoFilter, user]);

    const cargarCombos = async () => {
        try {
            setLoading(true);
            setError('');
            const api = getApiClient();
            const params: any = {
                page,
                page_size: 10,
                activo: activoFilter === 'all' ? undefined : activoFilter === 'active',
            };
            if (debouncedSearch) params.search = debouncedSearch;
            if (sucursalFilter) params.sucursal = sucursalFilter;

            const response = await api.getCombos(params);
            const items = (response as any).results || [];
            const count = (response as any).count || 0;
            setCombos(items);
            setTotalCount(count);
            setTotalPages(Math.ceil(count / 10) || 1);
        } catch (err: any) {
            setError(err.message || 'Error al cargar combos');
        } finally {
            setLoading(false);
        }
    };

    const handleEliminar = async (id: number, nombre: string) => {
        if (!isAdmin) {
            alert('Solo los administradores pueden eliminar combos');
            return;
        }
        if (!confirm(`¿Está seguro de eliminar el combo "${nombre}"?\n\nEsta acción no se puede deshacer.`)) return;
        try {
            const api = getApiClient();
            await api.eliminarCombo(id);
            setSuccess('Combo eliminado exitosamente');
            setTimeout(() => setSuccess(''), 3000);
            cargarCombos();
        } catch (err: any) {
            alert(err.message || 'Error al eliminar el combo');
        }
    };

    const sucursalNombre = (id: number) => sucursales.find(s => s.id === id)?.nombre ?? `#${id}`;

    const resetFiltros = () => {
        setSearch('');
        setSucursalFilter('');
        setActivoFilter('active');
        setPage(1);
    };

    const canManage = user?.is_superuser || user?.is_staff || user?.groups?.includes('Administrador');

    if (authLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <DashboardLayout>
            <div className="w-full max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Gestión de Combos</h1>
                            <p className="mt-2 text-gray-600">
                                {totalCount} {totalCount === 1 ? 'combo registrado' : 'combos registrados'}
                            </p>
                        </div>
                        {canManage && (
                            <Link
                                href="/combos/nuevo"
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Nuevo Combo
                            </Link>
                        )}
                    </div>
                </div>

                {/* Mensajes */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
                )}
                {success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success}</div>
                )}

                {/* Filtros */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
                            <input
                                type="text"
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                                placeholder="Nombre del combo..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Sucursal</label>
                            <select
                                value={sucursalFilter}
                                onChange={e => { setSucursalFilter(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Todas</option>
                                {sucursales.map(s => (
                                    <option key={s.id} value={s.id}>{s.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                            <select
                                value={activoFilter}
                                onChange={e => { setActivoFilter(e.target.value as any); setPage(1); }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="all">Todos</option>
                                <option value="active">Activos</option>
                                <option value="inactive">Inactivos</option>
                            </select>
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={resetFiltros}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                        >
                            Limpiar filtros
                        </button>
                    </div>
                </div>

                {/* Tabla / Cards */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Cargando combos...</p>
                        </div>
                    ) : combos.length === 0 ? (
                        <div className="p-12 text-center">
                            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay combos</h3>
                            <p className="text-gray-600 mb-4">
                                {search || sucursalFilter || activoFilter !== 'all'
                                    ? 'No se encontraron combos con los filtros aplicados'
                                    : 'Comienza creando tu primer combo'}
                            </p>
                            {canManage && (
                                <Link
                                    href="/combos/nuevo"
                                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Nuevo Combo
                                </Link>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Desktop table */}
                            <div className="overflow-x-auto hidden md:block">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sucursal</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Items fijos</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Slots variables</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {combos.map(combo => (
                                            <tr key={combo.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-medium text-gray-900">{combo.nombre}</div>
                                                    {combo.descripcion && (
                                                        <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">{combo.descripcion}</div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm font-semibold text-gray-900">${parseFloat(combo.precio).toFixed(2)}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm text-gray-600">{sucursalNombre(combo.sucursal)}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        {combo.items.length}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    {combo.slots.length > 0 ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                                            {combo.slots.length}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">—</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${combo.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {combo.activo ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    {canManage ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Link
                                                                href={`/combos/${combo.id}/editar`}
                                                                className="text-blue-600 hover:text-blue-900"
                                                                title="Editar"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                            </Link>
                                                            {isAdmin && (
                                                                <button
                                                                    onClick={() => handleEliminar(combo.id, combo.nombre)}
                                                                    className="text-red-600 hover:text-red-900"
                                                                    title="Eliminar"
                                                                >
                                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 italic text-xs">Solo lectura</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile cards */}
                            <div className="md:hidden grid grid-cols-1 gap-4 p-4">
                                {combos.map(combo => (
                                    <div key={combo.id} className="bg-white border rounded-lg shadow-sm p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-lg font-medium text-gray-900">{combo.nombre}</h3>
                                                {combo.descripcion && (
                                                    <p className="text-sm text-gray-500 mt-0.5">{combo.descripcion}</p>
                                                )}
                                            </div>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${combo.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {combo.activo ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-600 space-y-1">
                                            <p><span className="font-medium">Precio:</span> ${parseFloat(combo.precio).toFixed(2)}</p>
                                            <p><span className="font-medium">Sucursal:</span> {sucursalNombre(combo.sucursal)}</p>
                                            <p><span className="font-medium">Items fijos:</span> {combo.items.length}</p>
                                            <p><span className="font-medium">Slots variables:</span> {combo.slots.length > 0 ? combo.slots.length : '—'}</p>
                                        </div>
                                        {canManage && (
                                            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                                                <Link
                                                    href={`/combos/${combo.id}/editar`}
                                                    className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm font-medium rounded hover:bg-blue-100"
                                                >
                                                    Editar
                                                </Link>
                                                {isAdmin && (
                                                    <button
                                                        onClick={() => handleEliminar(combo.id, combo.nombre)}
                                                        className="px-3 py-1.5 bg-red-50 text-red-700 text-sm font-medium rounded hover:bg-red-100"
                                                    >
                                                        Eliminar
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Paginación */}
                            {totalPages > 1 && (
                                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                                    <div className="text-sm text-gray-600">Página {page} de {totalPages}</div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Anterior
                                        </button>
                                        <button
                                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Siguiente
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
