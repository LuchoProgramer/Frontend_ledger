'use client';

import { useState } from 'react';
import { getApiClient } from '@/lib/api';
import { SucursalSimple } from '@/lib/types/usuarios';
import { Turno, CONSUMIDOR_FINAL } from '../types';
import { ShiftCloseData } from '@/components/ShiftCloseModal';

export function usePOSTurno(onTurnoOpened: (sucursalId: number) => void) {
  const [turno, setTurno] = useState<Turno | null>(null);
  const [loading, setLoading] = useState(true);
  const [sucursales, setSucursales] = useState<SucursalSimple[]>([]);
  const [selectedSucursal, setSelectedSucursal] = useState<number | null>(null);
  const [opening, setOpening] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showClosingModal, setShowClosingModal] = useState(false);

  const apiClient = getApiClient();

  const loadSucursales = async () => {
    try {
      const res = await apiClient.getSucursales();
      if (res.success && res.sucursales) {
        setSucursales(res.sucursales);
        if (res.sucursales.length > 0) setSelectedSucursal(res.sucursales[0].id);
      }
    } catch (e) {
      console.error('Error loading sucursales', e);
    }
  };

  const checkTurno = async () => {
    setLoading(true);
    try {
      const res = await apiClient.verificarTurno();
      if (res.success && res.activo && res.data) {
        setTurno(res.data);
        localStorage.setItem('activeTurno', JSON.stringify({ sucursal_nombre: res.data.sucursal_nombre }));
        onTurnoOpened(res.data.sucursal);
      } else {
        setTurno(null);
        localStorage.removeItem('activeTurno');
        await loadSucursales();
        setShowShiftModal(true);
      }
    } catch (e) {
      console.error('Error checking turno:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTurno = async () => {
    if (!selectedSucursal) return alert('Seleccione una sucursal');
    try {
      setOpening(true);
      const res = await apiClient.abrirTurno(selectedSucursal);
      if (res.success) {
        setTurno(res.data);
        localStorage.setItem('activeTurno', JSON.stringify({ sucursal_nombre: res.data.sucursal_nombre }));
        window.dispatchEvent(new Event('storage'));
        setShowShiftModal(false);
        onTurnoOpened(selectedSucursal);
      }
    } catch (e: any) {
      alert(e.message || 'Error al abrir turno');
    } finally {
      setOpening(false);
    }
  };

  const handleConfirmCloseTurno = async (data: ShiftCloseData, onClosed: () => void) => {
    try {
      await apiClient.cerrarTurno(data);
      setTurno(null);
      localStorage.removeItem('activeTurno');
      window.dispatchEvent(new Event('storage'));
      onClosed();
      await loadSucursales();
      setShowShiftModal(true);
    } catch (e: any) {
      alert(e.message || 'Error al cerrar turno');
      throw e;
    }
  };

  return {
    turno,
    loading,
    sucursales,
    selectedSucursal,
    setSelectedSucursal,
    opening,
    showShiftModal,
    setShowShiftModal,
    showClosingModal,
    setShowClosingModal,
    checkTurno,
    handleOpenTurno,
    handleConfirmCloseTurno,
    loadSucursales,
  };
}
