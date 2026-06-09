'use client';

import { useState } from 'react';
import { getApiClient } from '@/lib/api';
import { Producto, Presentacion } from '@/lib/types/productos';
import { CartItem, ComboResult, SlotOpcion } from '../types';
import { sriCalculator, CartItemInput } from '@/lib/wasm/calculator';

export function usePOSCart(
  sucursalId: number | undefined,
  showToast: (msg: string) => void,
  getOfflineComboOpciones?: (comboId: number) => Promise<import('@/lib/db/posDB').ComboDB | undefined>
) {
  const [items, setItems] = useState<CartItem[]>([]);

  // Presentation selection modal
  const [showPresModal, setShowPresModal] = useState(false);
  const [productToSelect, setProductToSelect] = useState<Producto | null>(null);
  const [availablePresentations, setAvailablePresentations] = useState<Presentacion[]>([]);
  const [targetCartIndex, setTargetCartIndex] = useState<number | null>(null);

  // Slot selection modal
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [pendingCombo, setPendingCombo] = useState<ComboResult | null>(null);
  const [slotOpciones, setSlotOpciones] = useState<Record<number, SlotOpcion[]>>({});
  const [slotSelections, setSlotSelections] = useState<Record<number, SlotOpcion>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState('');

  const apiClient = getApiClient();

  const handleCartItemClick = async (index: number, item: CartItem) => {
    try {
      let presentaciones = item.producto.presentaciones || [];
      if (presentaciones.length === 0 && navigator.onLine) {
        try {
          const presRes = await apiClient.getPresentaciones(item.producto.id, sucursalId);
          presentaciones = presRes.data || [];
        } catch { /* fallback */ }
      }
      if (presentaciones.length > 0) {
        setProductToSelect(item.producto);
        setAvailablePresentations(presentaciones);
        setTargetCartIndex(index);
        setShowPresModal(true);
      } else {
        // Fallback total
        setProductToSelect(item.producto);
        setAvailablePresentations([item.presentacion]);
        setTargetCartIndex(index);
        setShowPresModal(true);
      }
    } catch (e: any) {
      console.warn('[usePOSCart] Error al obtener presentaciones del item:', e);
      setProductToSelect(item.producto);
      setAvailablePresentations([item.presentacion]);
      setTargetCartIndex(index);
      setShowPresModal(true);
    }
  };

  const addToCart = async (producto: Producto) => {
    setTargetCartIndex(null);
    if ((producto.stock ?? 0) <= 0) { alert('Producto agotado'); return; }
    try {
      let presentaciones = producto.presentaciones || [];
      if (presentaciones.length === 0 && navigator.onLine) {
        try {
          const presRes = await apiClient.getPresentaciones(producto.id, sucursalId);
          presentaciones = presRes.data || [];
        } catch { /* fallback to local */ }
      }
      
      if (presentaciones.length > 0) {
        const local = presentaciones.filter((p: Presentacion) => p.canal === 'LOCAL');
        const defaultPres =
          local.find((p: Presentacion) => p.nombre_presentacion?.toLowerCase() === 'unidad')
          || local.find((p: Presentacion) => Number(p.cantidad) === 1)
          || local[0]
          || presentaciones[0];
        addPresentationToCart(producto, defaultPres);
      } else {
        // Si no hay presentaciones cargadas en IndexedDB (o estamos offline sin caché previa de presentacion),
        // caemos en la presentación virtual con precio_default
        const fallbackPres: Presentacion = {
          id: -producto.id,
          nombre_presentacion: producto.unidad_medida || 'UNIDAD',
          cantidad: 1,
          precio: String(producto.precio_default ?? 0),
          canal: 'LOCAL',
        };
        addPresentationToCart(producto, fallbackPres);
      }
    } catch (e: any) {
      console.warn('[usePOSCart] Error al obtener presentaciones al agregar al carrito:', e);
      const fallbackPres: Presentacion = {
        id: -producto.id,
        nombre_presentacion: producto.unidad_medida || 'UNIDAD',
        cantidad: 1,
        precio: String(producto.precio_default ?? 0),
        canal: 'LOCAL',
      };
      addPresentationToCart(producto, fallbackPres);
    }
  };

  const addPresentationToCart = (producto: Producto, presentacion: Presentacion) => {
    const stockActual = producto.stock ?? 0;
    setItems(prev => {
      const otherStock = prev
        .filter((item, idx) => item.producto.id === producto.id && idx !== targetCartIndex)
        .reduce((sum, i) => sum + i.cantidad * i.presentacion.cantidad, 0);
      let quantity = targetCartIndex !== null && prev[targetCartIndex] ? prev[targetCartIndex].cantidad : 1;
      if (otherStock + quantity * presentacion.cantidad > stockActual) {
        alert(`Sin stock suficiente. Max: ${stockActual - otherStock} unidades.`);
        return prev;
      }
      if (targetCartIndex !== null) {
        const newCart = [...prev];
        const precio = Number(presentacion.precio);
        newCart[targetCartIndex] = { ...newCart[targetCartIndex], presentacion, precio, subtotal: quantity * precio, total: quantity * precio };
        return newCart;
      }
      const existingIdx = prev.findIndex(i => i.producto.id === producto.id && i.presentacion.id === presentacion.id);
      if (existingIdx >= 0) {
        const newCart = [...prev];
        const item = newCart[existingIdx];
        const newQty = item.cantidad + 1;
        const precio = Number(presentacion.precio);
        newCart[existingIdx] = { ...item, cantidad: newQty, subtotal: newQty * precio, total: newQty * precio };
        return newCart;
      }
      const precio = Number(presentacion.precio);
      return [...prev, { producto, presentacion, cantidad: 1, precio, subtotal: precio, impuesto: 0, total: precio }];
    });
    setShowPresModal(false);
    setProductToSelect(null);
    setTargetCartIndex(null);
    showToast(`Actualizado: ${producto.nombre}`);
  };

  const addComboToCart = async (combo: ComboResult) => {
    if (combo.slots.length === 0) { commitComboToCart(combo, []); return; }
    setPendingCombo(combo);
    setSlotSelections({});
    setSlotError('');
    setLoadingSlots(true);
    setShowSlotModal(true);
    try {
      if (!navigator.onLine && getOfflineComboOpciones) {
        // Usar opciones desde Dexie
        const cachedCombo = await getOfflineComboOpciones(combo.id);
        const map: Record<number, SlotOpcion[]> = {};
        if (cachedCombo) {
          cachedCombo.slots.forEach(slot => { map[slot.id] = slot.opciones; });
        }
        setSlotOpciones(map);
      } else {
        const results = await Promise.all(
          combo.slots.map(slot =>
            apiClient.getComboOpciones(combo.id, slot.id, sucursalId!)
              .then(opciones => ({ slotId: slot.id, opciones: Array.isArray(opciones) ? opciones : [] }))
              .catch(() => ({ slotId: slot.id, opciones: [] as SlotOpcion[] }))
          )
        );
        const map: Record<number, SlotOpcion[]> = {};
        results.forEach(({ slotId, opciones }) => { map[slotId] = opciones; });
        setSlotOpciones(map);
      }
    } finally { setLoadingSlots(false); }
  };

  const commitComboToCart = (combo: ComboResult, selections: { slot_id: number; producto_id: number; producto_nombre: string }[]) => {
    const virtualProducto = { id: combo.id, nombre: combo.nombre, stock: 99 } as unknown as Producto;
    const virtualPresentacion = { id: combo.id, precio: combo.precio, cantidad: 1, nombre_presentacion: 'Combo' } as unknown as Presentacion;
    setItems(prev => [...prev, {
      producto: virtualProducto, presentacion: virtualPresentacion,
      cantidad: 1, precio: combo.precio, subtotal: combo.precio, impuesto: 0, total: combo.precio,
      isCombo: true, comboId: combo.id, comboNombre: combo.nombre, slotSelections: selections,
    }]);
    showToast(`${combo.nombre} agregado`);
  };

  const handleConfirmSlots = () => {
    if (!pendingCombo) return;
    for (const slot of pendingCombo.slots) {
      if (slot.obligatorio && !slotSelections[slot.id]) {
        setSlotError(`Debes elegir una opción para "${slot.nombre}"`);
        return;
      }
    }
    const selections = Object.entries(slotSelections).map(([slotId, opcion]) => ({
      slot_id: Number(slotId), producto_id: opcion.id, producto_nombre: opcion.nombre,
    }));
    commitComboToCart(pendingCombo, selections);
    setShowSlotModal(false);
    setPendingCombo(null);
    setSlotSelections({});
    setSlotOpciones({});
    setSlotError('');
  };

  const removeFromCart = (index: number) => setItems(prev => prev.filter((_, i) => i !== index));

  const updateQuantity = (index: number, newQty: number) => {
    if (newQty < 1) return;
    setItems(prev => {
      const newCart = [...prev];
      const item = newCart[index];
      newCart[index] = { ...item, cantidad: newQty, subtotal: newQty * item.precio, total: newQty * item.precio };
      return newCart;
    });
  };

  const calculateTotals = () => {
    const inputs: CartItemInput[] = items.map(item => ({
      precio_pvp: String(item.precio),
      cantidad: item.cantidad,
      tasa_iva: String(item.producto.impuesto_porcentaje ?? 15),
    }));
    const result = sriCalculator.calcularCarrito(inputs);
    return {
      subtotal: parseFloat(result.subtotal_sin_iva),
      total:    parseFloat(result.total_con_iva),
      impuesto: parseFloat(result.total_iva),
    };
  };

  const reset = () => setItems([]);

  return {
    items, addToCart, addPresentationToCart, removeFromCart, updateQuantity, calculateTotals, reset,
    handleCartItemClick,
    showPresModal, setShowPresModal, productToSelect, availablePresentations, targetCartIndex,
    addComboToCart,
    showSlotModal, setShowSlotModal, pendingCombo, slotOpciones, slotSelections, setSlotSelections,
    loadingSlots, slotError, handleConfirmSlots,
  };
}
