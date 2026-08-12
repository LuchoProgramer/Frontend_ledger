'use client';

import { useEffect, useState } from 'react';
import { getApiClient } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import { lineaResuelta, type LineaEnEdicion } from '@/lib/hooks/useImportCompra';
import type { ImportAccion } from '@/lib/types/compras';

interface Props {
  linea: LineaEnEdicion;
  onCambiar: (codigo: string, cambios: Partial<LineaEnEdicion>) => void;
  onCrearNuevo: (codigo: string) => void;
}

function BuscadorCatalogo({ onElegir }: { onElegir: (id: number, nombre: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [termino, setTermino] = useState('');
  const [resultados, setResultados] = useState<{ id: number; nombre: string }[]>([]);
  const terminoDebounced = useDebounce(termino, 500);

  useEffect(() => {
    if (!terminoDebounced.trim()) {
      setResultados([]);
      return;
    }
    let cancelado = false;
    getApiClient().getProductos({ search: terminoDebounced, page_size: 8 })
      .then((res: any) => { if (!cancelado) setResultados(res.results || []); })
      .catch(() => { if (!cancelado) setResultados([]); });
    return () => { cancelado = true; };
  }, [terminoDebounced]);

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="text-xs text-blue-600 underline">
        Buscar en catálogo
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        type="text"
        placeholder="Buscar producto por nombre..."
        value={termino}
        onChange={(e) => setTermino(e.target.value)}
        className="border border-gray-300 rounded px-2 py-1 text-xs"
      />
      {resultados.length > 0 && (
        <ul className="border border-gray-200 rounded text-xs max-h-32 overflow-y-auto">
          {resultados.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onElegir(r.id, r.nombre)}
                className="w-full text-left px-2 py-1 hover:bg-blue-50"
              >
                {r.nombre}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ImportLineaRow({ linea, onCambiar, onCrearNuevo }: Props) {
  const resuelta = lineaResuelta(linea);

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
        ) : linea.accion === 'crear' && linea.nuevoProducto ? (
          <div className="flex items-center gap-2">
            <span className="text-green-700">Nuevo: {linea.nuevoProducto.nombre}</span>
            <button
              type="button"
              onClick={() => onCambiar(linea.codigo, { accion: null, nuevoProducto: null })}
              className="text-xs text-gray-500 underline"
            >
              Cambiar
            </button>
          </div>
        ) : linea.accion === 'omitir' ? (
          <div className="flex items-center gap-2">
            <span className="text-gray-500 italic">Omitida</span>
            <button
              type="button"
              onClick={() => onCambiar(linea.codigo, { accion: null })}
              className="text-xs text-gray-500 underline"
            >
              Deshacer
            </button>
          </div>
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
            <div className="flex gap-2 items-start">
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
              <BuscadorCatalogo
                onElegir={(id) => onCambiar(linea.codigo, { accion: 'mapear', productoIdSeleccionado: id })}
              />
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
