'use client';

import { CartItem, ClientData } from '../types';

interface Props {
  items: CartItem[];
  totals: { subtotal: number; total: number; impuesto: number };
  client: ClientData;
  onOpenClientModal: () => void;
  onCartItemClick: (idx: number, item: CartItem) => void;
  onUpdateQuantity: (idx: number, qty: number) => void;
  onRemoveFromCart: (idx: number) => void;
  onOpenPayment: () => void;
  procesando: boolean;
}

export default function POSCart({
  items, totals, client,
  onOpenClientModal, onCartItemClick, onUpdateQuantity, onRemoveFromCart,
  onOpenPayment, procesando,
}: Props) {
  return (
    <div className="w-full flex flex-col bg-white shadow-xl">
      {/* Client header */}
      <div className="p-4 border-b bg-gray-50">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cliente (F10)</label>
        <div className="flex items-center justify-between mt-1">
          <div>
            <div className="font-bold text-gray-800">{client.razon_social}</div>
            <div className="text-sm text-gray-500">{client.identificacion}</div>
          </div>
          <button onClick={onOpenClientModal} className="text-blue-600 hover:bg-blue-50 p-2 rounded text-sm font-semibold">
            Cambiar
          </button>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {items.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center p-4">
            <span className="block text-4xl mb-2">🛒</span>
            <span>Carrito vacío</span>
          </div>
        )}
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-transparent hover:border-blue-200 hover:bg-blue-50 transition-colors">
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onCartItemClick(idx, item)} title="Toca para cambiar presentación">
              <p className="text-sm font-medium text-gray-900 truncate">{item.isCombo ? item.comboNombre : item.producto.nombre}</p>
              {item.isCombo && item.slotSelections && item.slotSelections.length > 0 && (
                <p className="text-xs text-gray-400 truncate">{item.slotSelections.map(s => s.producto_nombre).join(', ')}</p>
              )}
              {!item.isCombo && <div className="text-xs text-gray-500">{item.presentacion.nombre_presentacion}</div>}
              <div className="text-xs text-gray-400">${item.precio.toFixed(2)} c/u</div>
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => onUpdateQuantity(idx, item.cantidad - 1)}
                disabled={item.cantidad <= 1}
                className="min-w-[40px] min-h-[44px] flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-40 text-xl font-bold transition-colors"
              >−</button>
              <input
                type="text" inputMode="numeric" pattern="[0-9]*"
                value={String(item.cantidad)}
                onFocus={e => e.target.select()}
                onChange={e => { const v = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10); if (!isNaN(v) && v >= 1) onUpdateQuantity(idx, v); }}
                className="w-10 min-h-[44px] text-center font-bold text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              />
              <button
                type="button"
                onClick={() => onUpdateQuantity(idx, item.cantidad + 1)}
                className="min-w-[40px] min-h-[44px] flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200 text-xl font-bold transition-colors"
              >+</button>
            </div>

            {/* Total + remove */}
            <div className="text-right shrink-0 min-w-[52px]">
              <div className="font-bold text-gray-800">${item.total.toFixed(2)}</div>
              <button type="button" onClick={() => onRemoveFromCart(idx)} className="text-red-400 hover:text-red-600 text-xs mt-1 p-1">
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex justify-between text-sm text-gray-600 mb-1"><span>Subtotal</span><span>${totals.subtotal.toFixed(2)}</span></div>
        <div className="flex justify-between text-sm text-gray-600 mb-3"><span>IVA</span><span>${totals.impuesto.toFixed(2)}</span></div>
        <div className="flex justify-between text-2xl font-bold text-gray-800 mb-4"><span>Total</span><span>${totals.total.toFixed(2)}</span></div>
        <button
          onClick={onOpenPayment}
          disabled={items.length === 0 || procesando}
          className="w-full bg-blue-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-200"
        >
          {procesando ? 'Procesando...' : 'COBRAR (F9)'}
        </button>
      </div>
    </div>
  );
}
