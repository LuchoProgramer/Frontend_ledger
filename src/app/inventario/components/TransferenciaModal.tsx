'use client';

import PortalModal from '@/components/ui/PortalModal';
import type { Sucursal } from '@/lib/types/sucursales';
import type { Producto } from '@/lib/types/productos';

interface TransferenciaForm {
  producto_id: number;
  origen_id: number;
  destino_id: number;
  cantidad: string;
  generar_guia: boolean;
  transportista_ruc: string;
  transportista_razon_social: string;
  transportista_placa: string;
}

interface Props {
  show: boolean;
  onClose: () => void;
  form: TransferenciaForm;
  setForm: (f: TransferenciaForm) => void;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
  productos: Producto[];
  sucursales: Sucursal[];
}

export default function TransferenciaModal({ show, onClose, form, setForm, saving, onSubmit, productos, sucursales }: Props) {
  const update = (patch: Partial<TransferenciaForm>) => setForm({ ...form, ...patch });

  return (
    <PortalModal isOpen={show} onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Transferencia entre Sucursales</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Producto</label>
              <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={form.producto_id} onChange={e => update({ producto_id: Number(e.target.value) })}>
                <option value={0}>Seleccione Producto</option>
                {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {(['origen_id', 'destino_id'] as const).map((field) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700">{field === 'origen_id' ? 'Origen' : 'Destino'}</label>
                  <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    value={form[field]} onChange={e => update({ [field]: Number(e.target.value) } as any)}>
                    <option value={0}>Seleccione {field === 'origen_id' ? 'Origen' : 'Destino'}</option>
                    {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Cantidad</label>
              <input type="number" step="0.01" required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={form.cantidad} onChange={e => update({ cantidad: e.target.value })} />
            </div>

            <div className="pt-4 border-t border-gray-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  checked={form.generar_guia} onChange={e => update({ generar_guia: e.target.checked })} />
                <span className="text-sm text-gray-900">Generar Guía de Remisión (SRI)</span>
              </label>

              {form.generar_guia && (
                <div className="mt-4 space-y-3 bg-gray-50 p-3 rounded-md">
                  <h4 className="text-sm font-medium text-gray-900">Datos Transportista</h4>
                  {[
                    { label: 'RUC Transp.', field: 'transportista_ruc' as const, placeholder: '17...', maxLength: 13 },
                    { label: 'Razón Social', field: 'transportista_razon_social' as const, placeholder: '' },
                    { label: 'Placa (Opcional)', field: 'transportista_placa' as const, placeholder: 'ABC-1234' },
                  ].map(({ label, field, placeholder, maxLength }) => (
                    <div key={field}>
                      <label className="block text-xs font-medium text-gray-700">{label}</label>
                      <input type="text" maxLength={maxLength}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        value={form[field]} placeholder={placeholder} onChange={e => update({ [field]: e.target.value } as any)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-4 py-3 sm:px-6 flex flex-row-reverse gap-3">
          <button type="submit" disabled={saving}
            className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Procesando...' : 'Transferir Stock'}
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
