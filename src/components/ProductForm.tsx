'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApiClient } from '@/lib/api';
import type { Categoria, Impuesto, ProductoFormData, Producto } from '@/lib/types/productos';
import CategoryModal from './CategoryModal';

interface ProductFormProps {
    initialData?: Producto;
    isDid?: boolean;
    onSuccess?: (producto: Producto) => void;
}

export default function ProductForm({ initialData, onSuccess }: ProductFormProps) {
    const router = useRouter();
    const isEditing = !!initialData;

    // Modal state
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

    // Estados de catálogos
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [impuestos, setImpuestos] = useState<Impuesto[]>([]);
    const [catalogosLoading, setCatalogosLoading] = useState(true);

    // Estados del formulario
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState<ProductoFormData>({
        nombre: initialData?.nombre || '',
        tipo: initialData?.tipo || 'producto',
        descripcion: initialData?.descripcion || '',
        unidad_medida: initialData?.unidad_medida || 'UNIDAD',
        codigo_producto: initialData?.codigo_producto || '',
        categoria_id: initialData?.categoria_id || '',
        impuesto_id: initialData?.impuesto_id || '',
        stock_minimo: initialData?.stock_minimo || 5,
        activo: initialData?.activo ?? true,
        precio_base: initialData?.presentaciones?.find(p => p.nombre_presentacion === 'Unidad')?.precio || '',
        mostrar_en_web: initialData?.mostrar_en_web ?? false,
        es_premium: initialData?.es_premium ?? false,
        meta_descripcion: initialData?.meta_descripcion || '',
    });

    // Cargar catálogos
    useEffect(() => {
        const cargarCatalogos = async () => {
            try {
                const api = getApiClient();
                const [catsRes, impRes] = await Promise.all([
                    api.getCategorias(),
                    api.getImpuestos()
                ]);

                if (catsRes.success && catsRes.data) setCategorias(catsRes.data);
                if (impRes.success && impRes.data) setImpuestos(impRes.data);

            } catch (err) {
                console.error('Error cargando catálogos', err);
                setError('Error al cargar categorías o impuestos');
            } finally {
                setCatalogosLoading(false);
            }
        };
        cargarCatalogos();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const api = getApiClient();

            // Validaciones simples
            if (!formData.nombre) throw new Error('El nombre es obligatorio');
            if (!formData.precio_base && !isEditing) throw new Error('El precio base es obligatorio para nuevos productos');

            // Preparar payload
            const payload = {
                ...formData,
                categoria_id: formData.categoria_id ? Number(formData.categoria_id) : null,
                impuesto_id: formData.impuesto_id ? Number(formData.impuesto_id) : null,
                stock_minimo: Number(formData.stock_minimo),
            };

            let response;
            if (isEditing && initialData) {
                response = await api.actualizarProducto(initialData.id, payload);
            } else {
                response = await api.crearProducto(payload);
            }

            if (response.success) {
                console.log('Producto guardado exitosamente', response.data);
                if (onSuccess && response.data) {
                    console.log('Ejecutando callback onSuccess');
                    onSuccess(response.data);
                } else {
                    console.log('Redirigiendo a /productos');
                    router.push('/productos');
                    router.refresh();
                }
            } else {
                setError(response.error || 'Error al guardar el producto');
            }

        } catch (err: any) {
            console.error('Error guardando producto:', err);
            setError(err.message || 'Error al guardar el producto');
        } finally {
            setLoading(false);
        }
    };

    if (catalogosLoading) {
        return <div className="p-8 text-center text-gray-500">Cargando formulario...</div>;
    }

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Producto *</label>
                    <input
                        type="text"
                        name="nombre"
                        required
                        value={formData.nombre}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Ej: Coca Cola 3L"
                    />
                </div>

                {/* Tipo */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                    <select
                        name="tipo"
                        value={formData.tipo}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="producto">Producto (Tangible)</option>
                        <option value="servicio">Servicio (Intangible)</option>
                    </select>
                </div>

                {/* Código */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Código / Referencia</label>
                    <input
                        type="text"
                        name="codigo_producto"
                        value={formData.codigo_producto}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Ej: ITEM-001"
                    />
                </div>

                {/* Categoría */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
                    <select
                        name="categoria_id"
                        value={formData.categoria_id}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Seleccionar Categoría</option>
                        {categorias.map(c => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                    </select>

                    <p className="text-xs text-gray-500 mt-1">
                        ¿No encuentras la categoría?{' '}
                        <button
                            type="button"
                            className="text-blue-600 hover:underline hover:text-blue-800 transition-colors"
                            onClick={() => setIsCategoryModalOpen(true)}
                        >
                            Crear nueva
                        </button>
                    </p>
                </div>

                <CategoryModal
                    isOpen={isCategoryModalOpen}
                    onClose={() => setIsCategoryModalOpen(false)}
                    onSuccess={(nuevaCategoria) => {
                        setCategorias(prev => [...prev, nuevaCategoria]);
                        setFormData(prev => ({ ...prev, categoria_id: nuevaCategoria.id }));
                    }}
                />

                {/* Impuesto */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Impuesto (IVA)</label>
                    <select
                        name="impuesto_id"
                        value={formData.impuesto_id}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Seleccionar Impuesto</option>
                        {impuestos.map(i => (
                            <option key={i.id} value={i.id}>{i.nombre} ({i.porcentaje}%)</option>
                        ))}
                    </select>
                </div>

                {/* Precio Base */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Precio de Venta (Unidad) *</label>
                    <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-500">$</span>
                        <input
                            type="number"
                            name="precio_base"
                            required={!isEditing}
                            step="0.01"
                            min="0"
                            value={formData.precio_base}
                            onChange={handleChange}
                            className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="0.00"
                        />
                    </div>
                    {isEditing && <p className="text-xs text-yellow-600 mt-1">Editar precio actualizará la presentación "Unidad"</p>}
                </div>

                {/* Stock Mínimo */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Stock Mínimo (Alerta)</label>
                    <input
                        type="number"
                        name="stock_minimo"
                        value={formData.stock_minimo}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Unidad Medida */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Unidad de Medida</label>
                    <input
                        type="text"
                        name="unidad_medida"
                        value={formData.unidad_medida}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="UNIDAD, KG, LITRO..."
                    />
                </div>

                {/* Estado */}
                <div className="flex items-center h-full pt-6">
                    <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                            type="checkbox"
                            name="activo"
                            checked={formData.activo}
                            onChange={e => setFormData({ ...formData, activo: e.target.checked })}
                            className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-gray-700 font-medium">Producto Activo (Venta habilitada)</span>
                    </label>
                </div>

                {/* E-commerce Section Header */}
                <div className="md:col-span-2 border-t border-gray-100 pt-6 mt-2">
                    <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        Configuración Tienda Online
                    </h3>
                </div>

                {/* Mostrar en Web */}
                <div className="flex items-center">
                    <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                            type="checkbox"
                            name="mostrar_en_web"
                            checked={formData.mostrar_en_web}
                            onChange={e => setFormData({ ...formData, mostrar_en_web: e.target.checked })}
                            className="h-5 w-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        />
                        <span className="text-gray-700 font-medium">Mostrar en Catálogo Web</span>
                    </label>
                </div>

                {/* Es Premium */}
                <div className="flex items-center">
                    <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                            type="checkbox"
                            name="es_premium"
                            checked={formData.es_premium}
                            onChange={e => setFormData({ ...formData, es_premium: e.target.checked })}
                            className="h-5 w-5 text-yellow-600 rounded border-gray-300 focus:ring-yellow-500"
                        />
                        <span className="text-gray-700 font-medium">Producto Premium (Destacado)</span>
                    </label>
                </div>

                {/* Meta Descripción SEO */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Descripción SEO (Google)</label>
                    <textarea
                        name="meta_descripcion"
                        rows={2}
                        value={formData.meta_descripcion}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="Breve descripción que aparecerá en los resultados de búsqueda de Google..."
                    />
                </div>

                {/* Descripción General */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                    <textarea
                        name="descripcion"
                        rows={3}
                        value={formData.descripcion}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Detalles adicionales del producto..."
                    />
                </div>

            </div>

            <div className="mt-8 flex justify-end gap-3">
                <Link
                    href="/productos"
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    Cancelar
                </Link>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
                >
                    {loading ? (
                        <>
                            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                            Guardando...
                        </>
                    ) : (
                        isEditing ? 'Actualizar Producto' : 'Crear Producto'
                    )}
                </button>
            </div>
        </form >
    );
}
