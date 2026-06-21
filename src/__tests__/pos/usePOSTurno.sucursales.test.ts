/**
 * @jest-environment jsdom
 *
 * Bug producción (la_huequita, 2026-06-20): el POS cargaba TODAS las sucursales
 * del tenant (getSucursales) y preseleccionaba la primera → un vendedor de
 * Lico 2 abrió turno en Sucursal 1.
 *
 * Fix: el selector usa getMisSucursales() (solo las del usuario).
 */
import { renderHook, act, waitFor } from '@testing-library/react';

const mockGetMisSucursales = jest.fn();
const mockGetSucursales = jest.fn();
const mockVerificarTurno = jest.fn();

jest.mock('@/lib/api', () => ({
  getApiClient: () => ({
    getMisSucursales: mockGetMisSucursales,
    getSucursales: mockGetSucursales,
    verificarTurno: mockVerificarTurno,
  }),
}));

import { usePOSTurno } from '@/app/pos/hooks/usePOSTurno';

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockVerificarTurno.mockResolvedValue({ success: true, activo: false });
  // El usuario (Gerardo) solo tiene Lico 2
  mockGetMisSucursales.mockResolvedValue({ success: true, sucursales: [{ id: 3, nombre: 'Lico 2' }] });
  mockGetSucursales.mockResolvedValue({ success: true, sucursales: [{ id: 1, nombre: 'Sucursal 1' }, { id: 3, nombre: 'Lico 2' }] });
});

describe('usePOSTurno — selector de sucursal', () => {
  it('carga solo las sucursales del usuario (getMisSucursales) y preselecciona la suya', async () => {
    const { result } = renderHook(() => usePOSTurno(jest.fn()));

    await act(async () => { await result.current.loadSucursales(); });

    expect(mockGetMisSucursales).toHaveBeenCalled();
    // NUNCA pide la lista completa del tenant
    expect(mockGetSucursales).not.toHaveBeenCalled();
    // Solo la sucursal propia, preseleccionada
    expect(result.current.sucursales.map((s: any) => s.id)).toEqual([3]);
    expect(result.current.selectedSucursal).toBe(3);
  });
});
