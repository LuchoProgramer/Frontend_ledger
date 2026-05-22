import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ProductoConStock } from '../_types';
import { ProductoBadge } from './AjustesShared';

interface Props {
  selectedProduct: ProductoConStock;
  sucursalesConStock: { id: number; nombre: string; currentStock: number }[];
  onBack: () => void;
  onSelectSucursal: (id: number, nombre: string, currentStock: number) => void;
}

export default function StepSucursal({ selectedProduct, sucursalesConStock, onBack, onSelectSucursal }: Props) {
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack}
        className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 min-h-[44px] font-medium">
        <ChevronLeft className="w-4 h-4" /> Cambiar producto
      </button>

      <ProductoBadge product={selectedProduct} />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">¿En qué sucursal vas a ajustar?</h2>
        {sucursalesConStock.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">Cargando sucursales...</p>
        ) : (
          <ul className="divide-y divide-gray-100 -mx-2">
            {sucursalesConStock.map(s => (
              <li key={s.id}>
                <button type="button" onClick={() => onSelectSucursal(s.id, s.nombre, s.currentStock)}
                  className="w-full flex items-center justify-between px-4 py-3 min-h-[56px] rounded-lg hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-500 text-left transition-colors">
                  <span className="font-medium text-gray-900 text-sm">{s.nombre}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-sm font-medium ${s.currentStock === 0 ? 'text-gray-400' : 'text-gray-700'}`}>
                      {s.currentStock} uds
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
