'use client';

import PortalModal from '@/components/ui/PortalModal';
import type { Sucursal } from '@/lib/types/sucursales';

interface Props {
  show: boolean;
  onClose: () => void;
  saving: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onDownloadTemplate: () => void;
  sucursales: Sucursal[];
  selectedSucursal?: number;
}

export default function UploadModal({ show, onClose, saving, onSubmit, onDownloadTemplate, sucursales, selectedSucursal }: Props) {
  return (
    <PortalModal isOpen={show} onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Carga Masiva de Inventario</h3>
            <button type="button" onClick={onDownloadTemplate}
              className="text-sm text-indigo-600 hover:text-indigo-900 font-medium">
              Descargar Plantilla
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Sucursal Destino</label>
              <select name="sucursal_id"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                defaultValue={selectedSucursal || sucursales[0]?.id}>
                {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
              <p className="mt-1 text-xs text-gray-500">El stock se ajustará para los productos en el archivo.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Archivo Excel (.xlsx)</label>
              <input type="file" name="file" accept=".xlsx, .xls, .csv" required
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-4 py-3 sm:px-6 flex flex-row-reverse gap-3">
          <button type="submit" disabled={saving}
            className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Procesando...' : 'Cargar Inventario'}
          </button>
          <button type="button" onClick={onClose}
            className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
        </div>
      </form>
    </PortalModal>
  );
}
