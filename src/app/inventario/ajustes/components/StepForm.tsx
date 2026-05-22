import { ChevronLeft, ArrowRight } from 'lucide-react';
import type { ProductoConStock } from '../_types';
import { ContextoBadge, ErrorBanner } from './AjustesShared';

interface Props {
  selectedProduct: ProductoConStock;
  selectedSucursal: { id: number; nombre: string; currentStock: number };
  targetQty: string;
  setTargetQty: (v: string) => void;
  motivo: string;
  setMotivo: (v: string) => void;
  diff: number;
  formError: string;
  setFormError: (v: string) => void;
  onBack: () => void;
  onReview: () => void;
}

export default function StepForm({
  selectedProduct, selectedSucursal, targetQty, setTargetQty,
  motivo, setMotivo, diff, formError, setFormError, onBack, onReview,
}: Props) {
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack}
        className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 min-h-[44px] font-medium">
        <ChevronLeft className="w-4 h-4" /> Cambiar sucursal
      </button>

      <ContextoBadge product={selectedProduct} sucursal={selectedSucursal} />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cantidad correcta <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Ingresa cuántas unidades <strong>deben existir</strong> (no la diferencia).
          </p>
          <input type="number" step="0.01" min="0" autoFocus
            placeholder={`Ej: ${selectedSucursal.currentStock}`}
            className="w-full px-4 py-3 text-lg rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            value={targetQty}
            onChange={e => { setTargetQty(e.target.value); setFormError(''); }}
          />
          {targetQty !== '' && !isNaN(parseFloat(targetQty)) && (
            <p className={`text-sm mt-2 font-medium ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-400'}`}>
              {diff > 0 && `▲ Entrada de ${diff.toFixed(2)} unidades`}
              {diff < 0 && `▼ Salida de ${Math.abs(diff).toFixed(2)} unidades`}
              {diff === 0 && '— Sin diferencia con el stock actual'}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Motivo del ajuste <span className="text-red-500">*</span>
          </label>
          <textarea placeholder="Ej: Conteo físico corregido, merma por vencimiento, rotura..."
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none h-24"
            value={motivo} maxLength={255}
            onChange={e => { setMotivo(e.target.value); setFormError(''); }}
          />
          <p className="text-xs text-gray-400 text-right">{motivo.length}/255</p>
        </div>

        {formError && <ErrorBanner message={formError} />}

        <button type="button" onClick={onReview}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 transition-colors min-h-[48px]">
          Revisar ajuste <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
