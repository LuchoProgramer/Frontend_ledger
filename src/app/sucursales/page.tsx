
'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getApiClient } from '@/lib/api';
import { Sucursal, SucursalFormData } from '@/lib/types/sucursales';
import PortalModal from '@/components/ui/PortalModal';

export default function SucursalesPage() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<SucursalFormData>({
    nombre: '',
    direccion: '',
    telefono: '',
    codigo_establecimiento: '',
    punto_emision: '',
    es_matriz: false
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const api = getApiClient();
      const response = await api.getSucursalesList();
      // Handle both paginated (results) and non-paginated (data) responses
      const list = response.results || response.data || [];
      setSucursales(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const api = getApiClient();
      if (editingId) {
        await api.actualizarSucursal(editingId, formData);
      } else {
        await api.crearSucursal(formData);
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (s: Sucursal) => {
    setEditingId(s.id);
    setFormData({
      nombre: s.nombre,
      direccion: s.direccion,
      telefono: s.telefono,
      codigo_establecimiento: s.codigo_establecimiento,
      punto_emision: s.punto_emision,
      es_matriz: s.es_matriz
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta sucursal?')) return;
    try {
      await getApiClient().eliminarSucursal(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData({
      nombre: '',
      direccion: '',
      telefono: '',
      codigo_establecimiento: '',
      punto_emision: '',
      es_matriz: false
    });
    setShowModal(true);
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Sucursales</h1>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            + Nueva Sucursal
          </button>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg hidden md:block">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dirección</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Matriz</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sucursales.map(s => (
                <tr key={s.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{s.nombre}</div>
                    <div className="text-xs text-gray-500">{s.telefono}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {s.codigo_establecimiento}-{s.punto_emision}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{s.direccion}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {s.es_matriz ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Sí
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        No
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleEdit(s)} className="text-indigo-600 hover:text-indigo-900 mr-4">Editar</button>
                    <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:text-red-900">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View (Cards) */}
        <div className="block md:hidden space-y-4">
          {sucursales.map(s => (
            <div key={s.id} className="bg-white shadow rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{s.nombre}</h3>
                  <p className="text-xs text-gray-500">{s.codigo_establecimiento}-{s.punto_emision}</p>
                </div>
                {s.es_matriz && (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Matriz
                  </span>
                )}
              </div>

              <div className="text-sm text-gray-700 space-y-1">
                <p><span className="font-medium">Dirección:</span> {s.direccion}</p>
                <p><span className="font-medium">Teléfono:</span> {s.telefono}</p>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end space-x-3">
                <button
                  onClick={() => handleEdit(s)}
                  className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-md text-sm font-medium hover:bg-indigo-100 transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="px-3 py-1.5 bg-red-50 text-red-700 rounded-md text-sm font-medium hover:bg-red-100 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* MODAL */}
        <PortalModal isOpen={showModal} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{editingId ? 'Editar' : 'Nueva'} Sucursal</h3>

              {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    value={formData.nombre}
                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cod. Estab.</label>
                    <input
                      type="text"
                      required
                      maxLength={3}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      value={formData.codigo_establecimiento}
                      onChange={e => setFormData({ ...formData, codigo_establecimiento: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Pto. Emisión</label>
                    <input
                      type="text"
                      required
                      maxLength={3}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      value={formData.punto_emision}
                      onChange={e => setFormData({ ...formData, punto_emision: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Dirección</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    value={formData.direccion}
                    onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    value={formData.telefono}
                    onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="es_matriz"
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    checked={formData.es_matriz}
                    onChange={e => setFormData({ ...formData, es_matriz: e.target.checked })}
                  />
                  <label htmlFor="es_matriz" className="ml-2 block text-sm text-gray-900">
                    Es Matriz
                  </label>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button type="submit" disabled={saving} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 sm:ml-3 sm:w-auto sm:text-sm">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                Cancelar
              </button>
            </div>
          </form>
        </PortalModal>
      </div>
    </DashboardLayout >
  );
}
