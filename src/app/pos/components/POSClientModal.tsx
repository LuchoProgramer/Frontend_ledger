'use client';

import PortalModal from '@/components/ui/PortalModal';
import { ClientData, CONSUMIDOR_FINAL } from '../types';
import { validarIdentificacion } from '../utils/validarIdentificacion';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  searchTerm: string;
  searchResults: ClientData[];
  searching: boolean;
  onSearch: (term: string) => void;
  onSelect: (c: ClientData) => void;
  newClientMode: boolean;
  setNewClientMode: (v: boolean) => void;
  newClientData: ClientData;
  setNewClientData: (d: ClientData) => void;
  saving: boolean;
  onSave: () => void;
}

export default function POSClientModal({
  isOpen, onClose,
  searchTerm, searchResults, searching, onSearch, onSelect,
  newClientMode, setNewClientMode, newClientData, setNewClientData, saving, onSave,
}: Props) {
  const { valido, completo } = validarIdentificacion(
    newClientData.tipo_identificacion || '05',
    newClientData.identificacion
  );
  const borderClass = !completo
    ? 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
    : valido
      ? 'border-green-500 focus:border-green-500 focus:ring-green-500'
      : 'border-red-500 focus:border-red-500 focus:ring-red-500';

  return (
    <PortalModal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white w-full max-w-2xl mx-auto rounded-lg shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">{newClientMode ? 'Nuevo Cliente' : 'Buscar Cliente'}</h3>
          {!newClientMode && (
            <button onClick={() => setNewClientMode(true)} className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 font-medium">
              + Crear Nuevo
            </button>
          )}
          {newClientMode && (
            <button onClick={() => setNewClientMode(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
          )}
        </div>

        <div className="p-6">
          {newClientMode ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipo Identificación *</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    value={newClientData.tipo_identificacion}
                    onChange={e => setNewClientData({ ...newClientData, tipo_identificacion: e.target.value })}
                  >
                    <option value="05">Cédula</option>
                    <option value="04">RUC</option>
                    <option value="06">Pasaporte</option>
                    <option value="07">Consumidor Final</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Identificación *</label>
                  <input
                    autoFocus type="text"
                    className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm p-2 border ${borderClass}`}
                    value={newClientData.identificacion}
                    onChange={e => setNewClientData({ ...newClientData, identificacion: e.target.value })}
                  />
                  {completo && !valido && <p className="mt-1 text-xs text-red-600">Identificación inválida</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre y Apellido *</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    value={newClientData.razon_social}
                    onChange={e => setNewClientData({ ...newClientData, razon_social: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email * (Para Factura Electrónica)</label>
                <input
                  type="email"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  value={newClientData.email}
                  onChange={e => setNewClientData({ ...newClientData, email: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    value={newClientData.telefono || ''}
                    onChange={e => setNewClientData({ ...newClientData, telefono: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Dirección</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    value={newClientData.direccion}
                    onChange={e => setNewClientData({ ...newClientData, direccion: e.target.value })}
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button onClick={() => setNewClientMode(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Volver
                </button>
                <button onClick={onSave} disabled={saving} className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Guardar y Seleccionar'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                autoFocus type="text"
                className="w-full p-3 border rounded-lg shadow-sm text-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Escribe cédula, RUC o nombre..."
                value={searchTerm}
                onChange={e => onSearch(e.target.value)}
              />
              <div className="max-h-60 overflow-y-auto border rounded-md">
                {searching && <div className="p-4 text-center text-gray-500">Buscando...</div>}
                {!searching && searchResults.length === 0 && searchTerm.length > 2 && (
                  <div className="p-4 text-center text-gray-500">
                    No se encontraron clientes.
                    <button
                      onClick={() => { setNewClientData({ ...newClientData, identificacion: searchTerm }); setNewClientMode(true); }}
                      className="text-blue-600 font-bold ml-1 hover:underline"
                    >
                      Crear nuevo
                    </button>
                  </div>
                )}
                {searchResults.map(c => (
                  <div key={c.id} onClick={() => onSelect(c)} className="p-3 hover:bg-indigo-50 cursor-pointer border-b last:border-b-0 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-gray-800">{c.razon_social}</div>
                      <div className="text-sm text-gray-500">{c.identificacion} • {c.email}</div>
                    </div>
                    <span className="text-indigo-600 text-sm font-medium">Seleccionar</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-2">
                <button onClick={() => onSelect(CONSUMIDOR_FINAL)} className="text-sm text-gray-500 hover:text-gray-700 underline">
                  Usar Consumidor Final
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PortalModal>
  );
}
