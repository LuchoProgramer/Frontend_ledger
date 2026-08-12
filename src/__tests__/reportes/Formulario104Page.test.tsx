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

const mockGetReporte = jest.fn();

jest.mock('@/lib/api', () => ({
  getApiClient: () => ({
    getReporteFormulario104: (...args: any[]) => mockGetReporte(...args),
    getSucursalesList: jest.fn().mockResolvedValue({ results: [] }),
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { groups: ['Administrador'] }, loading: false, isAdmin: true }),
}));

import ReporteFormulario104Page from '@/app/reportes/formulario-104/page';

describe('ReporteFormulario104Page', () => {
  beforeEach(() => mockGetReporte.mockReset());

  it('consulta y muestra el reporte con las fechas seleccionadas', async () => {
    mockGetReporte.mockResolvedValue({
      ventas_por_tarifa: [{ tarifa_iva: '15.00', base_imponible: '100.00', iva_generado: '15.00' }],
      compras_por_tarifa: [],
      retenciones_iva_recibidas: '0.00',
      iva_a_pagar: '15.00',
    });
    render(<ReporteFormulario104Page />);

    const [startInput, endInput] = screen.getAllByDisplayValue('');
    fireEvent.change(startInput, { target: { value: '2026-08-01' } });
    fireEvent.change(endInput, { target: { value: '2026-08-31' } });
    fireEvent.click(screen.getByText('Consultar'));

    await waitFor(() => {
      expect(mockGetReporte).toHaveBeenCalledWith({
        start_date: '2026-08-01', end_date: '2026-08-31', sucursal_id: undefined,
      });
    });
    expect(screen.queryByText('IVA a pagar')).toBeTruthy();
  });
});
