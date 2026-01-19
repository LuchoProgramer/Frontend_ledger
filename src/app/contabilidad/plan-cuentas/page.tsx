'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getApiClient } from '@/lib/api';
import { PlanCuenta } from '@/lib/types/contabilidad';
import { ChevronRight, ChevronDown, Plus, Edit, Trash, Folder, FolderOpen } from 'lucide-react';
import PortalModal from '@/components/ui/PortalModal';

export default function PlanCuentasPage() {
    const [cuentas, setCuentas] = useState<PlanCuenta[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<Record<number, boolean>>({});

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        codigo: '',
        nombre: '',
        tipo: 'ACTIVO',
        padre: null as number | null,
        es_cuenta_movimiento: false
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const apiClient = getApiClient();

    useEffect(() => {
        loadCuentas();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadCuentas = async () => {
        setLoading(true);
        try {
            const res = await apiClient.getPlanCuentas({ page_size: 1000 }); // Traer todas para armar el árbol
            if (res && res.results) {
                // Ordenar por código
                const sorted = res.results.sort((a, b) => a.codigo.localeCompare(b.codigo));
                setCuentas(sorted);

                // Expandir niveles principales
                const initialExpanded: Record<number, boolean> = {};
                sorted.forEach(c => {
                    if (c.nivel <= 2) initialExpanded[c.id] = true;
                });
                setExpanded(initialExpanded);
            }
        } catch (error) {
            console.error('Error cargando plan de cuentas', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id: number) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleOpenCreate = (padreId: number | null = null) => {
        setEditingId(null);
        setFormData({
            codigo: '',
            nombre: '',
            tipo: padreId ? cuentas.find(c => c.id === padreId)?.tipo || 'ACTIVO' : 'ACTIVO',
            padre: padreId,
            es_cuenta_movimiento: true
        });
        setShowModal(true);
        setError('');
    };

    const handleOpenEdit = (cuenta: PlanCuenta) => {
        setEditingId(cuenta.id);
        setFormData({
            codigo: cuenta.codigo,
            nombre: cuenta.nombre,
            tipo: cuenta.tipo,
            padre: cuenta.padre,
            es_cuenta_movimiento: cuenta.es_cuenta_movimiento
        });
        setShowModal(true);
        setError('');
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Estás seguro de eliminar esta cuenta?')) return;
        try {
            await apiClient.eliminarCuentaContable(id);
            loadCuentas();
        } catch (error) {
            alert('Error al eliminar cuenta. Asegúrate de que no tenga movimientos ni hijos.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            if (editingId) {
                await apiClient.actualizarCuentaContable(editingId, formData);
            } else {
                await apiClient.crearCuentaContable(formData);
            }
            setShowModal(false);
            loadCuentas();
        } catch (err: any) {
            setError(err.message || 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const renderTreeRow = (cuenta: PlanCuenta, depth: number = 0): React.ReactNode => {
        const hasChildren = cuentas.some(c => c.padre === cuenta.id);
        const isExpanded = expanded[cuenta.id];
        const paddingLeft = `${depth * 20 + 10}px`;

        return (
            <>
                <tr key={cuenta.id} className="hover:bg-gray-50 border-b border-gray-100 last:border-0">
                    <td className="py-2 pr-4 text-sm text-gray-900 whitespace-nowrap">
                        <div style={{ paddingLeft }} className="flex items-center">
                            {hasChildren ? (
                                <button
                                    onClick={() => toggleExpand(cuenta.id)}
                                    className="mr-1 p-1 hover:bg-gray-200 rounded text-gray-400"
                                >
                                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>
                            ) : (
                                <span className="w-6 inline-block" />
                            )}
                            <span className={`mr-2 ${cuenta.es_cuenta_movimiento ? 'text-gray-400' : 'text-yellow-500'}`}>
                                {cuenta.es_cuenta_movimiento ? <div className="w-4" /> : (isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />)}
                            </span>
                            <span className={!cuenta.es_cuenta_movimiento ? 'font-semibold' : ''}>
                                {cuenta.codigo}
                            </span>
                        </div>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                        <span className={!cuenta.es_cuenta_movimiento ? 'font-semibold' : ''}>
                            {cuenta.nombre}
                        </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cuenta.tipo === 'ACTIVO' ? 'bg-blue-100 text-blue-800' :
                            cuenta.tipo === 'PASIVO' ? 'bg-red-100 text-red-800' :
                                cuenta.tipo === 'PATRIMONIO' ? 'bg-green-100 text-green-800' :
                                    cuenta.tipo === 'INGRESO' ? 'bg-emerald-100 text-emerald-800' :
                                        'bg-orange-100 text-orange-800' // Gasto y Costo
                            }`}>
                            {cuenta.tipo}
                        </span>
                    </td>
                    <td className="px-4 py-2 text-right text-sm">
                        <div className="flex justify-end space-x-2">
                            {!cuenta.es_cuenta_movimiento && (
                                <button
                                    onClick={() => handleOpenCreate(cuenta.id)}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                    title="Agregar Subcuenta"
                                >
                                    <Plus size={16} />
                                </button>
                            )}
                            <button
                                onClick={() => handleOpenEdit(cuenta)}
                                className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                                title="Editar"
                            >
                                <Edit size={16} />
                            </button>
                            <button
                                onClick={() => handleDelete(cuenta.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Eliminar"
                            >
                                <Trash size={16} />
                            </button>
                        </div>
                    </td>
                </tr>
                {hasChildren && isExpanded && (
                    cuentas
                        .filter(c => c.padre === cuenta.id)
                        .map(child => renderTreeRow(child, depth + 1))
                )}
            </>
        );
    };

    // Filtramos solo las cuentas raíz (padre = null) para empezar el renderizado recursivo
    // PERO como la recursividad la manejo en renderTreeRow buscando hijos en el array plano 'cuentas',
    // aquí solo itero las raíces.
    const rootCuentas = cuentas.filter(c => !c.padre);

    return (
        <DashboardLayout>
            <div className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Plan de Cuentas</h1>
                    <button
                        onClick={() => handleOpenCreate(null)}
                        className="w-full md:w-auto px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center justify-center gap-2"
                    >
                        <Plus size={18} />
                        Nueva Cuenta Raíz
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Cargando estructura...</div>
                    ) : (
                        <table className="min-w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-64">Código</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">Tipo</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rootCuentas.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-gray-500">
                                            No hay cuentas registradas. Comienza creando una cuenta raíz.
                                        </td>
                                    </tr>
                                ) : (
                                    rootCuentas.map(cuenta => renderTreeRow(cuenta))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* MODAL */}
            <PortalModal isOpen={showModal} onClose={() => setShowModal(false)}>
                <form onSubmit={handleSubmit} className="w-full max-w-lg bg-white rounded-lg shadow-xl overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">
                            {editingId ? 'Editar Cuenta' : 'Nueva Cuenta'}
                        </h3>
                    </div>

                    <div className="p-6 space-y-4">
                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-3 text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Código</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    placeholder="Ej: 1.1.01"
                                    value={formData.codigo}
                                    onChange={e => setFormData({ ...formData, codigo: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Tipo</label>
                                <select
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    value={formData.tipo}
                                    onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                                    disabled={!!formData.padre && !editingId} // Si es subcuenta, hereda tipo usualmente, pero dejamos cambiar por si acaso
                                >
                                    <option value="ACTIVO">Activo</option>
                                    <option value="PASIVO">Pasivo</option>
                                    <option value="PATRIMONIO">Patrimonio</option>
                                    <option value="INGRESO">Ingreso</option>
                                    <option value="GASTO">Gasto</option>
                                    <option value="COSTO">Costo</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nombre</label>
                            <input
                                type="text"
                                required
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                placeholder="Ej: Caja General"
                                value={formData.nombre}
                                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                            />
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="es_movimiento"
                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                                checked={formData.es_cuenta_movimiento}
                                onChange={e => setFormData({ ...formData, es_cuenta_movimiento: e.target.checked })}
                            />
                            <label htmlFor="es_movimiento" className="ml-2 block text-sm text-gray-900">
                                Acepta movimientos (es cuenta final, no grupo)
                            </label>
                        </div>
                    </div>

                    <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setShowModal(false)}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 bg-indigo-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </PortalModal>
        </DashboardLayout>
    );
}
