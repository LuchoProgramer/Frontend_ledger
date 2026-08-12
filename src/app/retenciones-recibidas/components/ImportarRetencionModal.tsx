'use client';

import { useState } from 'react';
import type { CrearRetencionManualPayload, DetalleRetencionRecibidaInput } from '@/lib/types/retenciones';

interface Props {
  onImportar: (claveAcceso: string) => Promise<void>;
  onCrearManual: (payload: CrearRetencionManualPayload) => Promise<void>;
  onClose: () => void;
}

const DETALLE_VACIO: DetalleRetencionRecibidaInput = {
  codigo_impuesto: '1', codigo_retencion: '', base_imponible: '', porcentaje_retener: '', valor_retenido: '',
};

export default function ImportarRetencionModal({ onImportar, onCrearManual, onClose }: Props) {
  const [clave, setClave] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorEs404, setErrorEs404] = useState(false);
  const [modoManual, setModoManual] = useState(false);

  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [fechaEmision, setFechaEmision] = useState('');
  const [periodoFiscal, setPeriodoFiscal] = useState('');
  const [rucAgente, setRucAgente] = useState('');
  const [razonSocialAgente, setRazonSocialAgente] = useState('');
  const [numeroFacturaSustento, setNumeroFacturaSustento] = useState('');
  const [detalles, setDetalles] = useState<DetalleRetencionRecibidaInput[]>([{ ...DETALLE_VACIO }]);

  const handleImportar = async () => {
    if (!/^\d{49}$/.test(clave)) {
      setError('La clave de acceso debe tener 49 dígitos.');
      setErrorEs404(false);
      return;
    }
    setLoading(true);
    setError('');
    setErrorEs404(false);
    try {
      await onImportar(clave);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al importar la retención');
      setErrorEs404(err?.status === 404);
    } finally {
      setLoading(false);
    }
  };

  const actualizarDetalle = (idx: number, campo: keyof DetalleRetencionRecibidaInput, valor: string) => {
    setDetalles((prev) => prev.map((d, i) => (i === idx ? { ...d, [campo]: valor } : d)));
  };

  const handleGuardarManual = async () => {
    setLoading(true);
    setError('');
    try {
      await onCrearManual({
        clave_acceso: clave,
        numero_documento: numeroDocumento,
        fecha_emision: fechaEmision,
        periodo_fiscal: periodoFiscal,
        ruc_agente_retencion: rucAgente,
        razon_social_agente_retencion: razonSocialAgente,
        numero_factura_sustento: numeroFacturaSustento,
        detalles,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al guardar la retención');
    } finally {
      setLoading(false);
    }
  };

  if (modoManual) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Cargar retención a mano</h2>

          <label className="block text-sm text-gray-600 mb-1">Clave de acceso</label>
          <input type="text" value={clave} readOnly className="w-full border rounded-lg px-3 py-2 mb-3 font-mono text-xs bg-gray-50" />

          <label htmlFor="numero_documento" className="block text-sm text-gray-600 mb-1">Número de documento</label>
          <input id="numero_documento" type="text" value={numeroDocumento} onChange={(e) => setNumeroDocumento(e.target.value)}
            placeholder="001-001-000022305" className="w-full border rounded-lg px-3 py-2 mb-3 text-sm" />

          <label htmlFor="fecha_emision" className="block text-sm text-gray-600 mb-1">Fecha de emisión</label>
          <input id="fecha_emision" type="date" value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 mb-3 text-sm" />

          <label htmlFor="periodo_fiscal" className="block text-sm text-gray-600 mb-1">Período fiscal</label>
          <input id="periodo_fiscal" type="text" value={periodoFiscal} onChange={(e) => setPeriodoFiscal(e.target.value)}
            placeholder="04/2026" className="w-full border rounded-lg px-3 py-2 mb-3 text-sm" />

          <label htmlFor="ruc_agente" className="block text-sm text-gray-600 mb-1">RUC del agente de retención</label>
          <input id="ruc_agente" type="text" value={rucAgente} onChange={(e) => setRucAgente(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 mb-3 text-sm" />

          <label htmlFor="razon_social_agente" className="block text-sm text-gray-600 mb-1">Razón social del agente de retención</label>
          <input id="razon_social_agente" type="text" value={razonSocialAgente} onChange={(e) => setRazonSocialAgente(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 mb-3 text-sm" />

          <label htmlFor="numero_factura_sustento" className="block text-sm text-gray-600 mb-1">Número de factura sustento</label>
          <input id="numero_factura_sustento" type="text" value={numeroFacturaSustento} onChange={(e) => setNumeroFacturaSustento(e.target.value)}
            placeholder="001-001-000000001" className="w-full border rounded-lg px-3 py-2 mb-4 text-sm" />

          <p className="text-sm font-medium text-gray-700 mb-2">Líneas de retención</p>
          {detalles.map((d, idx) => (
            <div key={idx} className="grid grid-cols-2 gap-2 mb-3 p-3 border rounded-lg">
              <div>
                <label htmlFor={`codigo_impuesto_${idx}`} className="block text-xs text-gray-500 mb-1">Impuesto</label>
                <select id={`codigo_impuesto_${idx}`} value={d.codigo_impuesto}
                  onChange={(e) => actualizarDetalle(idx, 'codigo_impuesto', e.target.value)}
                  className="w-full border rounded-lg px-2 py-1 text-sm">
                  <option value="1">RENTA</option>
                  <option value="2">IVA</option>
                  <option value="6">ISD</option>
                </select>
              </div>
              <div>
                <label htmlFor={`codigo_retencion_${idx}`} className="block text-xs text-gray-500 mb-1">Código de retención</label>
                <input id={`codigo_retencion_${idx}`} type="text" value={d.codigo_retencion}
                  onChange={(e) => actualizarDetalle(idx, 'codigo_retencion', e.target.value)}
                  className="w-full border rounded-lg px-2 py-1 text-sm" />
              </div>
              <div>
                <label htmlFor={`base_imponible_${idx}`} className="block text-xs text-gray-500 mb-1">Base imponible</label>
                <input id={`base_imponible_${idx}`} type="text" value={d.base_imponible}
                  onChange={(e) => actualizarDetalle(idx, 'base_imponible', e.target.value)}
                  className="w-full border rounded-lg px-2 py-1 text-sm" />
              </div>
              <div>
                <label htmlFor={`porcentaje_retener_${idx}`} className="block text-xs text-gray-500 mb-1">Porcentaje</label>
                <input id={`porcentaje_retener_${idx}`} type="text" value={d.porcentaje_retener}
                  onChange={(e) => actualizarDetalle(idx, 'porcentaje_retener', e.target.value)}
                  className="w-full border rounded-lg px-2 py-1 text-sm" />
              </div>
              <div className="col-span-2">
                <label htmlFor={`valor_retenido_${idx}`} className="block text-xs text-gray-500 mb-1">Valor retenido</label>
                <input id={`valor_retenido_${idx}`} type="text" value={d.valor_retenido}
                  onChange={(e) => actualizarDetalle(idx, 'valor_retenido', e.target.value)}
                  className="w-full border rounded-lg px-2 py-1 text-sm" />
              </div>
            </div>
          ))}
          <button
            onClick={() => setDetalles((prev) => [...prev, { ...DETALLE_VACIO }])}
            className="text-sm text-indigo-600 mb-4"
          >
            + Agregar línea
          </button>

          {error && <div className="mb-3 p-2 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setModoManual(false)} className="px-4 py-2 text-gray-600" disabled={loading}>Atrás</button>
            <button onClick={handleGuardarManual} disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Importar retención por clave de acceso</h2>
        <input
          type="text"
          value={clave}
          onChange={(e) => setClave(e.target.value.trim())}
          placeholder="49 dígitos de la clave de acceso"
          maxLength={49}
          className="w-full border rounded-lg px-3 py-2 mb-3 font-mono text-sm"
        />
        {error && (
          <div className="mb-3 p-2 bg-red-50 text-red-700 rounded text-sm">
            {error}
            {errorEs404 && (
              <button onClick={() => setModoManual(true)} className="block mt-2 text-indigo-600 font-medium underline">
                Cargar los datos a mano
              </button>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-600" disabled={loading}>Cancelar</button>
          <button
            onClick={handleImportar}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50"
          >
            {loading ? 'Importando...' : 'Importar'}
          </button>
        </div>
      </div>
    </div>
  );
}
