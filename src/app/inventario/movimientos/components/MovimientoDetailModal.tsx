'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import PortalModal from '@/components/ui/PortalModal';
import { Movimiento, TIPO_STYLES, TIPO_LABELS } from '../constants';

interface Props {
  movimiento: Movimiento | null;
  onClose: () => void;
}

export default function MovimientoDetailModal({ movimiento, onClose }: Props) {
  const isOpen = movimiento !== null;

  return (
    <PortalModal isOpen={isOpen} onClose={onClose}>
      {movimiento && (
        <div className="p-6 sm:max-w-lg">
          {/* Header */}
          <div className="mb-5 pr-8">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold mb-2 ${
                TIPO_STYLES[movimiento.tipo_movimiento] ?? 'bg-gray-100 text-gray-700'
              }`}
            >
              {TIPO_LABELS[movimiento.tipo_movimiento] ?? movimiento.tipo_movimiento}
            </span>
            <h2 className="text-lg font-bold text-gray-900 leading-snug">
              {movimiento.producto_nombre}
            </h2>
            <p className="text-sm text-gray-500">{movimiento.sucursal_nombre}</p>
          </div>

          {/* Datos */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm mb-5">
            <Field label="Fecha">
              {format(new Date(movimiento.fecha), "dd/MM/yyyy 'a las' HH:mm:ss", {
                locale: es,
              })}
            </Field>
            <Field label="Usuario">{movimiento.usuario_nombre ?? 'Sistema'}</Field>
            <Field label="Cantidad">
              <span
                className={`font-bold tabular-nums ${
                  movimiento.cantidad < 0 ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {movimiento.cantidad > 0 ? '+' : ''}
                {Number(movimiento.cantidad).toFixed(2)}
              </span>
            </Field>
            <Field label="Saldo resultante">
              {movimiento.saldo_posterior !== null &&
              movimiento.saldo_posterior !== undefined
                ? Number(movimiento.saldo_posterior).toFixed(2)
                : '—'}
            </Field>
          </dl>

          {/* Motivo completo (sin recorte) */}
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Motivo / Observación
            </dt>
            <dd className="text-sm text-gray-900 whitespace-pre-wrap break-words bg-gray-50 border border-gray-200 rounded-lg p-3 min-h-[3rem]">
              {movimiento.motivo?.trim() ? (
                movimiento.motivo
              ) : (
                <span className="text-gray-400 italic">Sin motivo registrado</span>
              )}
            </dd>
          </div>

          {/* Cerrar */}
          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 transition-colors min-h-[48px]"
          >
            Cerrar
          </button>
        </div>
      )}
    </PortalModal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </dt>
      <dd className="text-gray-900 mt-0.5">{children}</dd>
    </div>
  );
}
