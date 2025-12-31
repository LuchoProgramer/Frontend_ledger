'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { getApiClient } from '@/lib/api';
import { Proveedor } from '@/lib/types/compras';
import { Producto } from '@/lib/types/productos';
import { Impuesto } from '@/lib/types/catalogos';
import PortalModal from '@/components/ui/PortalModal';
import { ProveedorFormData } from '@/lib/types/proveedores';

interface ItemCompra {
    producto_id: number;
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    impuesto_id: number;
    impuesto_porcentaje: number;
    impuesto_valor: number;
}

export default function NuevaCompraPage() {
    const router = useRouter();
    const apiClient = getApiClient();

    // Form State
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [numeroFactura, setNumeroFactura] = useState('');
    const [autorizacion, setAutorizacion] = useState('');
    const [proveedorId, setProveedorId] = useState<number | null>(null);
    const [items, setItems] = useState<ItemCompra[]>([]);

    // Data Source
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [impuestos, setImpuestos] = useState<Impuesto[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Search
    const [searchTerm, setSearchTerm] = useState('');

    // New Provider Modal State
    const [showProvModal, setShowProvModal] = useState(false);
    const [newProvData, setNewProvData] = useState<ProveedorFormData>({
        nombre: '',
        ruc: '',
        direccion: '',
        telefono: '',
        email: ''
    });
    const [savingProv, setSavingProv] = useState(false);

    // Loads
    useEffect(() => {
        loadProveedores();
        loadProductos();
        loadImpuestos();
    }, []);

    const loadImpuestos = async () => {
        const res = await apiClient.getImpuestos();
        if (res.success && res.data) {
            setImpuestos(res.data);
        }
    };

    const loadProveedores = async () => {
        try {
            const res = await apiClient.getProveedores({ page_size: 100 });
            setProveedores(res.data || res.results || []);
        } catch (e) {
            console.error(e);
        }
    };

    const loadProductos = async (term = '') => {
        try {
            const res = await apiClient.getProductos({ search: term });
            setProductos(res.results || []);
        } catch (e) {
            console.error(e);
        }
    };

    // Actions
    const addItem = (producto: Producto) => {
        const exists = items.find(i => i.producto_id === producto.id);
        if (exists) return;

        // Try to find matching tax from product, or default to 15% or first available
        const prodTax = impuestos.find(t => t.id === producto.impuesto_id);
        const defaultTax = prodTax || impuestos.find(t => t.porcentaje === '15.00') || impuestos[0];

        setItems([...items, {
            producto_id: producto.id,
            nombre: producto.nombre,
            cantidad: 1,
            precio_unitario: 0,
            subtotal: 0,
            impuesto_id: defaultTax?.id || 0,
            impuesto_porcentaje: defaultTax ? parseFloat(defaultTax.porcentaje) : 0,
            impuesto_valor: 0
        }]);
    };

    const updateItem = (index: number, field: keyof ItemCompra, value: number) => {
        const newItems = [...items];
        const item = newItems[index];

        if (field === 'impuesto_id') {
            const selectedTax = impuestos.find(t => t.id === value);
            if (selectedTax) {
                item.impuesto_id = selectedTax.id;
                item.impuesto_porcentaje = parseFloat(selectedTax.porcentaje);
            }
        } else {
            (item as any)[field] = value;
        }

        const qty = isNaN(item.cantidad) ? 0 : item.cantidad;
        const price = isNaN(item.precio_unitario) ? 0 : item.precio_unitario;

        item.subtotal = qty * price;
        item.impuesto_valor = item.subtotal * (item.impuesto_porcentaje / 100);
        setItems(newItems);
    };

    const removeItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleSubmit = async () => {
        if (!proveedorId) {
            alert('Seleccione un proveedor');
            return;
        }
        if (!numeroFactura) {
            alert('Ingrese el número de factura');
            return;
        }
        if (!autorizacion) {
            alert('Ingrese el número de autorización');
            return;
        }
        if (items.length === 0) {
            alert('Agregue al menos un producto');
            return;
        }

        setSaving(true);
        try {
            const total = items.reduce((sum, i) => sum + i.subtotal, 0);

            const userRes: any = await apiClient.getCurrentUser().catch(() => ({ user: null }));
            const sucursalId = userRes?.sucursales?.[0]?.id || 1;

            await apiClient.createCompra({
                sucursal_id: sucursalId,
                proveedor_id: proveedorId,
                fecha_emision: fecha,
                numero_factura: numeroFactura,
                numero_autorizacion: autorizacion,
                total_sin_impuestos: subtotalGeneral,
                total_con_impuestos: totalGeneral,
                items: items.map(i => ({
                    producto_id: i.producto_id,
                    cantidad: i.cantidad || 0,
                    precio_unitario: i.precio_unitario || 0,
                    impuesto: i.impuesto_porcentaje
                }))
            });

            alert('Compra registrada correctamente');
            router.push('/compras');
        } catch (e: any) {
            alert(e.message || 'Error al guardar compra');
        } finally {
            setSaving(false);
        }
    };

    const handleCreateProveedor = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingProv(true);

        // Basic validation
        if (newProvData.ruc.length !== 13) {
            alert('El RUC debe tener 13 dígitos');
            setSavingProv(false);
            return;
        }

        try {
            const api = getApiClient();
            const res = await api.crearProveedor(newProvData);

            if (res.success) {
                // Reload list
                await loadProveedores();

                // Because we just reloaded, we need to find the new one. 
                // A reliable way is to fetch again locally or just use the response if it returns the full object.
                // Assuming simple reload for now and trying to find by RUC in the freshly fetched list would be async race.
                // Better: get the list again immediately.
                const allProvs = await apiClient.getProveedores({ page_size: 100 });
                const created = (allProvs.data || allProvs.results || []).find((p: any) => p.ruc === newProvData.ruc);

                if (created) {
                    setProveedores(allProvs.data || allProvs.results || []);
                    setProveedorId(created.id);
                }

                setShowProvModal(false);
                setNewProvData({ nombre: '', ruc: '', direccion: '', telefono: '', email: '' });
                alert('Proveedor creado correctamente');
            } else {
                alert(typeof res.error === 'string' ? res.error : 'Error al crear proveedor');
            }
        } catch (error) {
            console.error(error);
            alert('Error al crear proveedor');
        } finally {
            setSavingProv(false);
        }
    };

    // Totals Calculation
    const subtotalGeneral = items.reduce((sum, i) => sum + i.subtotal, 0);
    const totalIva = items.reduce((sum, i) => sum + i.impuesto_valor, 0);
    const totalGeneral = subtotalGeneral + totalIva;

    // Breakdown for display
    const subtotal15 = items.filter(i => i.impuesto_porcentaje === 15).reduce((sum, i) => sum + i.subtotal, 0);
    const subtotal0 = items.filter(i => i.impuesto_porcentaje === 0).reduce((sum, i) => sum + i.subtotal, 0);
    const subtotalOtros = items.filter(i => i.impuesto_porcentaje !== 15 && i.impuesto_porcentaje !== 0).reduce((sum, i) => sum + i.subtotal, 0);

    return (
        <DashboardLayout>
            <div className="p-6 max-w-5xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Registrar Nueva Compra</h1>

                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Emisión</label>
                            <input
                                type="date"
                                className="w-full p-2 border rounded"
                                value={fecha}
                                onChange={e => setFecha(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                            <div className="flex gap-2">
                                <select
                                    className="w-full p-2 border rounded"
                                    value={proveedorId || ''}
                                    onChange={e => setProveedorId(Number(e.target.value))}
                                >
                                    <option value="">Seleccione...</option>
                                    {proveedores.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre} ({p.ruc})</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => setShowProvModal(true)}
                                    className="bg-blue-600 text-white px-3 rounded hover:bg-blue-700 font-bold"
                                    title="Nuevo Proveedor"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nro. Factura</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded"
                                placeholder="001-001-000000123"
                                value={numeroFactura}
                                onChange={e => setNumeroFactura(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Autorización *</label>
                            <input
                                type="text"
                                required
                                className="w-full p-2 border rounded"
                                value={autorizacion}
                                onChange={e => setAutorizacion(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Product Search */}
                    <div className="lg:col-span-1 bg-white rounded-lg shadow-sm p-4 h-[500px] flex flex-col">
                        <h2 className="font-semibold mb-4">Buscar Productos</h2>
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className="w-full p-2 border rounded mb-4"
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val.length > 2) loadProductos(val);
                            }}
                        />
                        <div className="flex-1 overflow-y-auto space-y-2">
                            {productos.map(prod => (
                                <div
                                    key={prod.id}
                                    className="p-3 border rounded hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                                    onClick={() => addItem(prod)}
                                >
                                    <div>
                                        <p className="font-medium text-sm">{prod.nombre}</p>
                                        <p className="text-xs text-gray-500">{prod.codigo_producto || prod.id}</p>
                                    </div>
                                    <span className="text-indigo-600 text-lg font-bold">+</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Cart / Details */}
                    <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
                        <h2 className="font-semibold mb-4">Detalle de Factura</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-700 font-medium">
                                    <tr>
                                        <th className="p-2">Producto</th>
                                        <th className="p-2 w-24">Cant.</th>
                                        <th className="p-2 w-32">Costo Unit.</th>
                                        <th className="p-2 w-32">Impuesto</th>
                                        <th className="p-2 text-right">Subtotal</th>
                                        <th className="p-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="p-2">{item.nombre}</td>
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    className="w-full p-1 border rounded text-center"
                                                    value={isNaN(item.cantidad) ? '' : item.cantidad}
                                                    min="1"
                                                    onChange={e => updateItem(idx, 'cantidad', parseFloat(e.target.value))}
                                                />
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    type="number"
                                                    className="w-full p-1 border rounded text-right"
                                                    value={isNaN(item.precio_unitario) ? '' : item.precio_unitario}
                                                    step="0.01"
                                                    onChange={e => updateItem(idx, 'precio_unitario', parseFloat(e.target.value))}
                                                />
                                            </td>
                                            <td className="p-2">
                                                <select
                                                    className="w-full p-1 border rounded text-sm"
                                                    value={item.impuesto_id}
                                                    onChange={e => updateItem(idx, 'impuesto_id', Number(e.target.value))}
                                                >
                                                    {impuestos.map(imp => (
                                                        <option key={imp.id} value={imp.id}>
                                                            {imp.nombre} ({imp.porcentaje}%)
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="p-2 text-right font-bold">
                                                ${item.subtotal.toFixed(2)}
                                            </td>
                                            <td className="p-2 text-center text-red-500 cursor-pointer" onClick={() => removeItem(idx)}>
                                                ✕
                                            </td>
                                        </tr>
                                    ))}
                                    {items.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-gray-400">
                                                Agregue productos desde el panel izquierdo
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-6 border-t pt-4 bg-gray-50 p-4 rounded text-sm">
                            <div className="flex justify-between mb-1">
                                <span>Subtotal 15%:</span>
                                <span>${subtotal15.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between mb-1">
                                <span>Subtotal 0%:</span>
                                <span>${subtotal0.toFixed(2)}</span>
                            </div>
                            {subtotalOtros > 0 && (
                                <div className="flex justify-between mb-1">
                                    <span>Subtotal Otros:</span>
                                    <span>${subtotalOtros.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between mb-1 font-semibold text-gray-700">
                                <span>IVA Total:</span>
                                <span>${totalIva.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between mt-3 text-xl font-bold border-t pt-2">
                                <span>Total:</span>
                                <span className="text-indigo-600">${totalGeneral.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => router.back()}
                                className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={saving}
                                className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {saving ? 'Guardando...' : 'Registrar Compra'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Create Provider Modal */}
                <PortalModal isOpen={showProvModal} onClose={() => setShowProvModal(false)}>
                    <form onSubmit={handleCreateProveedor}>
                        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 max-w-lg w-full rounded-2xl">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Nuevo Proveedor</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">RUC *</label>
                                    <input
                                        type="text"
                                        required
                                        maxLength={13}
                                        placeholder="099..."
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        value={newProvData.ruc}
                                        onChange={(e) => setNewProvData({ ...newProvData, ruc: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Razón Social *</label>
                                    <input
                                        type="text"
                                        required
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        value={newProvData.nombre}
                                        onChange={(e) => setNewProvData({ ...newProvData, nombre: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                                        <input
                                            type="text"
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            value={newProvData.telefono}
                                            onChange={(e) => setNewProvData({ ...newProvData, telefono: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Email</label>
                                        <input
                                            type="email"
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            value={newProvData.email}
                                            onChange={(e) => setNewProvData({ ...newProvData, email: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Dirección</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        value={newProvData.direccion}
                                        onChange={(e) => setNewProvData({ ...newProvData, direccion: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowProvModal(false)}
                                    className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingProv}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {savingProv ? 'Guardando...' : 'Guardar Proveedor'}
                                </button>
                            </div>
                        </div>
                    </form>
                </PortalModal>
            </div>
        </DashboardLayout>
    );
}
