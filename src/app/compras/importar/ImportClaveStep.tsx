'use client';

import { useEffect, useState } from 'react';

interface Props {
  sucursales: { id: number; nombre: string }[];
  cargandoCatalogos?: boolean;
  buscando: boolean;
  error: string | null;
  onBuscar: (clave: string, sucursalId: number) => void;
}

export default function ImportClaveStep({ sucursales, cargandoCatalogos, buscando, error, onBuscar }: Props) {
  const [clave, setClave] = useState('');
  const [sucursalId, setSucursalId] = useState<number | null>(sucursales[0]?.id ?? null);

  // `sucursales` siempre llega vacío en el primer render (se carga async vía
  // useComprasCatalogos) -- sin este efecto, sucursalId se queda en null para
  // siempre y el botón de abajo nunca se habilita, sin ningún error visible.
  useEffect(() => {
    if (sucursalId === null && sucursales.length > 0) {
      setSucursalId(sucursales[0].id);
    }
  }, [sucursales, sucursalId]);

  const claveValida = /^\d{49}$/.test(clave);

  return (
    <div className="max-w-xl mx-auto bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Buscar comprobante en el SRI</h2>

      <label className="block text-sm font-medium text-gray-700 mb-1">Clave de acceso (49 dígitos)</label>
      <input
        type="text"
        value={clave}
        onChange={(e) => setClave(e.target.value.replace(/\D/g, '').slice(0, 49))}
        className={`w-full border rounded px-3 py-2 font-mono text-sm ${
          clave.length > 0 && !claveValida ? 'border-red-400' : 'border-gray-300'
        }`}
        placeholder="49 dígitos de la factura del proveedor"
      />
      <p className="text-xs text-gray-500 mt-1">{clave.length}/49 dígitos</p>

      <label className="block text-sm font-medium text-gray-700 mt-4 mb-1">Sucursal</label>
      <select
        value={sucursalId ?? ''}
        onChange={(e) => setSucursalId(Number(e.target.value))}
        className="w-full border border-gray-300 rounded px-3 py-2"
      >
        {sucursales.map((s) => (
          <option key={s.id} value={s.id}>{s.nombre}</option>
        ))}
      </select>
      {cargandoCatalogos && <p className="text-xs text-gray-500 mt-1">Cargando sucursales...</p>}

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      <button
        type="button"
        disabled={!claveValida || sucursalId === null || buscando || !!cargandoCatalogos}
        onClick={() => sucursalId !== null && onBuscar(clave, sucursalId)}
        className="mt-5 w-full bg-blue-600 text-white rounded px-4 py-2 font-medium disabled:opacity-50"
      >
        {buscando ? 'Buscando en el SRI...' : 'Buscar en SRI'}
      </button>
    </div>
  );
}
