'use client';

import { useState } from 'react';
import { getApiClient } from '@/lib/api';
import { ClientData, CONSUMIDOR_FINAL } from '../types';
import { validarIdentificacion } from '../utils/validarIdentificacion';

const EMPTY_NEW_CLIENT: ClientData = {
  tipo_identificacion: '05', identificacion: '', razon_social: '', email: '', direccion: '', telefono: '',
};

export function usePOSClient() {
  const [selected, setSelected] = useState<ClientData>(CONSUMIDOR_FINAL);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ClientData[]>([]);
  const [searching, setSearching] = useState(false);
  const [newClientMode, setNewClientMode] = useState(false);
  const [newClientData, setNewClientData] = useState<ClientData>(EMPTY_NEW_CLIENT);
  const [saving, setSaving] = useState(false);

  const apiClient = getApiClient();

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (term.length < 3) return;
    setSearching(true);
    try {
      const res = await apiClient.getClientes({ search: term });
      setSearchResults(res.results || res.data || []);
    } catch (e) { console.error(e); }
    finally { setSearching(false); }
  };

  const handleSelect = (c: ClientData) => {
    const clienteReal = (c as any).data || (c as any).results || c;
    setSelected(clienteReal);
    setShowModal(false);
    setSearchTerm('');
    setSearchResults([]);
    setNewClientMode(false);
  };

  const handleSave = async () => {
    if (!newClientData.identificacion || !newClientData.razon_social || !newClientData.email) {
      alert('Complete los campos obligatorios (*)'); return;
    }
    const { valido, completo } = validarIdentificacion(newClientData.tipo_identificacion || '05', newClientData.identificacion);
    if (completo && !valido) { alert('La identificación ingresada no es válida.'); return; }
    try {
      setSaving(true);
      const res = await apiClient.crearCliente(newClientData);
      const clienteCreado = res.data || res;
      handleSelect(clienteCreado);
      alert(`Cliente creado y seleccionado: ${clienteCreado.razon_social}`);
    } catch (e: any) {
      const errorDetail = e.data ? JSON.stringify(e.data, null, 2) : e.message;
      alert(`Error al crear cliente (${e.status || 'N/A'}):\n${errorDetail}`);
    } finally { setSaving(false); }
  };

  const reset = () => setSelected(CONSUMIDOR_FINAL);

  return {
    selected, reset,
    showModal, setShowModal,
    searchTerm, searchResults, searching, handleSearch,
    newClientMode, setNewClientMode, newClientData, setNewClientData, saving, handleSave,
    handleSelect,
  };
}
