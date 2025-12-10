'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeftRight, Save, Plus, Minus, Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Producto } from '@/lib/types/productos';

interface Sucursal {
  id: number;
  nombre: string;
  direccion: string;
}

export default function AjustesInventarioPage() {
  const { api } = useAuth();
  const router = useRouter();

  // Estado de carga inicial
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Data de catálogos
  const [productos, setProductos] = useState<Producto[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);

  // Estado del formulario
  const [formData, setFormData] = useState({
    producto_id: '',
    sucursal_id: '',
    tipo: 'ENTRADA' as 'ENTRADA' | 'SALIDA',
    cantidad: '',
    motivo: ''
  });

  // Estado para feedback
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodsRes, sucsRes] = await Promise.all([
          api.getProductos({ page_size: 100, activo: true }),
          api.getSucursalesList({ page_size: 50 })
        ]);

        setProductos(prodsRes.results || []);
        setSucursales(sucsRes.results || []);
      } catch (error) {
        setMessage({ type: 'error', text: 'Error cargando datos iniciales.' });
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [api]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    // Validaciones básicas
    if (!formData.producto_id || !formData.sucursal_id || !formData.cantidad || !formData.motivo) {
      setMessage({ type: 'error', text: 'Todos los campos son obligatorios.' });
      setSubmitting(false);
      return;
    }

    try {
      await api.ajusteInventario({
        producto_id: parseInt(formData.producto_id),
        sucursal_id: parseInt(formData.sucursal_id),
        tipo: formData.tipo,
        cantidad: parseFloat(formData.cantidad),
        motivo: formData.motivo
      });

      setMessage({ type: 'success', text: 'Ajuste realizado correctamente.' });

      // Resetear algunos campos
      setFormData(prev => ({ ...prev, cantidad: '', motivo: '' }));

    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Error al procesar el ajuste.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando catálogo...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <ArrowLeftRight className="w-8 h-8 text-indigo-600" />
          Ajustes de Inventario
        </h1>
        <p className="text-gray-500 mt-2">
          Registra entradas o salidas manuales de mercadería para corregir diferencias de stock.
        </p>
      </div>

      {/* Alertas */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <p>{message.text}</p>
        </div>
      )}

      {/* Main Form Card */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Columna Izquierda: Ubicación y Producto */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sucursal Afectada</label>
                <select
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  value={formData.sucursal_id}
                  onChange={(e) => setFormData({ ...formData, sucursal_id: e.target.value })}
                  required
                >
                  <option value="">Seleccione una sucursal...</option>
                  {sucursales.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Producto</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <select
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none"
                    value={formData.producto_id}
                    onChange={(e) => setFormData({ ...formData, producto_id: e.target.value })}
                    required
                  >
                    <option value="">Buscar producto por nombre o código...</option>
                    {productos.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.codigo_producto} - {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-gray-500 mt-1">Mostrando primeros 100 productos activos.</p>
              </div>
            </div>

            {/* Columna Derecha: Detalles del Movimiento */}
            <div className="space-y-6 bg-gray-50 p-6 rounded-lg border border-gray-200">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Ajuste</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo: 'ENTRADA' })}
                    className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg border font-medium transition-all ${formData.tipo === 'ENTRADA'
                      ? 'bg-green-100 border-green-500 text-green-700 ring-2 ring-green-500/20'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    <Plus className="w-4 h-4" /> Entrada (Sobra)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipo: 'SALIDA' })}
                    className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg border font-medium transition-all ${formData.tipo === 'SALIDA'
                      ? 'bg-red-100 border-red-500 text-red-700 ring-2 ring-red-500/20'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    <Minus className="w-4 h-4" /> Salida (Falta)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cantidad</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  value={formData.cantidad}
                  onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Motivo / Justificación</label>
                <textarea
                  placeholder="Explique la razón del ajuste (ej: Conteo corregido, merma, rotura)"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none h-24 resize-none"
                  value={formData.motivo}
                  onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                  required
                />
              </div>

            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-100">
            <button
              type="button"
              className="px-6 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
              onClick={() => router.back()}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`flex items-center gap-2 bg-indigo-600 text-white px-8 py-2.5 rounded-lg shadow-sm hover:bg-indigo-700 transition-all font-medium ${submitting ? 'opacity-70 cursor-not-allowed' : ''
                }`}
            >
              <Save className="w-4 h-4" />
              {submitting ? 'Guardando...' : 'Aplicar Ajuste'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
