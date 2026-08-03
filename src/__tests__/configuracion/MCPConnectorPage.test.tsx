/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
}));

const mockActivarConectorMCP = jest.fn();
let mockUser: any = { username: 'admin', groups: ['Administrador'], is_staff: false, is_superuser: false };
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ api: { activarConectorMCP: mockActivarConectorMCP }, user: mockUser }),
}));

// DashboardLayout arrastra AIChatWidget -> react-markdown (ESM puro) que
// Jest no transforma por default — se mockea acá, no en la config global,
// para no afectar al resto de la suite.
jest.mock('@/components/DashboardLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import MCPConnectorPage from '@/app/configuracion/mcp-connector/page';

beforeEach(() => {
  mockReplace.mockClear();
  mockActivarConectorMCP.mockReset();
  mockUser = { username: 'admin', groups: ['Administrador'], is_staff: false, is_superuser: false };
});

describe('MCPConnectorPage — gateo de rol', () => {
  it('un Administrador NO es redirigido', () => {
    render(<MCPConnectorPage />);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('un usuario sin rol Administrador es redirigido a /configuracion', () => {
    mockUser = { username: 'vendedor', groups: ['Vendedor'], is_staff: false, is_superuser: false };
    render(<MCPConnectorPage />);
    expect(mockReplace).toHaveBeenCalledWith('/configuracion');
  });
});

describe('MCPConnectorPage — activar conector', () => {
  it('al hacer click muestra usuario y contraseña', async () => {
    mockActivarConectorMCP.mockResolvedValue({
      username: 'mcp_persepolis', password: 'una-contrasena-larga', created: true,
    });

    render(<MCPConnectorPage />);
    fireEvent.click(screen.getByRole('button', { name: /activar conector mcp/i }));

    await waitFor(() => {
      expect(screen.getByText('mcp_persepolis')).toBeTruthy();
      expect(screen.getByText('una-contrasena-larga')).toBeTruthy();
    });
  });

  it('si el backend rechaza, muestra el mensaje de error', async () => {
    mockActivarConectorMCP.mockRejectedValue({
      message: 'No tienes el rol requerido para esta operación.', status: 403,
    });

    render(<MCPConnectorPage />);
    fireEvent.click(screen.getByRole('button', { name: /activar conector mcp/i }));

    await waitFor(() => {
      expect(screen.getByText(/no tienes el rol requerido/i)).toBeTruthy();
    });
  });
});
