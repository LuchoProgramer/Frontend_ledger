'use client';

import { useQuery } from '@tanstack/react-query';
import { getApiClient } from '@/lib/api';
import type { Factura } from '@/lib/types';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function DetalleFactura() {
  const params = useParams();
  const router = useRouter();
  const facturaId = Number(params.id);
  const [tenant, setTenant] = useState<string>('yanett');

  // Detectar tenant desde cookie
  useEffect(() => {
    const cookieTenant = document.cookie
      .split('; ')
      .find((row) => row.startsWith('tenant='))
      ?.split('=')[1];

    if (cookieTenant) {
      setTenant(cookieTenant);
    }
  }, []);

  // Query para obtener detalle de factura
  const { data: factura, isLoading, error, refetch } = useQuery<Factura>({
    queryKey: ['factura', facturaId, tenant],
    queryFn: async () => {
      const api = getApiClient(tenant);
      return api.getFactura(facturaId);
    },
    enabled: !!tenant && !!facturaId,
  });

  const handleEnviarSRI = async () => {
    if (!factura) return;

    if (!confirm('¿Estás seguro de enviar esta factura al SRI?')) return;

    try {
      const api = getApiClient(tenant);
      const resultado = await api.enviarSRI(factura.id);
      alert('Factura enviada al SRI exitosamente');
      refetch();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleConsultarSRI = async () => {
    if (!factura?.clave_acceso) {
      alert('La factura no tiene clave de acceso');
      return;
    }

    try {
      const api = getApiClient(tenant);
      const resultado = await api.consultarSRI(factura.id);
      alert('Consulta realizada. Revisa el estado actualizado.');
      refetch();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDescargarXML = async () => {
    if (!factura) return;

    try {
      const api = getApiClient(tenant);
      const blob = await api.descargarXML(factura.id);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura_${factura.id}.xml`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Cargando factura...</div>
      </div>
    );
  }

  if (error || !factura) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-600 mb-4">
            Error: {error ? (error as any).message : 'Factura no encontrada'}
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Volver al listado
          </button>
        </div>
      </div>
    );
  }

  const estadoColor = {
    AUTORIZADA: 'bg-green-100 text-green-800 border-green-300',
    EN_PROCESO: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    PPR: 'bg-yellow-100 text-yellow-800 border-yellow-300', // Legacy
    RECHAZADA: 'bg-red-100 text-red-800 border-red-300',
    ANULADA: 'bg-gray-100 text-gray-800 border-gray-300',
  }[factura.estado_sri] || 'bg-gray-100 text-gray-800 border-gray-300';

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header con botón volver */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4"
          >
            ← Volver al listado
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Factura #{factura.id}
              </h1>
              <p className="text-gray-600 mt-1">
                Fecha: {new Date(factura.fecha_emision).toLocaleDateString('es-EC', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div className={`px-4 py-2 rounded-lg border-2 ${estadoColor}`}>
              <span className="font-semibold">Estado: {factura.estado_sri}</span>
            </div>
          </div>
        </div>

        {/* Información del Cliente */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Información del Cliente</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">RUC/Cédula</p>
              <p className="font-semibold text-gray-900">{factura.cliente.ruc}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Razón Social</p>
              <p className="font-semibold text-gray-900">{factura.cliente.razon_social}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Dirección</p>
              <p className="font-semibold text-gray-900">{factura.cliente.direccion}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Teléfono</p>
              <p className="font-semibold text-gray-900">{factura.cliente.telefono || 'N/A'}</p>
            </div>
            {factura.cliente.email && (
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-semibold text-gray-900">{factura.cliente.email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Detalles de la Factura */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Productos</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Cantidad
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    P. Unitario
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Descuento
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {factura.detalles.map((detalle, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {detalle.codigo_principal}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {detalle.producto_nombre}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {parseFloat(detalle.cantidad).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      ${parseFloat(detalle.precio_unitario).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      ${parseFloat(detalle.descuento).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                      ${parseFloat(detalle.total).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totales */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="max-w-md ml-auto">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-semibold text-gray-900">
                ${parseFloat(factura.subtotal).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">IVA 15%:</span>
              <span className="font-semibold text-gray-900">
                ${parseFloat(factura.iva).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between py-3 border-t-2 border-gray-300 mt-2">
              <span className="text-lg font-bold text-gray-900">Total:</span>
              <span className="text-lg font-bold text-gray-900">
                ${parseFloat(factura.total).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Información SRI */}
        {factura.clave_acceso && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Información SRI</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Clave de Acceso</p>
                <p className="font-mono text-sm text-gray-900 break-all">
                  {factura.clave_acceso}
                </p>
              </div>
              {factura.numero_autorizacion && (
                <div>
                  <p className="text-sm text-gray-600">Número de Autorización</p>
                  <p className="font-mono text-sm text-gray-900">
                    {factura.numero_autorizacion}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Acciones</h2>
          <div className="flex flex-wrap gap-3">
            {factura.puede_enviar_sri && (
              <button
                onClick={handleEnviarSRI}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold"
              >
                📤 Enviar al SRI
              </button>
            )}

            {factura.clave_acceso && (
              <button
                onClick={handleConsultarSRI}
                className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-semibold"
              >
                🔍 Consultar Estado SRI
              </button>
            )}

            {factura.tiene_xml_firmado && (
              <button
                onClick={handleDescargarXML}
                className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold"
              >
                📥 Descargar XML
              </button>
            )}

            <button
              onClick={() => window.print()}
              className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 font-semibold"
            >
              🖨️ Imprimir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
