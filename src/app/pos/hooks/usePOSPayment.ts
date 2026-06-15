'use client';

import { useState, useRef, useEffect } from 'react';
import { getApiClient } from '@/lib/api';
import { CartItem, ClientData, Turno, Payment, CONSUMIDOR_FINAL } from '../types';
import { savePrintData } from '../lib/printStore';

const PAYMENT_METHODS: Record<string, string> = {
  '01': 'Efectivo', '19': 'Tarjeta de Crédito', '16': 'Tarjeta de Débito',
  '20': 'Transferencia / Otros', '17': 'Dinero Electrónico',
  '18': 'Tarjeta Prepago', '15': 'Compensación de Deudas', '21': 'Endoso de Títulos',
};

const TENANTS_CON_IMPRESORA = ['persepolis', 'pukadigital', 'palaciodelasempanadas'];
const TENANTS_TELEFONOS: Record<string, string> = {
  persepolis: '0995128237',
  palaciodelasempanadas: '0998187906',
};

interface UsePOSPaymentArgs {
  items: CartItem[];
  client: ClientData;
  turno: Turno | null;
  totals: { subtotal: number; total: number; impuesto: number };
  onSaleComplete: () => void;
  showToast: (msg: string) => void;
  enqueueSale?: (payload: object, receiptData: object, turnoId: number, sucursalId: number) => Promise<void>;
}

export function usePOSPayment({
  items,
  client,
  turno,
  totals,
  onSaleComplete,
  showToast,
  enqueueSale,
}: UsePOSPaymentArgs) {
  const [showModal, setShowModal] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('01');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [esInterno, setEsInterno] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const procesandoRef = useRef(false);

  // Default del toggle Factura/Nota por-tenant (backend): al abrir/cambiar turno,
  // arranca en "Factura Electrónica" si el tenant lo configuró. Sin el flag → nota interna (como hoy).
  // Keyed en turno?.id → solo al cambiar de turno, no pisa el toggle flipeado dentro del mismo turno.
  useEffect(() => {
    if (turno) setEsInterno(!(turno.factura_electronica_default ?? false));
  }, [turno?.id]);

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
    const ventaId = crypto.randomUUID();
    try {
      const totalPagado = payments.reduce((s, p) => s + p.total, 0);
      if (totalPagado < totals.total - 0.01) {
        alert(`Falta pagar $${(totals.total - totalPagado).toFixed(2)}`);
        return;
      }
      const tenant = window.location.hostname.split('.')[0];
      const usaImpresora = turno?.impresora_activa ?? TENANTS_CON_IMPRESORA.includes(tenant);
      printWindow = usaImpresora
        ? window.open(`${window.location.origin}/pos/recibo?id=${ventaId}&loading=true`, 'pos_recibo')
        : null;

      let pendiente = totals.total;
      const pagosNormalizados = payments.map(p => {
        const asignado = parseFloat(Math.min(p.total, pendiente).toFixed(2));
        pendiente = parseFloat(Math.max(0, pendiente - asignado).toFixed(2));
        return { ...p, total: asignado };
      });

      const payload = {
        cliente: client,
        items: items.map(item => item.isCombo
          ? { type: 'combo', combo_id: item.comboId, cantidad: item.cantidad, slot_selections: (item.slotSelections || []).map(s => ({ slot_id: s.slot_id, producto_id: s.producto_id })) }
          : { id: item.producto.id, presentacion_id: item.presentacion.id, cantidad: item.cantidad, precio: item.precio }
        ),
        pagos: pagosNormalizados,
        es_interno: esInterno,
        venta_uuid: ventaId,
      };

      const numeroPedido = new Date().getTime().toString().slice(-6);
      const negocio = ({ persepolis: 'Persepolis Grill & Burgers' } as Record<string, string>)[tenant] || tenant;
      const telefonoGerente = turno?.telefono_atencion ?? (TENANTS_TELEFONOS[tenant] || '');
      const totalPagadoFinal = payments.reduce((s, p) => s + p.total, 0);

      const receiptData = {
        negocio, sucursal: turno?.sucursal_nombre || '',
        fecha: new Date().toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }),
        numero_pedido: numeroPedido,
        telefono_gerente: telefonoGerente,
        items: items.map(item => ({ nombre: item.isCombo ? (item.comboNombre || item.producto.nombre) : item.producto.nombre, cantidad: item.cantidad, precio: item.precio, subtotal: item.subtotal })),
        subtotal: totals.subtotal, iva: totals.impuesto, total: totals.total,
        pagos: payments.map(p => ({ descripcion: p.descripcion, total: p.total })),
        cambio: Math.max(0, totalPagadoFinal - totals.total),
        numero_autorizacion: '',
        cliente: client.razon_social,
      };

      // ── Flujo offline ──────────────────────────────────────────────────────
      if (!navigator.onLine && enqueueSale && turno) {
        receiptData.numero_autorizacion = 'PENDIENTE';
        const comandaData = {
          numero: numeroPedido, fecha: receiptData.fecha,
          cliente: client.razon_social, telefono_gerente: telefonoGerente,
          total: totals.total,
          items: items.map(i => ({ nombre: i.isCombo ? (i.comboNombre || i.producto.nombre) : i.producto.nombre, cantidad: i.cantidad, precio: i.precio })),
          metodo_pago: payments.map(p => p.descripcion).join(' + ') || 'Efectivo',
        };
        await enqueueSale({ ...payload }, receiptData, turno.id, turno.sucursal);
        savePrintData(ventaId, receiptData, comandaData);
        if (printWindow) printWindow.location.href = `${window.location.origin}/pos/recibo?id=${ventaId}`;
        setShowModal(false);
        onSaleComplete();
        return;
      }

      // ── Flujo online ───────────────────────────────────────────────────────
      const res = await apiClient.crearFacturaPOS(payload);
      receiptData.numero_autorizacion = res.numero_autorizacion || '';
      receiptData.numero_pedido = res.numero_autorizacion ? res.numero_autorizacion.slice(-6) : numeroPedido;

      const comandaData = {
        numero: receiptData.numero_pedido, fecha: receiptData.fecha,
        cliente: client.razon_social, telefono_gerente: telefonoGerente,
        total: totals.total,
        items: items.map(i => ({ nombre: i.isCombo ? (i.comboNombre || i.producto.nombre) : i.producto.nombre, cantidad: i.cantidad, precio: i.precio })),
        metodo_pago: payments.map(p => p.descripcion).join(' + ') || 'Efectivo',
      };
      savePrintData(ventaId, receiptData, comandaData);
      if (printWindow) printWindow.location.href = `${window.location.origin}/pos/recibo?id=${ventaId}`;
      setShowModal(false);
      onSaleComplete();

    } catch (error: any) {
      // Si error de red (status 0) o backend temporalmente abajo (502/503/504, ej. restart de deploy),
      // encolar como offline para no cortar la venta — el sweep la sincroniza al volver.
      if ((error?.status === 0 || [502, 503, 504].includes(error?.status)) && enqueueSale && turno) {
        const pendiente2 = totals.total;
        const pagosNorm2 = payments.map(p => {
          const asignado = parseFloat(Math.min(p.total, pendiente2).toFixed(2));
          return { ...p, total: asignado };
        });
        const fallbackPayload = {
          cliente: client,
          items: items.map(item => item.isCombo
            ? { type: 'combo', combo_id: item.comboId, cantidad: item.cantidad, slot_selections: (item.slotSelections || []).map(s => ({ slot_id: s.slot_id, producto_id: s.producto_id })) }
            : { id: item.producto.id, presentacion_id: item.presentacion.id, cantidad: item.cantidad, precio: item.precio }
          ),
          pagos: pagosNorm2, es_interno: esInterno, venta_uuid: ventaId,
        };
        const tenant2 = window.location.hostname.split('.')[0];
        const negocio2 = ({ persepolis: 'Persepolis Grill & Burgers' } as Record<string, string>)[tenant2] || tenant2;
        const numeroPedido2 = new Date().getTime().toString().slice(-6);
        const fallbackReceipt = {
          negocio: negocio2, sucursal: turno.sucursal_nombre,
          fecha: new Date().toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }),
          numero_pedido: numeroPedido2, telefono_gerente: turno?.telefono_atencion ?? (TENANTS_TELEFONOS[tenant2] || ''),
          items: items.map(i => ({ nombre: i.isCombo ? (i.comboNombre || i.producto.nombre) : i.producto.nombre, cantidad: i.cantidad, precio: i.precio, subtotal: i.subtotal })),
          subtotal: totals.subtotal, iva: totals.impuesto, total: totals.total,
          pagos: payments.map(p => ({ descripcion: p.descripcion, total: p.total })),
          cambio: 0, numero_autorizacion: 'PENDIENTE', cliente: client.razon_social,
        };
        const fallbackComanda = {
          numero: numeroPedido2, fecha: fallbackReceipt.fecha,
          cliente: client.razon_social, telefono_gerente: turno?.telefono_atencion ?? (TENANTS_TELEFONOS[tenant2] || ''),
          total: totals.total,
          items: items.map(i => ({ nombre: i.isCombo ? (i.comboNombre || i.producto.nombre) : i.producto.nombre, cantidad: i.cantidad, precio: i.precio })),
          metodo_pago: payments.map(p => p.descripcion).join(' + ') || 'Efectivo',
        };
        await enqueueSale(fallbackPayload, fallbackReceipt, turno.id, turno.sucursal);
        savePrintData(ventaId, fallbackReceipt, fallbackComanda);
        if (printWindow) printWindow.location.href = `${window.location.origin}/pos/recibo?id=${ventaId}`;
        setShowModal(false);
        onSaleComplete();
      } else {
        if (printWindow) { try { printWindow.close(); } catch { /* ignore */ } }
        alert(error?.errorMessage || error?.message || 'Error al procesar venta');
      }
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
