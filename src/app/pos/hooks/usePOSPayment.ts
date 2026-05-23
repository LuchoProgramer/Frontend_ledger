'use client';

import { useState, useRef } from 'react';
import { getApiClient } from '@/lib/api';
import { CartItem, ClientData, Turno, Payment, CONSUMIDOR_FINAL } from '../types';

const PAYMENT_METHODS: Record<string, string> = {
  '01': 'Efectivo', '19': 'Tarjeta de Crédito', '16': 'Tarjeta de Débito',
  '20': 'Transferencia / Otros', '17': 'Dinero Electrónico',
  '18': 'Tarjeta Prepago', '15': 'Compensación de Deudas', '21': 'Endoso de Títulos',
};

const TENANTS_CON_IMPRESORA = ['persepolis', 'pukadigital'];

interface UsePOSPaymentArgs {
  items: CartItem[];
  client: ClientData;
  turno: Turno | null;
  totals: { subtotal: number; total: number; impuesto: number };
  onSaleComplete: () => void;
  showToast: (msg: string) => void;
}

export function usePOSPayment({ items, client, turno, totals, onSaleComplete }: UsePOSPaymentArgs) {
  const [showModal, setShowModal] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('01');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [esInterno, setEsInterno] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const procesandoRef = useRef(false);

  const apiClient = getApiClient();

  const openModal = (showClientModal: () => void) => {
    if (items.length === 0) return;
    if (totals.total > 50 && client.identificacion === '9999999999') {
      alert('Para ventas mayores a $50, debe ingresar los datos del cliente.');
      showClientModal();
      return;
    }
    setPaymentAmount(totals.total.toFixed(2));
    setPayments([]);
    setPaymentMethod('01');
    setEsInterno(client.identificacion === '9999999999');
    setShowModal(true);
  };

  const addPayment = () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) { alert('Monto inválido'); return; }
    const descripcion = PAYMENT_METHODS[paymentMethod] || 'Otro';
    setPayments(prev => {
      const newPayments = [...prev, { codigo: paymentMethod, descripcion, total: amount }];
      const paid = newPayments.reduce((s, p) => s + p.total, 0);
      const remaining = Math.max(0, totals.total - paid);
      setPaymentAmount(remaining.toFixed(2));
      return newPayments;
    });
  };

  const removePayment = (index: number) => setPayments(prev => prev.filter((_, i) => i !== index));

  const processSale = async () => {
    if (procesandoRef.current) return;
    procesandoRef.current = true;
    setProcesando(true);
    let printWindow: Window | null = null;
    try {
      const totalPagado = payments.reduce((s, p) => s + p.total, 0);
      if (totalPagado < totals.total - 0.01) {
        alert(`Falta pagar $${(totals.total - totalPagado).toFixed(2)}`);
        return;
      }
      const tenant = window.location.hostname.split('.')[0];
      printWindow = TENANTS_CON_IMPRESORA.includes(tenant) 
        ? window.open(`${window.location.origin}/pos/recibo?loading=true`, '_blank') 
        : null;

      const payload = {
        cliente: client,
        items: items.map(item => item.isCombo
          ? { type: 'combo', combo_id: item.comboId, cantidad: item.cantidad, slot_selections: (item.slotSelections || []).map(s => ({ slot_id: s.slot_id, producto_id: s.producto_id })) }
          : { id: item.producto.id, presentacion_id: item.presentacion.id, cantidad: item.cantidad, precio: item.precio }
        ),
        pagos: payments,
        es_interno: esInterno,
      };

      const res = await apiClient.crearFacturaPOS(payload);

      if (printWindow) {
        const negocio = ({ persepolis: 'Persepolis Grill & Burgers' } as Record<string, string>)[tenant] || tenant;
        const totalPagadoFinal = payments.reduce((s, p) => s + p.total, 0);
        const numeroPedido = res.numero_autorizacion ? res.numero_autorizacion.slice(-6) : new Date().getTime().toString().slice(-6);

        localStorage.setItem('posRecibo', JSON.stringify({
          negocio, sucursal: turno?.sucursal_nombre || '',
          fecha: new Date().toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }),
          numero_pedido: numeroPedido,
          items: items.map(item => ({ nombre: item.isCombo ? (item.comboNombre || item.producto.nombre) : item.producto.nombre, cantidad: item.cantidad, precio: item.precio, subtotal: item.subtotal })),
          subtotal: totals.subtotal, iva: totals.impuesto, total: totals.total,
          pagos: payments.map(p => ({ descripcion: p.descripcion, total: p.total })),
          cambio: Math.max(0, totalPagadoFinal - totals.total),
          numero_autorizacion: res.numero_autorizacion || '', cliente: client.razon_social,
        }));
        localStorage.setItem('posComanda', JSON.stringify({
          numero: numeroPedido,
          fecha: new Date().toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }),
          cliente: client.razon_social,
          items: items.map(item => ({ nombre: item.isCombo ? (item.comboNombre || item.producto.nombre) : item.producto.nombre, cantidad: item.cantidad })),
        }));
        printWindow.location.href = `${window.location.origin}/pos/recibo`;
      }

      setShowModal(false);
      onSaleComplete();
    } catch (error: any) {
      if (printWindow) {
        try {
          printWindow.close();
        } catch (e) {
          console.error('Error closing print window:', e);
        }
      }
      alert(error?.errorMessage || error?.message || 'Error al procesar venta');
    } finally {
      procesandoRef.current = false;
      setProcesando(false);
    }
  };

  const totalPagado = payments.reduce((s, p) => s + p.total, 0);

  return {
    showModal, setShowModal, openModal,
    payments, paymentMethod, setPaymentMethod, paymentAmount, setPaymentAmount,
    esInterno, setEsInterno,
    procesando, totalPagado,
    addPayment, removePayment, processSale,
  };
}
