import { CheckCircle2, SlidersHorizontal } from 'lucide-react';
import type { AjusteReceipt } from '../_types';
import { SummaryRow } from './AjustesShared';

interface Props {
  receipt: AjusteReceipt;
  onNuevoAjuste: () => void;
}

export default function StepReceipt({ receipt, onNuevoAjuste }: Props) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-green-50 border-b border-green-100 px-6 py-4 flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-800">Ajuste aplicado correctamente</p>
            <p className="text-xs text-green-600 mt-0.5">{receipt.fecha}</p>
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Comprobante de Ajuste</h3>
          <dl className="space-y-3 text-sm">
            <SummaryRow label="Realizado por">{receipt.usuario}</SummaryRow>
            <hr className="border-gray-100" />
            <SummaryRow label="Producto"><span className="font-medium">{receipt.productoNombre}</span></SummaryRow>
            <SummaryRow label="Código">{receipt.productoCodigo}</SummaryRow>
            <SummaryRow label="Sucursal">{receipt.sucursalNombre}</SummaryRow>
            <hr className="border-gray-100" />
            <SummaryRow label="Stock anterior">{receipt.stockAnterior} uds</SummaryRow>
            <SummaryRow label="Stock nuevo"><span className="font-bold">{receipt.stockNuevo} uds</span></SummaryRow>
            <div className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2">
              <dt className="font-medium text-gray-600">Movimiento</dt>
              <dd className={`font-bold ${receipt.tipo === 'ENTRADA' ? 'text-green-600' : 'text-red-600'}`}>
                {receipt.tipo === 'ENTRADA' ? '+' : ''}{receipt.diferencia.toFixed(2)} uds ({receipt.tipo})
              </dd>
            </div>
            <hr className="border-gray-100" />
            <div className="flex flex-col gap-1">
              <dt className="text-gray-500">Motivo</dt>
              <dd className="text-gray-900 bg-gray-50 rounded-lg px-3 py-2 break-words">{receipt.motivo}</dd>
            </div>
          </dl>
        </div>
      </div>

      <button type="button" onClick={onNuevoAjuste}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 min-h-[48px] transition-colors">
        <SlidersHorizontal className="w-4 h-4" /> Nuevo ajuste
      </button>
    </div>
  );
}
