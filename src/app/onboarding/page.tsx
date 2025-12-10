'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getApiClient } from '@/lib/api';
import type { SucursalFormData } from '@/lib/types/sucursales';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [verificandoSucursales, setVerificandoSucursales] = useState(true);

  const [formData, setFormData] = useState<SucursalFormData>({
    nombre: '',
    direccion: '',
    telefono: '',
    codigo_establecimiento: '001',
    punto_emision: '001',
    es_matriz: true,
  });

  // Verificar si ya tiene sucursales
  useEffect(() => {
    if (!isAdmin) {
      router.push('/');
      return;
    }

    const verificarSucursales = async () => {
      try {
        const api = getApiClient();
        const response = await api.getSucursalesList({ page_size: 1 });

        // Si ya tiene sucursales, redirigir al dashboard
        if (response.success && (response.count ?? 0) > 0) {
          router.push('/');
        } else {
          setVerificandoSucursales(false);
        }
      } catch (error) {
        console.error('Error verificando sucursales:', error);
        setVerificandoSucursales(false);
      }
    };

    verificarSucursales();
  }, [isAdmin, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const api = getApiClient();
      const response = await api.crearSucursal(formData);

      if (response.success) {
        setSuccess('¡Sucursal creada exitosamente! Redirigiendo al dashboard...');
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        setError(response.error || 'Error al crear la sucursal');
      }
    } catch (error: any) {
      setError(error.message || 'Error al crear la sucursal');
    } finally {
      setLoading(false);
    }
  };

  if (verificandoSucursales) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              ¡Bienvenido a LedgerXpertz!
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Para comenzar a usar el sistema, necesitamos configurar tu primera sucursal.
              Esta será la sucursal matriz de tu empresa.
            </p>
          </div>

          {/* Info Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-xl">🏢</span>
                </div>
                <h3 className="font-semibold text-gray-900">Sucursal Matriz</h3>
              </div>
              <p className="text-sm text-gray-600">
                La sucursal principal de tu empresa. Puedes agregar más sucursales después.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-xl">👥</span>
                </div>
                <h3 className="font-semibold text-gray-900">Asignar Usuarios</h3>
              </div>
              <p className="text-sm text-gray-600">
                Después podrás crear usuarios y asignarlos a las sucursales correspondientes.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-xl">📦</span>
                </div>
                <h3 className="font-semibold text-gray-900">Gestión de Inventario</h3>
              </div>
              <p className="text-sm text-gray-600">
                Cada sucursal tendrá su propio inventario y punto de venta.
              </p>
            </div>
          </div>

          {/* Formulario */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Configurar Sucursal Matriz</h2>
              <p className="text-gray-600">Complete la información de su sucursal principal</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="font-semibold text-red-800 mb-1">Error</h3>
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
                <svg className="w-5 h-5 text-green-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="font-semibold text-green-800 mb-1">¡Éxito!</h3>
                  <p className="text-green-700">{success}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Información Básica */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la Sucursal *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Matriz - Quito"
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección *
                </label>
                <textarea
                  required
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ingrese la dirección completa de la sucursal"
                />
              </div>

              {/* Códigos SRI */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Códigos para Facturación Electrónica (SRI)
                </h3>

                <div className="grid md:grid-cols-2 gap-6">
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
                    <p className="mt-1 text-sm text-gray-500">3 dígitos (Ej: 001)</p>
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
                    <p className="mt-1 text-sm text-gray-500">3 dígitos (Ej: 001)</p>
                  </div>
                </div>

                <div className="mt-4 flex items-start">
                  <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-gray-600">
                    Estos códigos son requeridos por el SRI para la facturación electrónica.
                    Para la sucursal matriz, generalmente se usa 001-001.
                  </p>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-4 pt-6">
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
                      Creando sucursal...
                    </span>
                  ) : (
                    'Crear Sucursal Matriz'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Footer Info */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Después de crear la sucursal matriz, podrás acceder al dashboard y configurar usuarios, productos e inventario.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
