'use client';

import { useState } from 'react';

interface Props {
  onImportar: (claveAcceso: string) => Promise<void>;
  onClose: () => void;
}

export default function ImportarRetencionModal({ onImportar, onClose }: Props) {
  const [clave, setClave] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImportar = async () => {
    if (!/^\d{49}$/.test(clave)) {
      setError('La clave de acceso debe tener 49 dígitos.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onImportar(clave);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al importar la retención');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Importar retención por clave de acceso</h2>
        <input
          type="text"
          value={clave}
          onChange={(e) => setClave(e.target.value.trim())}
          placeholder="49 dígitos de la clave de acceso"
          maxLength={49}
          className="w-full border rounded-lg px-3 py-2 mb-3 font-mono text-sm"
        />
        {error && <div className="mb-3 p-2 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-600" disabled={loading}>Cancelar</button>
          <button
            onClick={handleImportar}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50"
          >
            {loading ? 'Importando...' : 'Importar'}
          </button>
        </div>
      </div>
    </div>
  );
}
