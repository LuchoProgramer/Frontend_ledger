'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface POSLayoutProps {
  children: React.ReactNode;
  pendingCount?: number;
  errorCount?: number;
}

export default function POSLayout({ children, pendingCount = 0, errorCount = 0 }: POSLayoutProps) {
  const router = useRouter();
  const { user, logout, loading: authLoading } = useAuth();
  const [tenant, setTenant] = useState('');
  const [activeTurnoNombre, setActiveTurnoNombre] = useState<string | null>(null);

  useEffect(() => {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    if (parts.length > 2) {
      setTenant(parts[0].charAt(0).toUpperCase() + parts[0].slice(1));
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const read = () => {
      const raw = localStorage.getItem('activeTurno');
      setActiveTurnoNombre(raw ? JSON.parse(raw).sucursal_nombre : null);
    };
    read();
    window.addEventListener('storage', read);
    return () => window.removeEventListener('storage', read);
  }, []);

  if (authLoading || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-100">
      <header className="h-16 shrink-0 bg-white shadow-sm border-b z-30 flex items-center px-4 justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">LX</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold text-gray-900 leading-none">LedgerXpertz</p>
            <p className="text-xs text-gray-500 mt-0.5">{tenant}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeTurnoNombre ? (
            <>
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
                <span className="text-sm font-semibold text-indigo-800 max-w-[140px] truncate">{activeTurnoNombre}</span>
              </div>
              {pendingCount > 0 && (
                <div className="flex items-center gap-1 bg-orange-100 border border-orange-300 px-2 py-1 rounded-lg">
                  <span className="text-xs font-bold text-orange-700">⚡ {pendingCount}</span>
                </div>
              )}
              {errorCount > 0 && (
                <div className="flex items-center gap-1 bg-red-100 border border-red-300 px-2 py-1 rounded-lg">
                  <span className="text-xs font-bold text-red-700">⚠ {errorCount}</span>
                </div>
              )}
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('pos:close-turno'))}
                disabled={pendingCount > 0}
                title={pendingCount > 0 ? `Sincroniza ${pendingCount} venta${pendingCount > 1 ? 's' : ''} primero` : undefined}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                  pendingCount > 0
                    ? 'bg-red-300 text-white cursor-not-allowed opacity-60'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Cerrar Turno</span>
              </button>
            </>
          ) : (
            <>
              <span className="text-sm text-gray-700 hidden sm:block">{user?.first_name || user?.username}</span>
              <button
                onClick={logout}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
              >
                Salir
              </button>
            </>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
