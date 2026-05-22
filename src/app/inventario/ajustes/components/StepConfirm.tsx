import { ChevronLeft, AlertCircle } from 'lucide-react';
import type { ProductoConStock } from '../_types';
import { ErrorBanner, SummaryRow } from './AjustesShared';

interface Props {
  selectedProduct: ProductoConStock;
  selectedSucursal: { id: number; nombre: string; currentStock: number };
  targetQtyNum: number;
  diff: number;
  motivo: string;
  formError: string;
  submitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}

export default function StepConfirm({
  selectedProduct, selectedSucursal, targetQtyNum, diff, motivo,
  formError, submitting, onBack, onSubmit,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
          Confirma el ajuste
        </h2>

        <dl className="space-y-3 text-sm">
          <SummaryRow label="Producto">
            {selectedProduct.nombre}{' '}
            <span className="text-gray-400">({selectedProduct.codigo_producto})</span>
          </SummaryRow>
          <SummaryRow label="Sucursal">{selectedSucursal.nombre}</SummaryRow>
          <hr className="border-gray-100" />
          <SummaryRow label="Stock actual">{selectedSucursal.currentStock} uds</SummaryRow>
          <SummaryRow label="Nuevo stock"><span className="font-bold">{targetQtyNum} uds</span></SummaryRow>
          <div className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2">
            <dt className="font-medium text-gray-600">Movimiento</dt>
            <dd className={`font-bold ${diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} uds ({diff > 0 ? 'ENTRADA' : 'SALIDA'})
            </dd>
          </div>
          <hr className="border-gray-100" />
          <div className="flex flex-col gap-1">
            <dt className="text-gray-500">Motivo</dt>
            <dd className="text-gray-900 bg-gray-50 rounded-lg px-3 py-2 break-words">{motivo}</dd>
          </div>
        </dl>
      </div>

      {formError && <ErrorBanner message={formError} />}

      <div className="flex flex-col sm:flex-row gap-3">
        <button type="button" onClick={onBack}
          className="flex-1 flex items-center justify-center gap-1 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 min-h-[48px] transition-colors">
          <ChevronLeft className="w-4 h-4" /> Editar
        </button>
        <button type="button" onClick={onSubmit} disabled={submitting}
          className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-60 min-h-[48px] transition-colors">
          {submitting ? 'Aplicando...' : 'Aplicar ajuste'}
        </button>
      </div>
    </div>
  );
}
