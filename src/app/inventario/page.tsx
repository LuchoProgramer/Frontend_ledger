'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '../../lib/utils';
import PortalModal from '@/components/ui/PortalModal';
import { getApiClient } from '@/lib/api';
import type { InventarioItem } from '@/lib/types/inventario';
import type { Sucursal } from '@/lib/types/sucursales';
import type { Producto } from '@/lib/types/productos';
import DashboardLayout from '@/components/DashboardLayout';

export default function InventarioPage() {
    const { user, loading: authLoading, isAdmin } = useAuth();
    const router = useRouter();

    // Data State
    const [inventario, setInventario] = useState<InventarioItem[]>([]);
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);

    // UI State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Filters
    const [selectedSucursal, setSelectedSucursal] = useState<number | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState('');

    // Modals
    const [showAjusteModal, setShowAjusteModal] = useState(false);
    const [showTransferenciaModal, setShowTransferenciaModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form Data
    const [ajusteForm, setAjusteForm] = useState({
        producto_id: 0,
        sucursal_id: 0,
        tipo: 'ENTRADA' as 'ENTRADA' | 'SALIDA',
        cantidad: '',
        motivo: ''
    });

    const [transferenciaForm, setTransferenciaForm] = useState({
        producto_id: 0,
        origen_id: 0,
        destino_id: 0,
        cantidad: '',
        generar_guia: false,
        transportista_ruc: '',
        transportista_razon_social: '',
        transportista_placa: ''
    });

    // Check Auth
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [authLoading, user, router]);

    // View Mode
    const [viewMode, setViewMode] = useState<'detalle' | 'agrupado'>('detalle');
    const [expandedItems, setExpandedItems] = useState<number[]>([]);

    // Load Initial Data
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const api = getApiClient();

            // Sila sucursal no está seleccionada, pedimos agrupado por defecto
            const isGrouped = !selectedSucursal;

            // Parallel fetch
            const [invRes, sucRes, prodRes] = await Promise.all([
                api.getInventario({
                    sucursal: selectedSucursal,
                    search: searchTerm,
                    agrupado: isGrouped
                }),
                api.getSucursalesList({ page_size: 100 }), // Fetch all for dropdowns
                api.getProductos({ page_size: 100, activo: true }) // Fetch products for dropdowns
            ]);

            if (invRes.results) setInventario(invRes.results);
            if (invRes.mode) setViewMode(invRes.mode);
            if (sucRes.results) setSucursales(sucRes.results);
            if (prodRes.results) setProductos(prodRes.results);

        } catch (err: any) {
            setError(err.message || 'Error cargando datos');
        } finally {
            setLoading(false);
        }
    }, [selectedSucursal, searchTerm]);

    const toggleExpand = (id: number) => {
        setExpandedItems(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user, loadData]);

    const handleAjusteSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccessMessage('');

        try {
            const api = getApiClient();
            await api.ajusteInventario({
                ...ajusteForm,
                cantidad: Number(ajusteForm.cantidad)
            });
            setSuccessMessage('Ajuste realizado correctamente');
            setShowAjusteModal(false);
            loadData();
        } catch (err: any) {
            setError(err.message || 'Error al realizar ajuste');
        } finally {
            setSaving(false);
        }
    };

    const handleTransferenciaSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccessMessage('');

        if (transferenciaForm.origen_id === transferenciaForm.destino_id) {
            setError('La sucursal de origen y destino no pueden ser la misma');
            setSaving(false);
            return;
        }

        try {
            const api = getApiClient();

            const payload: any = {
                producto_id: transferenciaForm.producto_id,
                origen_id: transferenciaForm.origen_id,
                destino_id: transferenciaForm.destino_id,
                cantidad: Number(transferenciaForm.cantidad),
                generar_guia: transferenciaForm.generar_guia
            };

            if (transferenciaForm.generar_guia) {
                if (!transferenciaForm.transportista_ruc || !transferenciaForm.transportista_razon_social) {
                    setError('Debe completar RUC y Razón Social del transportista');
                    setSaving(false);
                    return;
                }
                payload.transportista = {
                    ruc: transferenciaForm.transportista_ruc,
                    razon_social: transferenciaForm.transportista_razon_social,
                    placa: transferenciaForm.transportista_placa
                };
            }

            await api.transferenciaInventario(payload);
            setSuccessMessage('Transferencia realizada correctamente');
            setShowTransferenciaModal(false);
            loadData();
        } catch (err: any) {
            setError(err.message || 'Error al realizar transferencia');
        } finally {
            setSaving(false);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const api = getApiClient();
            const blob = await api.downloadPlantillaInventario();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'plantilla_inventario.xlsx';
            a.click();
        } catch (err: any) {
            setError('Error descargando plantilla');
        }
    };

    const handleUploadSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fileInput = form.elements.namedItem('file') as HTMLInputElement;
        const sucursalSelect = form.elements.namedItem('sucursal_id') as HTMLSelectElement;

        if (!fileInput.files || fileInput.files.length === 0) {
            setError('Seleccione un archivo');
            return;
        }

        setSaving(true);
        setError('');
        setSuccessMessage('');

        try {
            const api = getApiClient();
            const res = await api.uploadInventario(fileInput.files[0], Number(sucursalSelect.value));

            if (res.success) {
                setSuccessMessage(res.message);
                setShowUploadModal(false);
                loadData();
            } else {
                setError(`Error: ${res.errors.join(', ')}`);
            }
        } catch (err: any) {
            setError(err.message || 'Error en carga masiva');
        } finally {
            setSaving(false);
        }
    };

    const openAjusteModal = (item?: InventarioItem) => {
        setAjusteForm({
            producto_id: item ? item.producto : (productos[0]?.id || 0),
            sucursal_id: item?.sucursal ?? (sucursales[0]?.id || 0),
            tipo: 'ENTRADA',
            cantidad: '',
            motivo: ''
        });
        setShowAjusteModal(true);
    };

    if (authLoading || (loading && inventario.length === 0 && sucursales.length === 0)) {
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
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Header */}
                <div className="md:flex md:items-center md:justify-between mb-6">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                            Gestión de Inventario
                        </h2>
                    </div>
                    <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
                        <button
                            type="button"
                            onClick={() => setShowUploadModal(true)}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Importar Excel
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowTransferenciaModal(true)}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Transferir Stock
                        </button>
                        <button
                            type="button"
                            onClick={() => openAjusteModal()}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Nuevo Ajuste
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <label htmlFor="search" className="block text-sm font-medium text-gray-700">Buscar Producto</label>
                        <input
                            type="text"
                            name="search"
                            id="search"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            placeholder="Nombre o código..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="sucursal" className="block text-sm font-medium text-gray-700">Sucursal</label>
                        <select
                            id="sucursal"
                            name="sucursal"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            value={selectedSucursal || ''}
                            onChange={(e) => setSelectedSucursal(e.target.value ? Number(e.target.value) : undefined)}
                        >
                            <option value="">Todas</option>
                            {sucursales.map(s => (
                                <option key={s.id} value={s.id}>{s.nombre}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="rounded-md bg-red-50 p-4 mb-6">
                        <div className="flex">
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">{error}</h3>
                            </div>
                        </div>
                    </div>
                )}
                {successMessage && (
                    <div className="rounded-md bg-green-50 p-4 mb-6">
                        <div className="flex">
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-green-800">{successMessage}</h3>
                            </div>
                        </div>
                    </div>
                )}
                {/* Desktop Table View */}
                <div className="hidden md:block flex flex-col">
                    <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                        <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                            <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Producto
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Sucursal
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Stock
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actualizado
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Acciones
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {inventario.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                                                    No se encontraron registros de inventario.
                                                </td>
                                            </tr>
                                        ) : (
                                            inventario.map((item) => {
                                                const isGroupedRow = viewMode === 'agrupado';
                                                const itemName = item.producto_nombre || item.nombre;
                                                const itemCode = item.producto_codigo || item.codigo_producto;
                                                const itemStock = isGroupedRow ? item.stock_total_global : item.cantidad;
                                                const isExpanded = expandedItems.includes(item.id);

                                                return (
                                                    <>
                                                        <tr key={item.id} className={isExpanded && isGroupedRow ? 'bg-gray-50' : ''}>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="flex items-center">
                                                                    {isGroupedRow && item.desglose && item.desglose.length > 0 && (
                                                                        <button
                                                                            onClick={() => toggleExpand(item.id)}
                                                                            className="mr-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                                                                        >
                                                                            {isExpanded ? (
                                                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                                                </svg>
                                                                            ) : (
                                                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                                                </svg>
                                                                            )}
                                                                        </button>
                                                                    )}
                                                                    <div>
                                                                        <div className="text-sm font-medium text-gray-900">{itemName}</div>
                                                                        <div className="text-sm text-gray-500">{itemCode}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {isGroupedRow ? (
                                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                        Global ({item.desglose?.length || 0} sucursales)
                                                                    </span>
                                                                ) : (
                                                                    item.sucursal_nombre
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${Number(itemStock) > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                    {Number(itemStock).toFixed(2)}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {item.fecha_actualizacion ? new Date(item.fecha_actualizacion).toLocaleDateString() : '-'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                {!isGroupedRow && (
                                                                    <button
                                                                        onClick={() => openAjusteModal(item)}
                                                                        className="text-indigo-600 hover:text-indigo-900"
                                                                    >
                                                                        Ajustar
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                        {isGroupedRow && isExpanded && item.desglose?.map((subItem) => (
                                                            <tr key={`sub-${subItem.id}`} className="bg-gray-50">
                                                                <td className="px-6 py-2 whitespace-nowrap pl-14">
                                                                    <span className="text-xs text-gray-400">└</span>
                                                                    <span className="ml-1 text-sm text-gray-500">En {subItem.sucursal_nombre}</span>
                                                                </td>
                                                                <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">
                                                                    {subItem.sucursal_nombre}
                                                                </td>
                                                                <td className="px-6 py-2 whitespace-nowrap">
                                                                    <span className="text-sm font-medium text-gray-700">
                                                                        {Number(subItem.cantidad).toFixed(2)}
                                                                    </span>
                                                                </td>
                                                                <td colSpan={2} className="px-6 py-2"></td>
                                                            </tr>
                                                        ))}
                                                    </>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {inventario.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 bg-white rounded-lg shadow">
                            No se encontraron registros de inventario.
                        </div>
                    ) : (
                        inventario.map((item) => {
                            const isGroupedRow = viewMode === 'agrupado';
                            const itemName = item.producto_nombre || item.nombre;
                            const itemCode = item.producto_codigo || item.codigo_producto;
                            const itemStock = isGroupedRow ? item.stock_total_global : item.cantidad;
                            const isExpanded = expandedItems.includes(item.id);

                            return (
                                <div key={item.id} className="bg-white shadow rounded-lg p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div onClick={() => isGroupedRow && toggleExpand(item.id)} className={isGroupedRow ? "cursor-pointer" : ""}>
                                            <h3 className="text-lg font-medium text-gray-900 flex items-center">
                                                {itemName}
                                                {isGroupedRow && (
                                                    <span className="ml-2 text-xs text-blue-600">
                                                        {isExpanded ? '▲' : '▼'}
                                                    </span>
                                                )}
                                            </h3>
                                            <p className="text-sm font-mono text-gray-500 mt-1">{itemCode}</p>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${Number(itemStock) > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                Stock: {Number(itemStock).toFixed(2)}
                                            </span>
                                            <span className="text-xs text-gray-400 mt-1">
                                                {isGroupedRow ? 'Global' : item.sucursal_nombre}
                                            </span>
                                        </div>
                                    </div>

                                    {isGroupedRow && isExpanded && (
                                        <div className="mt-3 border-t pt-2 bg-gray-50 rounded p-2">
                                            {item.desglose?.map(subItem => (
                                                <div key={subItem.id} className="flex justify-between py-1 text-sm">
                                                    <span className="text-gray-600">{subItem.sucursal_nombre}</span>
                                                    <span className="font-medium">{Number(subItem.cantidad).toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center border-t pt-3 mt-3">
                                        <span className="text-xs text-gray-500">
                                            Act: {item.fecha_actualizacion ? new Date(item.fecha_actualizacion).toLocaleDateString() : '-'}
                                        </span>
                                        {!isGroupedRow && (
                                            <button
                                                onClick={() => openAjusteModal(item)}
                                                className="text-indigo-600 font-medium text-sm px-3 py-1 bg-indigo-50 rounded hover:bg-indigo-100"
                                            >
                                                Ajustar Stock
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* MODAL AJUSTE */}
                <PortalModal isOpen={showAjusteModal} onClose={() => setShowAjusteModal(false)}>
                    <form onSubmit={handleAjusteSubmit}>
                        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Ajuste de Stock</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Producto</label>
                                    <select
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        value={ajusteForm.producto_id}
                                        onChange={(e) => setAjusteForm({ ...ajusteForm, producto_id: Number(e.target.value) })}
                                    >
                                        {productos.map(p => (
                                            <option key={p.id} value={p.id}>{p.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Sucursal</label>
                                    <select
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        value={ajusteForm.sucursal_id}
                                        onChange={(e) => setAjusteForm({ ...ajusteForm, sucursal_id: Number(e.target.value) })}
                                    >
                                        {sucursales.map(s => (
                                            <option key={s.id} value={s.id}>{s.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tipo Ajuste</label>
                                    <select
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        value={ajusteForm.tipo}
                                        onChange={(e) => setAjusteForm({ ...ajusteForm, tipo: e.target.value as any })}
                                    >
                                        <option value="ENTRADA">ENTRADA (Agregar)</option>
                                        <option value="SALIDA">SALIDA (Descontar)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Cantidad</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        value={ajusteForm.cantidad}
                                        onChange={(e) => setAjusteForm({ ...ajusteForm, cantidad: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Motivo</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        value={ajusteForm.motivo}
                                        onChange={(e) => setAjusteForm({ ...ajusteForm, motivo: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                            >
                                {saving ? 'Guardando...' : 'Guardar Ajuste'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowAjusteModal(false)}
                                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </PortalModal>

                {/* MODAL TRANSFERENCIA */}
                <PortalModal isOpen={showTransferenciaModal} onClose={() => setShowTransferenciaModal(false)}>
                    <form onSubmit={handleTransferenciaSubmit}>
                        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Transferencia entre Sucursales</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Producto</label>
                                    <select
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        value={transferenciaForm.producto_id}
                                        onChange={(e) => setTransferenciaForm({ ...transferenciaForm, producto_id: Number(e.target.value) })}
                                    >
                                        <option value={0}>Seleccione Producto</option>
                                        {productos.map(p => (
                                            <option key={p.id} value={p.id}>{p.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Origen</label>
                                        <select
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            value={transferenciaForm.origen_id}
                                            onChange={(e) => setTransferenciaForm({ ...transferenciaForm, origen_id: Number(e.target.value) })}
                                        >
                                            <option value={0}>Seleccione Origen</option>
                                            {sucursales.map(s => (
                                                <option key={s.id} value={s.id}>{s.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Destino</label>
                                        <select
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            value={transferenciaForm.destino_id}
                                            onChange={(e) => setTransferenciaForm({ ...transferenciaForm, destino_id: Number(e.target.value) })}
                                        >
                                            <option value={0}>Seleccione Destino</option>
                                            {sucursales.map(s => (
                                                <option key={s.id} value={s.id}>{s.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Cantidad</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        value={transferenciaForm.cantidad}
                                        onChange={(e) => setTransferenciaForm({ ...transferenciaForm, cantidad: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="pt-4 border-t border-gray-200">
                                    <div className="flex items-center">
                                        <input
                                            id="generar_guia"
                                            name="generar_guia"
                                            type="checkbox"
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                            checked={transferenciaForm.generar_guia}
                                            onChange={(e) => setTransferenciaForm({ ...transferenciaForm, generar_guia: e.target.checked })}
                                        />
                                        <label htmlFor="generar_guia" className="ml-2 block text-sm text-gray-900">
                                            Generar Guía de Remisión (SRI)
                                        </label>
                                    </div>

                                    {transferenciaForm.generar_guia && (
                                        <div className="mt-4 space-y-3 bg-gray-50 p-3 rounded-md">
                                            <h4 className="text-sm font-medium text-gray-900">Datos Transportista</h4>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700">RUC Transp.</label>
                                                <input
                                                    type="text"
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                    value={transferenciaForm.transportista_ruc}
                                                    onChange={(e) => setTransferenciaForm({ ...transferenciaForm, transportista_ruc: e.target.value })}
                                                    placeholder="17..."
                                                    maxLength={13}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700">Razón Social</label>
                                                <input
                                                    type="text"
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                    value={transferenciaForm.transportista_razon_social}
                                                    onChange={(e) => setTransferenciaForm({ ...transferenciaForm, transportista_razon_social: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700">Placa (Opcional)</label>
                                                <input
                                                    type="text"
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                    value={transferenciaForm.transportista_placa}
                                                    onChange={(e) => setTransferenciaForm({ ...transferenciaForm, transportista_placa: e.target.value })}
                                                    placeholder="ABC-1234"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                            >
                                {saving ? 'Procesando...' : 'Transferir Stock'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowTransferenciaModal(false)}
                                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </PortalModal>

                {/* MODAL CARGA MASIVA */}
                <PortalModal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)}>
                    <form onSubmit={handleUploadSubmit}>
                        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg leading-6 font-medium text-gray-900">Carga Masiva de Inventario</h3>
                                <button
                                    type="button"
                                    onClick={handleDownloadTemplate}
                                    className="text-sm text-indigo-600 hover:text-indigo-900 font-medium"
                                >
                                    Descargar Plantilla
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Sucursal Destino</label>
                                    <select
                                        name="sucursal_id"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        defaultValue={selectedSucursal || sucursales[0]?.id}
                                    >
                                        {sucursales.map(s => (
                                            <option key={s.id} value={s.id}>{s.nombre}</option>
                                        ))}
                                    </select>
                                    <p className="mt-1 text-xs text-gray-500">
                                        El stock se ajustará ("set") para los productos en el archivo.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Archivo Excel (.xlsx)</label>
                                    <input
                                        type="file"
                                        name="file"
                                        accept=".xlsx, .xls, .csv"
                                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                            >
                                {saving ? 'Procesando...' : 'Cargar Inventario'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowUploadModal(false)}
                                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </PortalModal>

            </div >
        </DashboardLayout >
    );
}

