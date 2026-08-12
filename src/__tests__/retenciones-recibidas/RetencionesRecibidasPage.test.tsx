/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('@/components/DashboardLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockGetRetenciones = jest.fn();
const mockImportar = jest.fn();

jest.mock('@/lib/api', () => ({
  getApiClient: () => ({
    getRetencionesRecibidas: (...args: any[]) => mockGetRetenciones(...args),
    importarRetencionRecibida: (...args: any[]) => mockImportar(...args),
    crearRetencionRecibidaManual: jest.fn(),
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { groups: ['Administrador'] }, loading: false, isAdmin: true }),
}));

import RetencionesRecibidasPage from '@/app/retenciones-recibidas/page';

describe('RetencionesRecibidasPage', () => {
  beforeEach(() => {
    mockGetRetenciones.mockReset();
    mockImportar.mockReset();
  });

  it('muestra la lista de retenciones cargadas', async () => {
    mockGetRetenciones.mockResolvedValue({
      count: 1, next: null, previous: null,
      results: [{
        id: 1, numero_documento: '001-001-000022947', fecha_emision: '2026-07-31',
        periodo_fiscal: '07/2026', ruc_agente_retencion: '1791350529001',
        razon_social_agente_retencion: 'ECUAEMPAQUES S.A', cliente_id: null,
        numero_factura_sustento: '001-002-000000005', factura_id: 46,
        total_retenido: '155.25', detalles: [],
      }],
    });
    render(<RetencionesRecibidasPage />);
    await waitFor(() => expect(screen.getByText('ECUAEMPAQUES S.A')).toBeTruthy());
    expect(screen.getByText('$155.25')).toBeTruthy();
  });

  it('importa una retención nueva por clave de acceso', async () => {
    mockGetRetenciones.mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
    mockImportar.mockResolvedValue({});
    render(<RetencionesRecibidasPage />);
    await waitFor(() => expect(mockGetRetenciones).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByText('Importar por clave de acceso'));
    const input = screen.getByPlaceholderText('49 dígitos de la clave de acceso');
    fireEvent.change(input, { target: { value: '3107202607179135052900120010010000229472510564815' } });
    fireEvent.click(screen.getByText('Importar'));

    await waitFor(() => expect(mockImportar).toHaveBeenCalledWith(
      '3107202607179135052900120010010000229472510564815'
    ));
  });

  it('rechaza una clave con longitud incorrecta sin llamar a la API', async () => {
    mockGetRetenciones.mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
    render(<RetencionesRecibidasPage />);
    await waitFor(() => expect(mockGetRetenciones).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByText('Importar por clave de acceso'));
    fireEvent.change(screen.getByPlaceholderText('49 dígitos de la clave de acceso'), { target: { value: '123' } });
    fireEvent.click(screen.getByText('Importar'));

    expect(await screen.findByText('La clave de acceso debe tener 49 dígitos.')).toBeTruthy();
    expect(mockImportar).not.toHaveBeenCalled();
  });

  it('muestra la etiqueta de origen en cada fila', async () => {
    mockGetRetenciones.mockResolvedValue({
      count: 2, next: null, previous: null,
      results: [
        {
          id: 1, origen: 'SRI', numero_documento: '001-001-000022947', fecha_emision: '2026-07-31',
          periodo_fiscal: '07/2026', ruc_agente_retencion: '1791350529001',
          razon_social_agente_retencion: 'ECUAEMPAQUES S.A', cliente_id: null,
          numero_factura_sustento: '001-002-000000005', factura_id: 46,
          total_retenido: '155.25', detalles: [],
        },
        {
          id: 2, origen: 'MANUAL', numero_documento: '001-001-000022305', fecha_emision: '2026-04-23',
          periodo_fiscal: '04/2026', ruc_agente_retencion: '1791350529001',
          razon_social_agente_retencion: 'ECUAEMPAQUES S.A', cliente_id: null,
          numero_factura_sustento: '001-001-000000001', factura_id: null,
          total_retenido: '155.25', detalles: [],
        },
      ],
    });
    render(<RetencionesRecibidasPage />);
    await waitFor(() => expect(screen.getByText('SRI')).toBeTruthy());
    expect(screen.getByText('Manual')).toBeTruthy();
  });
});

