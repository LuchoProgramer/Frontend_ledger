'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getApiClient } from '@/lib/api';
import type { SucursalFormData } from '@/lib/types/sucursales';

export default function NuevaSucursalPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState<SucursalFormData>({
    nombre: '',
    direccion: '',
    telefono: '',
    codigo_establecimiento: '',
    punto_emision: '',
    es_matriz: false,
  });

  // Verificar permisos
  if (authLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>;
  }

  if (!isAdmin) {
    router.push('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const api = getApiClient();
      const response = await api.crearSucursal(formData);

      if (response.success) {
        setSuccess('Sucursal creada exitosamente. Redirigiendo...');
        setTimeout(() => {
          router.push('/sucursales');
        }, 1500);
      } else {
        setError(response.error || 'Error al crear la sucursal');
      }
    } catch (error: any) {
      setError(error.message || 'Error al crear la sucursal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/sucursales"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver a sucursales
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Nueva Sucursal</h1>
          <p className="mt-2 text-gray-600">Complete la información de la nueva sucursal</p>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-lg shadow-sm p-8">
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información Básica */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Información Básica</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la Sucursal *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Sucursal Norte"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección *
                  </label>
                  <textarea
                    required
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ingrese la dirección completa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: 02-1234567"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="es_matriz"
                    checked={formData.es_matriz}
                    onChange={(e) => setFormData({ ...formData, es_matriz: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="es_matriz" className="ml-2 block text-sm font-medium text-gray-700">
                    Es sucursal matriz
                  </label>
                </div>
              </div>
            </div>

            {/* Códigos SRI */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Códigos para Facturación Electrónica (SRI)</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código de Establecimiento *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={3}
                    pattern="[0-9]{3}"
                    value={formData.codigo_establecimiento}
                    onChange={(e) => setFormData({ ...formData, codigo_establecimiento: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    placeholder="001"
                  />
                  <p className="mt-1 text-sm text-gray-500">3 dígitos numéricos (Ej: 001, 002, 003)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Punto de Emisión *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={3}
                    pattern="[0-9]{3}"
                    value={formData.punto_emision}
                    onChange={(e) => setFormData({ ...formData, punto_emision: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    placeholder="001"
                  />
                  <p className="mt-1 text-sm text-gray-500">3 dígitos numéricos (Ej: 001, 002, 003)</p>
                </div>
              </div>

              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-gray-700">
                    <p className="font-semibold mb-1">Información importante:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Cada sucursal debe tener una combinación única de Código de Establecimiento y Punto de Emisión</li>
                      <li>La sucursal matriz típicamente usa 001-001</li>
                      <li>Otras sucursales pueden usar 002-001, 003-001, etc.</li>
                      <li>Estos códigos son requeridos por el SRI para la facturación electrónica</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creando...
                  </span>
                ) : (
                  'Crear Sucursal'
                )}
              </button>
              <Link
                href="/sucursales"
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors duration-200"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
