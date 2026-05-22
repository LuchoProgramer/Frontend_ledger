'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getApiClient } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import { useInventarioData } from './hooks/useInventarioData';
import { useTransferencia } from './hooks/useTransferencia';
import InventarioTable from './components/InventarioTable';
import TransferenciaModal from './components/TransferenciaModal';
import UploadModal from './components/UploadModal';

export default function InventarioPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [showUpload, setShowUpload] = useState(false);
  const [uploadSaving, setUploadSaving] = useState(false);

  const data = useInventarioData();
  const transferencia = useTransferencia({
    onSuccess: data.loadData,
    onError: data.setError,
    onSuccessMessage: data.setSuccessMessage,
  });

  useEffect(() => {
    if (!authLoading) {
      if (!user) router.push('/login');
      else if (user.groups?.includes('Vendedor') && !user.is_superuser && !user.is_staff) router.push('/');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) data.loadData();
  }, [user, data.loadData]);

  const handleDownloadTemplate = async () => {
    try {
      const blob = await getApiClient().downloadPlantillaInventario();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'plantilla_inventario.xlsx'; a.click();
    } catch { data.setError('Error descargando plantilla'); }
  };

  const handleUploadSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem('file') as HTMLInputElement;
    const sucursalSelect = form.elements.namedItem('sucursal_id') as HTMLSelectElement;
    if (!fileInput.files?.length) { data.setError('Seleccione un archivo'); return; }
    setUploadSaving(true);
    try {
      const res = await getApiClient().uploadInventario(fileInput.files[0], Number(sucursalSelect.value));
      if (res.success) { data.setSuccessMessage(res.message); setShowUpload(false); data.loadData(); }
      else data.setError(`Error: ${res.errors.join(', ')}`);
    } catch (err: any) {
      data.setError(err.message || 'Error en carga masiva');
    } finally {
      setUploadSaving(false);
    }
  };

  const canManage = user?.is_superuser || user?.is_staff
    || user?.groups?.includes('Administrador') || user?.groups?.includes('Bodeguero');

  if (authLoading || (data.loading && data.inventario.length === 0 && data.sucursales.length === 0)) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="md:flex md:items-center md:justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Gestión de Inventario</h2>
          {canManage && (
            <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
              <button type="button" onClick={() => setShowUpload(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                Importar Excel
              </button>
              <button type="button" onClick={() => transferencia.setShow(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                Transferir Stock
              </button>
              <Link href="/inventario/ajustes"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
                Nuevo Ajuste
              </Link>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">Buscar Producto</label>
            <input type="text" placeholder="Nombre o código..."
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={data.searchTerm} onChange={e => data.setSearchTerm(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Sucursal</label>
            <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={data.selectedSucursal || ''}
              onChange={e => data.setSelectedSucursal(e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">Todas</option>
              {data.sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
        </div>

        {/* Alerts */}
        {data.error && <div className="rounded-md bg-red-50 p-4 mb-6"><p className="text-sm font-medium text-red-800">{data.error}</p></div>}
        {data.successMessage && <div className="rounded-md bg-green-50 p-4 mb-6"><p className="text-sm font-medium text-green-800">{data.successMessage}</p></div>}

        <InventarioTable
          inventario={data.inventario}
          viewMode={data.viewMode}
          expandedItems={data.expandedItems}
          onToggleExpand={data.toggleExpand}
        />

        <TransferenciaModal
          show={transferencia.show}
          onClose={() => transferencia.setShow(false)}
          form={transferencia.form}
          setForm={transferencia.setForm}
          saving={transferencia.saving}
          onSubmit={transferencia.handleSubmit}
          productos={data.productos}
          sucursales={data.sucursales}
        />

        <UploadModal
          show={showUpload}
          onClose={() => setShowUpload(false)}
          saving={uploadSaving}
          onSubmit={handleUploadSubmit}
          onDownloadTemplate={handleDownloadTemplate}
          sucursales={data.sucursales}
          selectedSucursal={data.selectedSucursal}
        />

      </div>
    </DashboardLayout>
  );
}
