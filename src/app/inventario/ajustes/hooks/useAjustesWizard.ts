'use client';

import { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import type { ProductoConStock, Sucursal, AjusteReceipt, Step } from '../_types';

interface UseAjustesWizardProps {
  api: any;
  username?: string;
  email?: string;
}

export function useAjustesWizard({ api, username, email }: UseAjustesWizardProps) {
  const [step, setStep] = useState<Step>('search');

  // Step 1 — search
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [searchResults, setSearchResults] = useState<ProductoConStock[]>([]);
  const [searching, setSearching] = useState(false);

  // Step 2 — sucursal
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductoConStock | null>(null);

  // Step 3 — form
  const [selectedSucursal, setSelectedSucursal] = useState<{ id: number; nombre: string; currentStock: number } | null>(null);
  const [targetQty, setTargetQty] = useState('');
  const [motivo, setMotivo] = useState('');

  // Shared
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [receipt, setReceipt] = useState<AjusteReceipt | null>(null);

  // Load sucursales once
  useEffect(() => {
    api.getSucursalesList({ page_size: 50 })
      .then((res: any) => setSucursales(res.results ?? []))
      .catch(() => {});
  }, [api]);

  // Debounced product search
  useEffect(() => {
    if (debouncedSearch.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    api.getInventario({ search: debouncedSearch, agrupado: true })
      .then((res: any) => setSearchResults((res.results ?? []) as ProductoConStock[]))
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false));
  }, [debouncedSearch, api]);

  // Derived: merge sucursales with stock from selected product's desglose
  const sucursalesConStock = sucursales.map(s => {
    const entry = selectedProduct?.desglose.find(d => d.sucursal === s.id);
    return { id: s.id, nombre: s.nombre, currentStock: Number(entry?.cantidad ?? 0) };
  });

  const targetQtyNum = parseFloat(targetQty) || 0;
  const diff = targetQtyNum - (selectedSucursal?.currentStock ?? 0);

  function handleSelectProduct(producto: ProductoConStock) {
    setSelectedProduct(producto);
    setStep('sucursal');
  }

  function goToSearch() {
    setSelectedProduct(null);
    setStep('search');
  }

  function handleSelectSucursal(id: number, nombre: string, currentStock: number) {
    setSelectedSucursal({ id, nombre, currentStock });
    setTargetQty(currentStock.toString());
    setFormError('');
    setStep('form');
  }

  function handleReviewAjuste() {
    const qty = parseFloat(targetQty);
    if (isNaN(qty) || qty < 0) { setFormError('Ingresa una cantidad válida (número mayor o igual a 0).'); return; }
    if (!motivo.trim()) { setFormError('El motivo del ajuste es obligatorio.'); return; }
    if (qty === selectedSucursal!.currentStock) { setFormError('La cantidad ingresada es igual al stock actual. No hay diferencia que ajustar.'); return; }
    setFormError('');
    setStep('confirm');
  }

  async function handleSubmit() {
    if (!selectedProduct || !selectedSucursal) return;
    if (submittingRef.current) return;
    submittingRef.current = true;

    const diff = targetQtyNum - selectedSucursal.currentStock;
    const tipo: 'ENTRADA' | 'SALIDA' = diff > 0 ? 'ENTRADA' : 'SALIDA';

    setSubmitting(true);
    try {
      await api.ajusteInventario({
        producto_id: selectedProduct.id,
        sucursal_id: selectedSucursal.id,
        tipo,
        cantidad: Math.abs(diff),
        motivo: motivo.trim(),
      });

      setReceipt({
        productoNombre: selectedProduct.nombre,
        productoCodigo: selectedProduct.codigo_producto,
        sucursalNombre: selectedSucursal.nombre,
        stockAnterior: selectedSucursal.currentStock,
        stockNuevo: targetQtyNum,
        diferencia: diff,
        tipo,
        motivo: motivo.trim(),
        usuario: username ?? email ?? 'Sistema',
        fecha: new Date().toLocaleString('es-EC', {
          year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        }),
      });
      setStep('receipt');
    } catch (err: any) {
      setFormError(err?.message ?? 'Error al procesar el ajuste. Intenta de nuevo.');
      setStep('confirm');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function handleNuevoAjuste() {
    setStep('search');
    setSearchTerm('');
    setSearchResults([]);
    setSelectedProduct(null);
    setSelectedSucursal(null);
    setTargetQty('');
    setMotivo('');
    setFormError('');
    setReceipt(null);
  }

  return {
    step, setStep,
    searchTerm, setSearchTerm, debouncedSearch, searching, searchResults,
    sucursales, sucursalesConStock, selectedProduct,
    selectedSucursal, targetQty, setTargetQty, motivo, setMotivo,
    formError, setFormError, submitting, receipt,
    targetQtyNum, diff,
    handleSelectProduct, goToSearch, handleSelectSucursal, handleReviewAjuste,
    handleSubmit, handleNuevoAjuste,
  };
}
