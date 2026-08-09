/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ClientesPage from '@/app/clientes/page';

// Gotcha conocido del repo: cualquier página envuelta en DashboardLayout
// revienta en Jest por react-markdown (importado vía AIChatWidget) si no
// se mockea. Ver reference_jest_dashboardlayout_react_markdown (memoria).
jest.mock('@/components/DashboardLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockGetClientes = jest.fn();
const mockAbonarCliente = jest.fn();

jest.mock('@/lib/api', () => ({
  getApiClient: () => ({
    getClientes: (...args: any[]) => mockGetClientes(...args),
    abonarCliente: (...args: any[]) => mockAbonarCliente(...args),
    crearCliente: jest.fn(),
    actualizarCliente: jest.fn(),
    setLimiteCredito: jest.fn(),
    getMovimientosCuenta: jest.fn().mockResolvedValue([]),
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { is_staff: false, is_superuser: false, groups: ['Vendedor'] },
    loading: false,
  }),
}));

describe('ClientesPage', () => {
  beforeEach(() => {
    mockGetClientes.mockReset();
    mockAbonarCliente.mockReset();
  });

  it('renderiza la lista de clientes', async () => {
    mockGetClientes.mockResolvedValue({
      count: 1, next: null, previous: null,
      results: [{
        id: 1, tipo_identificacion: '05', identificacion: '0987654321',
        razon_social: 'Cliente Test', saldo_pendiente: '0.00', limite_credito: null,
      }],
    });
    render(<ClientesPage />);
    await waitFor(() => {
      expect(screen.queryByText('Cliente Test')).toBeTruthy();
    });
  });

  it('el boton Abonar solo aparece si hay saldo pendiente', async () => {
    mockGetClientes.mockResolvedValue({
      count: 2, next: null, previous: null,
      results: [
        { id: 1, tipo_identificacion: '05', identificacion: '111', razon_social: 'Sin deuda', saldo_pendiente: '0.00', limite_credito: null },
        { id: 2, tipo_identificacion: '05', identificacion: '222', razon_social: 'Con deuda', saldo_pendiente: '30.00', limite_credito: null },
      ],
    });
    render(<ClientesPage />);
    await waitFor(() => {
      expect(screen.queryByText('Con deuda')).toBeTruthy();
    });
    const botonesAbonar = screen.queryAllByText('Abonar');
    expect(botonesAbonar.length).toBe(1);
  });

  it('el modal de abonar llama a abonarCliente con los datos correctos', async () => {
    mockGetClientes.mockResolvedValue({
      count: 1, next: null, previous: null,
      results: [{ id: 5, tipo_identificacion: '05', identificacion: '333', razon_social: 'Deudor', saldo_pendiente: '50.00', limite_credito: null }],
    });
    mockAbonarCliente.mockResolvedValue({ saldo_pendiente: '20.00' });

    render(<ClientesPage />);
    await waitFor(() => expect(screen.queryByText('Deudor')).toBeTruthy());

    fireEvent.click(screen.getByText('Abonar'));
    const montoInput = screen.getByPlaceholderText('Monto');
    fireEvent.change(montoInput, { target: { value: '30' } });
    fireEvent.click(screen.getByText('Registrar Abono'));

    await waitFor(() => {
      expect(mockAbonarCliente).toHaveBeenCalledWith(5, { monto: '30', metodo_pago: '01' });
    });
  });
});
