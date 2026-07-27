'use client';

import type { LineaEnEdicion } from '@/lib/hooks/useImportCompra';
import ImportLineaRow from './ImportLineaRow';

interface Props {
  lineas: LineaEnEdicion[];
  totalResuelto: number;
  totalXML: number;
  puedeConfirmar: boolean;
  confirmando: boolean;
  onCambiarLinea: (codigo: string, cambios: Partial<LineaEnEdicion>) => void;
  onCrearNuevo: (codigo: string) => void;
  onConfirmar: () => void;
}

export default function ImportMapeoTable({
  lineas, totalResuelto, totalXML, puedeConfirmar, confirmando,
  onCambiarLinea, onCrearNuevo, onConfirmar,
}: Props) {
  const resueltas = lineas.filter((l) =>
    l.accion === 'omitir'
    || (l.accion === 'mapear' && l.productoIdSeleccionado !== null)
    || (l.accion === 'crear' && !!l.nuevoProducto)
  ).length;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr className="text-left text-xs font-medium text-gray-500 uppercase">
            <th className="px-3 py-2">Código</th>
            <th className="px-3 py-2">Descripción</th>
            <th className="px-3 py-2">Cantidad</th>
            <th className="px-3 py-2">Resolución</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {lineas.map((l) => (
            <ImportLineaRow key={l.codigo} linea={l} onCambiar={onCambiarLinea} onCrearNuevo={onCrearNuevo} />
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-between items-center text-sm">
        <span className={totalResuelto === totalXML ? 'text-green-700' : 'text-red-600'}>
          Total: ${totalResuelto.toFixed(2)} / XML: ${totalXML.toFixed(2)}
        </span>
        <span className="text-gray-500">{resueltas} / {lineas.length} resueltas</span>
      </div>

      <button
        type="button"
        disabled={!puedeConfirmar || confirmando}
        onClick={onConfirmar}
        className="mt-4 w-full bg-green-600 text-white rounded px-4 py-2 font-medium disabled:opacity-50"
      >
        {confirmando ? 'Registrando...' : 'Registrar compra'}
      </button>
    </div>
  );
}
