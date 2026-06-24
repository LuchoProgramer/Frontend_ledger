/** @jest-environment jsdom */
import { renderHook, act, waitFor } from '@testing-library/react';

const mockConsultarRuc = jest.fn();
jest.mock('@/lib/api', () => ({
  getApiClient: () => ({
    consultarRuc: mockConsultarRuc,
    getClientes: jest.fn().mockResolvedValue({ results: [] }),
    crearCliente: jest.fn(),
  }),
}));

import { usePOSClient } from '@/app/pos/hooks/usePOSClient';

beforeEach(() => {
  mockConsultarRuc.mockReset();
});

describe('usePOSClient.lookupRuc', () => {
  it('rellena razon_social y direccion al encontrar datos en el SRI', async () => {
    mockConsultarRuc.mockResolvedValue({
      identificacion: '0152894259001', razon_social: 'NOURIZADEH JALIL',
      direccion: 'AV. REMIGIO CRESPO', tipo_identificacion: '04',
    });
    const { result } = renderHook(() => usePOSClient());
    act(() => result.current.setNewClientData({
      tipo_identificacion: '04', identificacion: '0152894259001',
      razon_social: '', email: 'mio@correo.com', direccion: '', telefono: '',
    }));
    // Note: lookupRuc doesn't exist yet, which is the expected RED failure.
    try {
      await act(async () => { await (result.current as any).lookupRuc('0152894259001'); });
    } catch (e) {
      // expected to fail when lookupRuc is undefined
      throw e;
    }
    await waitFor(() => expect(result.current.newClientData.razon_social).toBe('NOURIZADEH JALIL'));
    expect(result.current.newClientData.direccion).toBe('AV. REMIGIO CRESPO');
    expect(result.current.newClientData.email).toBe('mio@correo.com'); // NO pisa el email tipeado
  });

  it('no rellena ni lanza si el SRI no devuelve datos (null)', async () => {
    mockConsultarRuc.mockResolvedValue(null);
    const { result } = renderHook(() => usePOSClient());
    act(() => result.current.setNewClientData({
      tipo_identificacion: '04', identificacion: '9999999999999',
      razon_social: '', email: '', direccion: '', telefono: '',
    }));
    await act(async () => { await (result.current as any).lookupRuc('9999999999999'); });
    expect(result.current.newClientData.razon_social).toBe('');
    expect((result.current as any).consultandoSri).toBe(false);
  });

  it('no repite la consulta para la misma identificación', async () => {
    mockConsultarRuc.mockResolvedValue({
      identificacion: '0152894259001', razon_social: 'X', direccion: '', tipo_identificacion: '04',
    });
    const { result } = renderHook(() => usePOSClient());
    await act(async () => { await (result.current as any).lookupRuc('0152894259001'); });
    await act(async () => { await (result.current as any).lookupRuc('0152894259001'); });
    expect(mockConsultarRuc).toHaveBeenCalledTimes(1);
  });
});
