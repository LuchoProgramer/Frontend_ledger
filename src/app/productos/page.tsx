'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';


import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getApiClient } from '@/lib/api';
import type { Producto, Categoria } from '@/lib/types/productos';
import DashboardLayout from '@/components/DashboardLayout';

export default function ProductosPage() {
    const router = useRouter();
    const { user, isAdmin, loading: authLoading } = useAuth();

    // Estado local
    const [productos, setProductos] = useState<Producto[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Filtros
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 500);
    const [categoriaFilter, setCategoriaFilter] = useState<number | ''>('');
    const [activoFilter, setActivoFilter] = useState<'all' | 'active' | 'inactive'>('active');

    // Paginación
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Verificar permisos
    useEffect(() => {
        if (authLoading) return;

        // Permitir acceso a Admin y Vendedores (algunas acciones limitadas)
        if (!user) {
            router.push('/');
        }
    }, [user, authLoading, router]);

    // Cargar categorías iniciales
    useEffect(() => {
        const cargarCategorias = async () => {
            try {
                const api = getApiClient();
                const response = await api.getCategorias();
                if (response.success && response.data) {
                    setCategorias(response.data);
                }
            } catch (err) {
                console.error('Error cargando categorías', err);
            }
        };

        if (user) {
            cargarCategorias();
        }
    }, [user]);

    // Cargar productos
    useEffect(() => {
        if (!user) return;
        cargarProductos();
    }, [page, debouncedSearch, categoriaFilter, activoFilter, user]);

    const cargarProductos = async () => {
        try {
            setLoading(true);
            setError('');
            const api = getApiClient();

            const params: any = {
                page,
                page_size: 10,
                // Activo filter
                activo: activoFilter === 'all' ? undefined : (activoFilter === 'active'),
            };

            if (debouncedSearch) params.search = debouncedSearch;
            if (categoriaFilter) params.categoria = categoriaFilter;

            const response = await api.getProductos(params);

            // Manejar respuesta DRF (results) o API Custom (data)
            const isSuccess = response.success || (response.results && Array.isArray(response.results));

            if (isSuccess) {
                const items = response.results || response.data || [];
                setProductos(items);

                // Calcular páginas
                const count = response.count || (response.data?.length ?? 0);
                setTotalCount(count);
                setTotalPages(Math.ceil(count / 10) || 1);
            } else {
                setError(response.error || 'Error al cargar productos');
            }
        } catch (error: any) {
            console.error('Error cargando productos:', error);
            setError(error.message || 'Error al cargar productos');
        } finally {
            setLoading(false);
        }
    };

    const handleEliminar = async (id: number, nombre: string) => {
        if (!isAdmin) {
            alert('Solo los administradores pueden eliminar productos');
            return;
        }

        if (!confirm(`¿Está seguro de eliminar el producto "${nombre}"?\n\nEsta acción no se puede deshacer.`)) {
            return;
        }

        try {
            const api = getApiClient();
            const response = await api.eliminarProducto(id);

            if (response.success) {
                setSuccess(response.message || 'Producto eliminado exitosamente');
                setTimeout(() => setSuccess(''), 3000);
                cargarProductos();
            } else {
                alert(response.message || 'Error al eliminar el producto');
            }
        } catch (error: any) {
            alert(error.message || 'Error al eliminar el producto');
        }
    };

    const resetFiltros = () => {
        setSearch('');
        setCategoriaFilter('');
        setActivoFilter('active');
        setPage(1);
    };

    if (authLoading) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>;
    }

    if (!user) return null;

    return (
        <DashboardLayout>
            <div className="w-full max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Gestión de Productos</h1>
                            <p className="mt-2 text-gray-600">
                                {totalCount} {totalCount === 1 ? 'producto registrado' : 'productos registrados'}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2 md:gap-4">
                            <Link
                                href="/productos/nuevo"
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Nuevo Producto
                            </Link>
                            <Link
                                href="/productos/carga-masiva"
                                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Carga Masiva
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Mensajes */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                        {success}
                    </div>
                )}

                {/* Filtros */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Buscar
                            </label>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                placeholder="Nombre, código, descripción..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Categoría
                            </label>
                            <select
                                value={categoriaFilter}
                                onChange={(e) => {
                                    setCategoriaFilter(e.target.value ? Number(e.target.value) : '');
                                    setPage(1);
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Todas</option>
                                {categorias.map(c => (
                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Estado
                            </label>
                            <select
                                value={activoFilter}
                                onChange={(e) => {
                                    setActivoFilter(e.target.value as any);
                                    setPage(1);
                                }}
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

                {/* Tabla */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Cargando productos...</p>
                        </div>
                    ) : productos.length === 0 ? (
                        <div className="p-12 text-center">
                            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay productos</h3>
                            <p className="text-gray-600 mb-4">
                                {search || categoriaFilter || activoFilter !== 'all'
                                    ? 'No se encontraron productos con los filtros aplicados'
                                    : 'Comienza agregando tu primer producto al inventario'
                                }
                            </p>
                            <Link
                                href="/productos/nuevo"
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Nuevo Producto
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto hidden md:block">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Producto
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Categoría
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Tipo
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Estado
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Acciones
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {productos.map((producto) => (
                                            <tr key={producto.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <div className="flex items-center">
                                                            <span className="text-sm font-medium text-gray-900">
                                                                {producto.nombre}
                                                            </span>
                                                        </div>
                                                        {producto.codigo_producto && (
                                                            <div className="text-xs text-gray-500 font-mono mt-0.5">
                                                                Ref: {producto.codigo_producto}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm text-gray-600">
                                                        {producto.categoria_nombre || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm text-gray-600 capitalize">
                                                        {producto.tipo}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${producto.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {producto.activo ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Link
                                                            href={`/productos/${producto.id}/editar`}
                                                            className="text-blue-600 hover:text-blue-900"
                                                            title="Editar"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </Link>
                                                        {isAdmin && (
                                                            <button
                                                                onClick={() => handleEliminar(producto.id, producto.nombre)}
                                                                className="text-red-600 hover:text-red-900"
                                                                title="Eliminar"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden grid grid-cols-1 gap-4 p-4">
                                {productos.map((producto) => (
                                    <div key={producto.id} className="bg-white border rounded-lg shadow-sm p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-lg font-medium text-gray-900">{producto.nombre}</h3>
                                                {producto.codigo_producto && (
                                                    <p className="text-sm font-mono text-gray-500">{producto.codigo_producto}</p>
                                                )}
                                            </div>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${producto.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {producto.activo ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </div>

                                        <div className="text-sm text-gray-600 space-y-1">
                                            <p><span className="font-medium">Categoría:</span> {producto.categoria_nombre || '-'}</p>
                                            <p><span className="font-medium">Tipo:</span> <span className="capitalize">{producto.tipo}</span></p>
                                        </div>

                                        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                                            <Link
                                                href={`/productos/${producto.id}/editar`}
                                                className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm font-medium rounded hover:bg-blue-100"
                                            >
                                                Editar
                                            </Link>
                                            {isAdmin && (
                                                <button
                                                    onClick={() => handleEliminar(producto.id, producto.nombre)}
                                                    className="px-3 py-1.5 bg-red-50 text-red-700 text-sm font-medium rounded hover:bg-red-100"
                                                >
                                                    Eliminar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Paginación */}
                            {totalPages > 1 && (
                                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                                    <div className="text-sm text-gray-600">
                                        Página {page} de {totalPages}
                                    </div>
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
