'use client';

import { useState } from 'react';
import type { Categoria } from '@/lib/types/catalogos';
import type { Impuesto } from '@/lib/types/catalogos';

interface Props {
  categorias: Categoria[];
  impuestos: Impuesto[];
  onGuardar: (nuevo: { nombre: string; categoria_id: number | null; impuesto_id: number | null; precio_venta: number; activo: boolean }) => void;
  onCancelar: () => void;
}

export default function CrearProductoInline({ categorias, impuestos, onGuardar, onCancelar }: Props) {
  const [nombre, setNombre] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | null>(categorias[0]?.id ?? null);
  const [impuestoId, setImpuestoId] = useState<number | null>(impuestos[0]?.id ?? null);
  const [precioVenta, setPrecioVenta] = useState<number>(0);
  const [noSeVende, setNoSeVende] = useState(false);

  const valido = nombre.trim().length > 0 && precioVenta > 0;

  return (
    <div className="border border-blue-200 rounded p-3 bg-blue-50 flex flex-col gap-2">
      <input
        type="text"
        placeholder="Nombre del producto"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        className="border border-gray-300 rounded px-2 py-1 text-sm"
      />
      <select
        value={categoriaId ?? ''}
        onChange={(e) => setCategoriaId(Number(e.target.value) || null)}
        className="border border-gray-300 rounded px-2 py-1 text-sm"
      >
        {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
      </select>
      <select
        value={impuestoId ?? ''}
        onChange={(e) => setImpuestoId(Number(e.target.value) || null)}
        className="border border-gray-300 rounded px-2 py-1 text-sm"
      >
        {impuestos.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
      </select>
      <input
        type="number"
        step="0.01"
        min={0}
        placeholder="Precio de venta"
        value={precioVenta || ''}
        onChange={(e) => setPrecioVenta(Number(e.target.value))}
        className="border border-gray-300 rounded px-2 py-1 text-sm"
      />
      <label className="flex items-center gap-2 text-xs text-gray-700">
        <input
          type="checkbox"
          checked={noSeVende}
          onChange={(e) => setNoSeVende(e.target.checked)}
        />
        No se vende (uso interno) — no aparecerá en el POS ni en el catálogo
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!valido}
          onClick={() => onGuardar({
            nombre, categoria_id: categoriaId, impuesto_id: impuestoId,
            precio_venta: precioVenta, activo: !noSeVende,
          })}
          className="text-xs bg-blue-600 text-white rounded px-2 py-1 disabled:opacity-50"
        >
          Guardar
        </button>
        <button type="button" onClick={onCancelar} className="text-xs text-gray-500 underline">
          Cancelar
        </button>
      </div>
    </div>
  );
}
