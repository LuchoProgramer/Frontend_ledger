'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function ExitosoContent() {
  const searchParams = useSearchParams();
  const empresa = searchParams.get('empresa');
  const url = searchParams.get('url');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8 text-center">
        {/* Icono de éxito */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        {/* Título */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          ¡Registro Exitoso!
        </h1>

        {/* Mensaje */}
        <p className="text-lg text-gray-700 mb-8">
          Su empresa <span className="font-semibold text-indigo-600">{empresa}</span> ha
          sido registrada exitosamente en LedgerXpertz.
        </p>

        {/* URL de acceso */}
        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-6 mb-8">
          <p className="text-sm text-gray-600 mb-2">Acceda a su sistema en:</p>
          <a
            href={url || '#'}
            className="text-2xl font-bold text-indigo-600 hover:text-indigo-700 break-all"
          >
            {url}
          </a>
        </div>

        {/* Instrucciones */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Próximos pasos:
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Acceda al sistema usando el enlace de arriba</li>
            <li>Configure los usuarios y permisos de su empresa</li>
            <li>Registre sus productos o servicios</li>
            <li>Configure su certificado digital para facturación electrónica</li>
            <li>¡Comience a facturar!</li>
          </ol>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href={url || '#'}
            className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition"
          >
            Ir a mi Sistema
          </a>
          <Link
            href="/"
            className="flex-1 border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition"
          >
            Volver al Inicio
          </Link>
        </div>

        {/* Información adicional */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            ¿Necesita ayuda?{' '}
            <a href="/soporte" className="text-indigo-600 hover:underline font-medium">
              Contacte a soporte
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ExitosoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Cargando...</div>
      </div>
    }>
      <ExitosoContent />
    </Suspense>
  );
}
