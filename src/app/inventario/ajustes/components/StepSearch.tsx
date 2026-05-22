import { Search, Package, ChevronRight } from 'lucide-react';
import type { ProductoConStock } from '../_types';

interface Props {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  debouncedSearch: string;
  searching: boolean;
  searchResults: ProductoConStock[];
  onSelectProduct: (p: ProductoConStock) => void;
}

export default function StepSearch({ searchTerm, setSearchTerm, debouncedSearch, searching, searchResults, onSelectProduct }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-4">¿Qué producto deseas ajustar?</h2>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        <input
          type="search" autoFocus
          placeholder="Busca por nombre o código..."
          className="w-full pl-10 pr-4 py-3 text-base rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {searching && <p className="text-center py-6 text-gray-400 text-sm">Buscando...</p>}

      {!searching && debouncedSearch.trim().length >= 2 && searchResults.length === 0 && (
        <p className="text-center py-6 text-gray-400 text-sm">Sin resultados para &quot;{debouncedSearch}&quot;</p>
      )}

      {!searching && searchResults.length > 0 && (
        <ul className="divide-y divide-gray-100 -mx-2">
          {searchResults.map(p => (
            <li key={p.id}>
              <button type="button" onClick={() => onSelectProduct(p)}
                className="w-full flex items-center justify-between px-4 py-3 min-h-[56px] rounded-lg hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-500 text-left transition-colors">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{p.nombre}</p>
                    <p className="text-xs text-gray-500">{p.codigo_producto}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="text-sm text-gray-600">{p.stock_total_global} uds</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {debouncedSearch.trim().length < 2 && (
        <p className="text-sm text-gray-400 text-center py-4">Escribe al menos 2 caracteres para buscar</p>
      )}
    </div>
  );
}
