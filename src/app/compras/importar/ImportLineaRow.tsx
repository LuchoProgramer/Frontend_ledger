'use client';

import type { LineaEnEdicion } from '@/lib/hooks/useImportCompra';
import type { ImportAccion } from '@/lib/types/compras';

interface Props {
  linea: LineaEnEdicion;
  onCambiar: (codigo: string, cambios: Partial<LineaEnEdicion>) => void;
  onCrearNuevo: (codigo: string) => void;
}

export default function ImportLineaRow({ linea, onCambiar, onCrearNuevo }: Props) {
  const resuelta = linea.accion === 'omitir'
    || (linea.accion === 'mapear' && linea.productoIdSeleccionado !== null)
    || (linea.accion === 'crear' && !!linea.nuevoProducto);

  return (
    <tr className={resuelta ? 'bg-green-50' : 'bg-yellow-50'}>
      <td className="px-3 py-2 text-sm font-mono">{linea.codigo}</td>
      <td className="px-3 py-2 text-sm">{linea.descripcion}</td>
      <td className="px-3 py-2 text-sm">
        <input
          type="number"
          min={0.01}
          step="any"
          value={linea.cantidadResuelta}
          onChange={(e) => onCambiar(linea.codigo, { cantidadResuelta: Number(e.target.value) })}
          className="w-24 border border-gray-300 rounded px-2 py-1 text-sm"
        />
        {Number(linea.factor_empaque) > 1 && (
          <p className="text-xs text-gray-500">
            {linea.cantidad_xml} paq × {linea.factor_empaque} = {linea.cantidadResuelta}
          </p>
        )}
      </td>
      <td className="px-3 py-2 text-sm">
        {linea.estado === 'ok' && linea.producto_sugerido ? (
          <span className="text-green-700">{linea.producto_sugerido.nombre}</span>
        ) : (
          <div className="flex flex-col gap-1">
            <select
              value={linea.productoIdSeleccionado ?? ''}
              onChange={(e) => onCambiar(linea.codigo, {
                accion: 'mapear', productoIdSeleccionado: Number(e.target.value) || null,
              })}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="">Elegir producto existente...</option>
              {linea.candidatos.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onCrearNuevo(linea.codigo)}
                className="text-xs text-blue-600 underline"
              >
                Crear nuevo
              </button>
              <button
                type="button"
                onClick={() => onCambiar(linea.codigo, { accion: 'omitir' })}
                className="text-xs text-gray-500 underline"
              >
                Omitir
              </button>
            </div>
          </div>
        )}
      </td>
      <td className="px-3 py-2 text-sm">
        <label className="flex items-center gap-1 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={linea.guardarCodigo}
            onChange={(e) => onCambiar(linea.codigo, { guardarCodigo: e.target.checked })}
          />
          recordar
        </label>
      </td>
    </tr>
  );
}
