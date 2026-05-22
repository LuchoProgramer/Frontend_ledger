'use client';

import { useState } from 'react';
import { getApiClient } from '@/lib/api';

interface TransferenciaForm {
  producto_id: number;
  origen_id: number;
  destino_id: number;
  cantidad: string;
  generar_guia: boolean;
  transportista_ruc: string;
  transportista_razon_social: string;
  transportista_placa: string;
}

const INITIAL_FORM: TransferenciaForm = {
  producto_id: 0, origen_id: 0, destino_id: 0, cantidad: '',
  generar_guia: false, transportista_ruc: '', transportista_razon_social: '', transportista_placa: '',
};

interface Props {
  onSuccess: () => void;
  onError: (msg: string) => void;
  onSuccessMessage: (msg: string) => void;
}

export function useTransferencia({ onSuccess, onError, onSuccessMessage }: Props) {
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TransferenciaForm>(INITIAL_FORM);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.origen_id === form.destino_id) {
      onError('La sucursal de origen y destino no pueden ser la misma');
      return;
    }
    setSaving(true);
    try {
      const api = getApiClient();
      const payload: any = {
        producto_id: form.producto_id,
        origen_id: form.origen_id,
        destino_id: form.destino_id,
        cantidad: Number(form.cantidad),
        generar_guia: form.generar_guia,
      };
      if (form.generar_guia) {
        if (!form.transportista_ruc || !form.transportista_razon_social) {
          onError('Debe completar RUC y Razón Social del transportista');
          setSaving(false);
          return;
        }
        payload.transportista = {
          ruc: form.transportista_ruc,
          razon_social: form.transportista_razon_social,
          placa: form.transportista_placa,
        };
      }
      await api.transferenciaInventario(payload);
      onSuccessMessage('Transferencia realizada correctamente');
      setShow(false);
      setForm(INITIAL_FORM);
      onSuccess();
    } catch (err: any) {
      onError(err.message || 'Error al realizar transferencia');
    } finally {
      setSaving(false);
    }
  };

  return { show, setShow, saving, form, setForm, handleSubmit };
}
