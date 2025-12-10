'use client';

import { useEffect, useState } from 'react';
import { getApiClient } from '@/lib/api';
import Link from 'next/link';
import BuscarEmpresaModal from './BuscarEmpresaModal';

interface Feature {
  titulo: string;
  descripcion: string;
  icono: string;
}

interface Stats {
  total_empresas: number;
  features: Feature[];
}

export default function LandingPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalBuscarAbierto, setModalBuscarAbierto] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const api = getApiClient();
        console.log('[LandingPage] API Client creado');
        console.log('[LandingPage] Tenant:', (api as any).tenant);
        console.log('[LandingPage] Base URL:', (api as any).baseURL);
        console.log('[LandingPage] Obteniendo estadísticas públicas...');
        const data = await api.getEstadisticasPublicas();
        console.log('[LandingPage] Estadísticas recibidas:', data);
        setStats(data);
      } catch (error: any) {
        console.error('[LandingPage] Error al cargar estadísticas:', {
          error,
          message: error?.message,
          status: error?.status,
          data: error?.data
        });
        console.error('[LandingPage] Error stack:', error?.stack);

        // Usar datos por defecto si falla
        setStats({
          total_empresas: 0,
          features: [
            {
              titulo: 'Punto de Venta',
              descripcion: 'Sistema de facturación rápido y eficiente',
              icono: 'shopping-cart'
            },
            {
              titulo: 'Control de Inventario',
              descripcion: 'Gestión completa de productos y stock',
              icono: 'package'
            },
            {
              titulo: 'Facturación Electrónica SRI',
              descripcion: 'Integración completa con el SRI de Ecuador',
              icono: 'file-text'
            }
          ]
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <header className="container mx-auto px-4 py-16">
        <nav className="flex justify-between items-center mb-16">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">LX</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">LedgerXpertz</h1>
          </div>
          <div className="space-x-4">
            <button
              onClick={() => setModalBuscarAbierto(true)}
              className="text-gray-700 hover:text-indigo-600 font-medium transition"
            >
              Iniciar Sesión
            </button>
            <Link
              href="/registro"
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              Comenzar Gratis
            </Link>
          </div>
        </nav>

        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-5xl font-extrabold text-gray-900 mb-6">
            Sistema de Gestión Empresarial
            <span className="text-indigo-600"> Multi-Tenant</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Gestiona tu negocio de forma profesional con facturación electrónica SRI,
            control de inventario, punto de venta y más.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/registro"
              className="bg-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition shadow-lg"
            >
              Registrar mi Empresa
            </Link>
            <button
              onClick={() => setModalBuscarAbierto(true)}
              className="bg-white text-indigo-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition shadow-lg border-2 border-indigo-600"
            >
              Buscar mi Empresa
            </button>
          </div>
        </div>
      </header>

      {/* Modal de Búsqueda */}
      <BuscarEmpresaModal
        isOpen={modalBuscarAbierto}
        onClose={() => setModalBuscarAbierto(false)}
      />

      {/* Stats Section */}
      {!loading && stats && (
        <section className="bg-white py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-indigo-600 mb-2">
                  {stats.total_empresas}+
                </div>
                <div className="text-gray-600">Empresas Registradas</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-indigo-600 mb-2">100%</div>
                <div className="text-gray-600">Cumplimiento SRI</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-indigo-600 mb-2">24/7</div>
                <div className="text-gray-600">Disponibilidad</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Todo lo que necesitas para tu negocio
        </h3>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {stats?.features.map((feature, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition"
              >
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <FeatureIcon name={feature.icono} />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">
                  {feature.titulo}
                </h4>
                <p className="text-gray-600">{feature.descripcion}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="bg-indigo-600 py-16">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold text-white mb-6">
            ¿Listo para comenzar?
          </h3>
          <p className="text-xl text-indigo-100 mb-8">
            Registra tu empresa ahora y comienza a gestionar tu negocio de forma profesional
          </p>
          <Link
            href="/registro"
            className="bg-white text-indigo-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition inline-block shadow-lg"
          >
            Crear Cuenta Gratis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2025 LedgerXpertz. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

// Componente simple para iconos (puedes reemplazarlo con una librería de iconos)
function FeatureIcon({ name }: { name: string }) {
  const iconClass = 'w-6 h-6 text-indigo-600';
  
  // Iconos SVG básicos
  switch (name) {
    case 'shopping-cart':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    case 'package':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
    case 'file-text':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case 'bar-chart':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case 'truck':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
        </svg>
      );
    case 'clock':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
  }
}
