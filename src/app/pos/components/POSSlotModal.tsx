'use client';

import { ComboResult, SlotOpcion } from '../types';

interface Props {
  show: boolean;
  pendingCombo: ComboResult | null;
  slotOpciones: Record<number, SlotOpcion[]>;
  slotSelections: Record<number, SlotOpcion>;
  setSlotSelections: (fn: (prev: Record<number, SlotOpcion>) => Record<number, SlotOpcion>) => void;
  loadingSlots: boolean;
  slotError: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function POSSlotModal({
  show, pendingCombo, slotOpciones, slotSelections, setSlotSelections,
  loadingSlots, slotError, onConfirm, onCancel,
}: Props) {
  if (!show || !pendingCombo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">{pendingCombo.nombre}</h3>
          <p className="text-sm text-gray-500">Personaliza tu combo</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loadingSlots ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin" />
            </div>
          ) : (
            pendingCombo.slots.map(slot => {
              const opciones = slotOpciones[slot.id] || [];
              const selected = slotSelections[slot.id];
              return (
                <div key={slot.id}>
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    {slot.nombre}
                    {slot.obligatorio
                      ? <span className="ml-1 text-red-500 text-xs">*obligatorio</span>
                      : <span className="ml-1 text-gray-400 text-xs">(opcional)</span>}
                  </p>
                  {opciones.length === 0 ? (
                    <p className="text-xs text-red-500 bg-red-50 p-2 rounded">Sin productos disponibles con stock para este slot.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {opciones.map(op => (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => setSlotSelections(prev => ({ ...prev, [slot.id]: op }))}
                          className={`px-3 py-2 rounded-lg border text-sm font-medium min-h-[40px] transition-colors ${
                            selected?.id === op.id ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                          }`}
                        >
                          {op.nombre}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
          {slotError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{slotError}</p>}
        </div>

        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 font-medium">
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loadingSlots || pendingCombo.slots.some(s => s.obligatorio && (slotOpciones[s.id] || []).length === 0)}
            className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50"
          >
            Agregar al carrito
          </button>
        </div>
      </div>
    </div>
  );
}
