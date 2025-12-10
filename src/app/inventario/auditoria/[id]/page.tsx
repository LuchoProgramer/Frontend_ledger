'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { getApiClient } from '@/lib/api';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function AuditoriaDetailPage(props: PageProps) {
    const params = use(props.params);
    const id = params.id;
    const [auditoria, setAuditoria] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [saving, setSaving] = useState(false);

    const router = useRouter();
    const apiClient = getApiClient();

    useEffect(() => {
        loadDetalle();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const loadDetalle = async () => {
        setLoading(true);
        try {
            const res = await apiClient.getAuditoriaDetalle(Number(id));
            setAuditoria(res);
            setItems(res.items || []);
        } catch (error) {
            console.error(error);
            alert('Error al cargar auditoría');
        } finally {
            setLoading(false);
        }
    };

    const handleConteoChange = (itemId: number, cantidad: string) => {
        const nuevosItems = items.map(item => {
            if (item.id === itemId) {
                const val = cantidad === '' ? null : parseFloat(cantidad);
                // Calcular diferencia visualmente
                const diff = val !== null ? val - item.stock_sistema : null;
                return { ...item, conteo_fisico: val, diferencia: diff, modificado: true };
            }
            return item;
        });
        setItems(nuevosItems);
    };

    const guardarAvance = async () => {
        setSaving(true);
        try {
            // Filtrar solo modificados para enviar
            // O enviar todo para asegurar. Backend acepta lista.
            // Enviemos todo lo que tenga conteo_fisico != null
            const payload = items
                .filter(i => i.conteo_fisico !== null && i.conteo_fisico !== undefined)
                .map(i => ({
                    producto_id: i.producto_id,
                    cantidad: i.conteo_fisico
                }));

            if (payload.length > 0) {
                await apiClient.guardarConteo(Number(id), payload);
                // Recargar para limpiar flags y asegurar sync
                await loadDetalle();
            }
            alert('Avance guardado.');
        } catch (error) {
            console.error(error);
            alert('Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const finalizarAuditoria = async () => {
        if (!confirm('¿Estás seguro de finalizar la auditoría? Esto cerrará el conteo y generará el reporte final.')) return;

        try {
            // Guardar primero
            await guardarAvance();

            await apiClient.finalizarAuditoria(Number(id));
            alert('Auditoría finalizada correctamente.');
            router.push('/inventario/auditoria');
        } catch (error: any) {
            alert(error.error || 'Error al finalizar');
        }
    };

    const filteredItems = items.filter(item =>
        item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <DashboardLayout><div className="p-8 text-center">Cargando...</div></DashboardLayout>;
    if (!auditoria) return <DashboardLayout><div className="p-8 text-center">Auditoría no encontrada</div></DashboardLayout>;

    const isBorrador = auditoria.estado === 'BORRADOR';

    return (
        <DashboardLayout>
            <div className="p-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-gray-800">
                                Auditoría #{auditoria.id}
                            </h1>
                            <span className={`px-2 py-1 text-xs rounded-full font-bold ${isBorrador ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                                }`}>
                                {auditoria.estado}
                            </span>
                        </div>
                        <p className="text-gray-500 text-sm mt-1">
                            Sucursal: {auditoria.sucursal} | Inicio: {new Date(auditoria.fecha_inicio).toLocaleString()}
                        </p>
                    </div>

                    {isBorrador && (
                        <div className="flex gap-2">
                            <button
                                onClick={guardarAvance}
                                disabled={saving}
                                className="px-4 py-2 border border-gray-300 bg-white rounded text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                {saving ? 'Guardando...' : 'Guardar Avance'}
                            </button>
                            <button
                                onClick={finalizarAuditoria}
                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 shadow-sm"
                            >
                                Finalizar Auditoría
                            </button>
                        </div>
                    )}
                </div>

                {/* Buscador */}
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Buscar producto por nombre o código..."
                        className="w-full p-2 border rounded shadow-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Tabla de Conteo */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Stock Sistema</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Conteo Físico</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Diferencia</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredItems.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                        {item.codigo}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {item.nombre}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {item.categoria}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                                        {/* Ocultar stock sistema si se desea conteo ciego real, pero para audit es mejor mostrar tras contar o permitir ver. Aquí mostramos. */}
                                        {Number(item.stock_sistema).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        {isBorrador ? (
                                            <input
                                                type="number"
                                                className={`w-24 p-1 border rounded text-right focus:ring-2 focus:ring-indigo-500 ${item.conteo_fisico !== null && item.conteo_fisico !== undefined
                                                        ? 'bg-blue-50 border-blue-300'
                                                        : 'bg-white'
                                                    }`}
                                                value={item.conteo_fisico === null || item.conteo_fisico === undefined ? '' : item.conteo_fisico}
                                                onChange={(e) => handleConteoChange(item.id, e.target.value)}
                                                placeholder="0.00"
                                            />
                                        ) : (
                                            <span className="text-sm font-bold">{item.conteo_fisico !== null ? Number(item.conteo_fisico).toFixed(2) : '-'}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold">
                                        {item.conteo_fisico !== null ? (
                                            <span className={
                                                (item.diferencia || 0) < 0 ? 'text-red-600' :
                                                    (item.diferencia || 0) > 0 ? 'text-green-600' : 'text-gray-400'
                                            }>
                                                {(item.diferencia || 0) > 0 ? '+' : ''}{Number(item.diferencia || 0).toFixed(2)}
                                            </span>
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
}
