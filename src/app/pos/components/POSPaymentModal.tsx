'use client';

import PortalModal from '@/components/ui/PortalModal';
import { Payment } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  totals: { subtotal: number; total: number; impuesto: number };
  payments: Payment[];
  paymentMethod: string;
  setPaymentMethod: (v: string) => void;
  paymentAmount: string;
  setPaymentAmount: (v: string) => void;
  esInterno: boolean;
  setEsInterno: (v: boolean) => void;
  totalPagado: number;
  procesando: boolean;
  onAddPayment: () => void;
  onRemovePayment: (idx: number) => void;
  onProcessSale: () => void;
}

export default function POSPaymentModal({
  isOpen, onClose, totals,
  payments, paymentMethod, setPaymentMethod, paymentAmount, setPaymentAmount,
  esInterno, setEsInterno, totalPagado, procesando,
  onAddPayment, onRemovePayment, onProcessSale,
}: Props) {
  return (
    <PortalModal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 max-w-lg w-full">
        <div className="border-b pb-4 mb-4">
          <h3 className="text-xl font-bold text-gray-900">Procesar Pago</h3>
          <div className="flex justify-between items-center mt-2">
            <span className="text-gray-600">Total a Pagar:</span>
            <span className="text-2xl font-bold text-gray-900">${totals.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Tipo documento toggle */}
        <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-indigo-900">Tipo de Documento</div>
            <div className="text-xs text-indigo-700">{esInterno ? 'Nota de Venta (Solo Interno)' : 'Factura Electrónica (SRI)'}</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={!esInterno} onChange={e => setEsInterno(!e.target.checked)} />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {/* Pagos agregados */}
        <div className="mb-4 bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
          <div className="text-xs font-bold text-gray-500 mb-2 uppercase">Pagos Agregados</div>
          {payments.length === 0 && <div className="text-sm text-gray-400 italic">No hay pagos agregados</div>}
          {payments.map((p, idx) => (
            <div key={idx} className="flex justify-between items-center py-2 border-b last:border-0">
              <div>
                <div className="font-semibold text-gray-800">{p.descripcion}</div>
                <div className="text-xs text-gray-500">{p.codigo}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold">${p.total.toFixed(2)}</span>
                <button onClick={() => onRemovePayment(idx)} className="text-red-500 hover:text-red-700">✕</button>
              </div>
            </div>
          ))}
        </div>

        {/* Agregar pago */}
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Método</label>
              <select className="w-full p-2 border rounded text-sm" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                <option value="01">Efectivo (Sin Sist. Financiero)</option>
                <option value="19">Tarjeta de Crédito</option>
                <option value="16">Tarjeta de Débito</option>
                <option value="20">Transferencia / Otros con SF</option>
                <option value="17">Dinero Electrónico</option>
                <option value="18">Tarjeta Prepago</option>
                <option value="15">Compensación de Deudas</option>
                <option value="21">Endoso de Títulos</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Monto</label>
              <input type="number" step="0.01" className="w-full p-2 border rounded text-sm" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
            </div>
          </div>
          <button onClick={onAddPayment} className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 text-sm">
            + Agregar Pago
          </button>
        </div>

        {/* Resumen y acciones */}
        <div className="border-t pt-4">
          <div className="flex justify-between mb-4 text-lg">
            <span className="text-gray-600">Total Pagado:</span>
            <span className={`font-bold ${totalPagado >= totals.total ? 'text-green-600' : 'text-red-600'}`}>
              ${totalPagado.toFixed(2)}
            </span>
          </div>
          {totalPagado >= totals.total && (
            <div className="flex justify-between mb-4 text-sm text-gray-500 bg-green-50 p-2 rounded">
              <span>Cambio / Vuelto:</span>
              <span className="font-bold text-green-700">${(totalPagado - totals.total).toFixed(2)}</span>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 border border-gray-300 rounded-xl font-bold text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
            <button
              onClick={onProcessSale}
              disabled={procesando || totalPagado < totals.total - 0.01}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 shadow-lg shadow-green-200"
            >
              {procesando ? 'Procesando...' : 'FINALIZAR VENTA 🚀'}
            </button>
          </div>
        </div>
      </div>
    </PortalModal>
  );
}
