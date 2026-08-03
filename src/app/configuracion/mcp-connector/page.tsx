'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';

const MCP_SERVER_URL = 'https://mcp.ledgerxpertz.com/mcp';
const MCP_CLIENT_ID = 'claude-desktop-ledgerxpertz';

export default function MCPConnectorPage() {
  const { api, user } = useAuth();
  const router = useRouter();

  const [activando, setActivando] = useState(false);
  const [credenciales, setCredenciales] = useState<{ username: string; password: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    const isAdmin = user.is_staff || user.is_superuser || (user.groups ?? []).includes('Administrador');
    if (!isAdmin) router.replace('/configuracion');
  }, [user, router]);

  const handleActivar = async () => {
    setActivando(true);
    setError('');
    setCredenciales(null);
    try {
      const res = await api.activarConectorMCP();
      setCredenciales({ username: res.username, password: res.password });
    } catch (err: any) {
      setError(err?.message || 'Error al generar las credenciales.');
    } finally {
      setActivando(false);
    }
  };

  const handleCopiar = () => {
    if (!credenciales) return;
    navigator.clipboard.writeText(
      `Usuario: ${credenciales.username}\nContraseña: ${credenciales.password}`
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Conector MCP</h1>
        <p className="text-gray-600 mb-6">
          Conectá tu propia suscripción de Claude (Desktop o Cowork) para consultar y operar
          sobre tus datos en lenguaje natural — importación de compras por clave de acceso SRI.
        </p>

        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <div>
            <span className="block text-sm font-medium text-gray-700">URL del servidor</span>
            <code className="block mt-1 p-2 bg-gray-50 rounded text-sm">{MCP_SERVER_URL}</code>
          </div>
          <div>
            <span className="block text-sm font-medium text-gray-700">Client ID</span>
            <code className="block mt-1 p-2 bg-gray-50 rounded text-sm">{MCP_CLIENT_ID}</code>
          </div>
          <p className="text-sm text-gray-500">
            El Client Secret te lo compartimos por separado al activar tu cuenta premium.
          </p>

          <button
            onClick={handleActivar}
            disabled={activando}
            className="w-full sm:w-auto inline-flex justify-center py-3 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50 transition-colors"
          >
            {activando ? 'Generando…' : 'Activar conector MCP'}
          </button>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {credenciales && (
            <div className="border border-indigo-200 bg-indigo-50 rounded-md p-4 space-y-2">
              <p className="text-sm font-medium text-indigo-900">
                Guardá esto ahora — no se vuelve a mostrar.
              </p>
              <p className="text-sm">Usuario: <code>{credenciales.username}</code></p>
              <p className="text-sm">Contraseña: <code>{credenciales.password}</code></p>
              <button
                onClick={handleCopiar}
                className="text-sm text-indigo-600 hover:text-indigo-800 underline"
              >
                Copiar
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
