'use client';

import { RefObject } from 'react';
import { Producto, Categoria } from '@/lib/types/productos';
import { ComboResult } from '../types';

interface Props {
  searchTerm: string;
  onSearch: (term: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  productos: Producto[];
  loadingProducts: boolean;
  categorias: Categoria[];
  selectedCategoria: number | null;
  showCategoryDrawer: boolean;
  setShowCategoryDrawer: (v: boolean) => void;
  onSelectCategoria: (id: number | null) => void;
  combos: ComboResult[];
  onAddToCart: (producto: Producto) => void;
  onAddCombo: (combo: ComboResult) => void;
  showToast: (msg: string) => void;
  isOffline?: boolean;
  needsRefresh?: boolean;
  updateSW?: () => void;
}

export default function POSProductGrid({
  searchTerm, onSearch, searchInputRef,
  productos, loadingProducts,
  categorias, selectedCategoria, showCategoryDrawer, setShowCategoryDrawer, onSelectCategoria,
  combos, onAddToCart, onAddCombo, showToast,
  isOffline = false,
  needsRefresh = false,
  updateSW,
}: Props) {
  return (
    <div className="flex-1 flex flex-col p-4 bg-gray-50 overflow-hidden">
      {isOffline && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center gap-2 shrink-0 mb-4 rounded-lg">
          <span className="text-yellow-600 text-sm font-semibold">⚠ Sin conexión — mostrando catálogo local</span>
        </div>
      )}
      {needsRefresh && (
        <div className="bg-indigo-600 text-white text-sm px-4 py-2 flex items-center justify-between shrink-0 mb-2 rounded-lg">
          <span>Nueva versión disponible</span>
          <button
            onClick={updateSW}
            className="font-bold underline ml-4 hover:text-indigo-200 transition-colors"
          >
            Actualizar
          </button>
        </div>
      )}
      {/* Search + category button (mobile/tablet) */}
      <div className="mb-4 flex gap-2">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Buscar producto (Código o Nombre) - F2"
          className="flex-1 p-3 border rounded-lg shadow-sm text-lg focus:ring-2 focus:ring-blue-500 outline-none"
          value={searchTerm}
          onChange={e => onSearch(e.target.value)}
        />
        {categorias.length > 0 && (
          <button
            type="button"
            onClick={() => setShowCategoryDrawer(true)}
            className={`lg:hidden shrink-0 flex flex-col items-center justify-center gap-0.5 px-3 min-h-[52px] rounded-lg border text-sm font-medium transition-colors ${
              selectedCategoria !== null ? 'bg-[#4F46E5] text-white border-[#4F46E5]' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            <span className="text-xs leading-none">
              {selectedCategoria !== null ? (categorias.find(c => c.id === selectedCategoria)?.nombre ?? 'Cat.') : 'Cats.'}
            </span>
          </button>
        )}
      </div>

      {/* Category chips — desktop */}
      {categorias.length > 0 && (
        <div className="hidden lg:flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          <button
            type="button"
            onClick={() => onSelectCategoria(null)}
            className={`shrink-0 px-4 min-h-[48px] rounded-full text-sm font-medium border transition-colors ${
              selectedCategoria === null ? 'bg-[#4F46E5] text-white border-[#4F46E5]' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Todos
          </button>
          {categorias.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategoria(cat.id)}
              className={`shrink-0 px-4 min-h-[48px] rounded-full text-sm font-medium border transition-colors ${
                selectedCategoria === cat.id ? 'bg-[#4F46E5] text-white border-[#4F46E5]' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {cat.nombre}
            </button>
          ))}
        </div>
      )}

      {/* Combos */}
      {combos.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2 px-1">Combos</p>
          <div className="grid grid-cols-2 gap-2">
            {combos.map(combo => (
              <button
                key={`combo-${combo.id}`}
                onClick={() => onAddCombo(combo)}
                className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 text-left hover:border-amber-400 transition-colors"
              >
                <p className="text-sm font-semibold text-gray-900 truncate">{combo.nombre}</p>
                <p className="text-xs text-amber-700 font-bold mt-1">${combo.precio.toFixed(2)}</p>
                {combo.slots.length > 0 && <p className="text-xs text-gray-400 mt-0.5">{combo.slots.length} opción(es)</p>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 content-start pb-20">
        {loadingProducts ? (
          <div className="col-span-full text-center py-10">Cargando productos...</div>
        ) : productos.map(prod => {
          const stock = prod.stock ?? 0;
          const hasStock = stock > 0;
          const precio = (prod as any).precio_default != null ? `$${Number((prod as any).precio_default).toFixed(2)}` : '$ -';
          return (
            <div
              key={prod.id}
              onClick={() => { if (hasStock) { onAddToCart(prod); showToast(`Agregado: ${prod.nombre}`); } }}
              className={`relative rounded-xl shadow-sm transition-all flex flex-col justify-between border active:scale-95 duration-75 min-h-[100px] p-3 ${
                hasStock ? 'bg-white hover:shadow-md cursor-pointer border-gray-100 hover:border-blue-300 hover:bg-blue-50' : 'bg-gray-100 cursor-not-allowed border-gray-200 opacity-60'
              }`}
            >
              {!hasStock && (
                <div className="absolute top-2 right-2 bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full z-10">AGOTADO</div>
              )}
              <h3 className="font-semibold text-gray-900 text-sm leading-snug break-words line-clamp-3">{prod.nombre}</h3>
              <div className="mt-2 flex items-end justify-end">
                <span className="text-base font-bold text-blue-600">{precio}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Category Bottom Sheet — mobile/tablet */}
      {showCategoryDrawer && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCategoryDrawer(false)} />
          <div className="relative bg-white rounded-t-2xl shadow-2xl p-5 pb-8">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 text-base">Categorías</h3>
              {selectedCategoria !== null && (
                <button type="button" onClick={() => onSelectCategoria(null)} className="text-sm text-[#4F46E5] font-medium">
                  Limpiar filtro
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onSelectCategoria(null)}
                className={`px-4 min-h-[44px] rounded-full text-sm font-medium border transition-colors ${
                  selectedCategoria === null ? 'bg-[#4F46E5] text-white border-[#4F46E5]' : 'bg-gray-100 text-gray-700 border-transparent hover:bg-gray-200'
                }`}
              >
                Todos
              </button>
              {categorias.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onSelectCategoria(cat.id)}
                  className={`px-4 min-h-[44px] rounded-full text-sm font-medium border transition-colors ${
                    selectedCategoria === cat.id ? 'bg-[#4F46E5] text-white border-[#4F46E5]' : 'bg-gray-100 text-gray-700 border-transparent hover:bg-gray-200'
                  }`}
                >
                  {cat.nombre}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
