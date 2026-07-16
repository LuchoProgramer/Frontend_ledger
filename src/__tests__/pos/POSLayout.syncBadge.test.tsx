/**
 * @jest-environment jsdom
 */
// El badge ⚡ (ventas pendientes de sincronizar) debe ser tocable: la cajera puede
// forzar la sincronización sin minimizar el navegador (incidente ⚡ 2026-07-16).
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { username: 'emili', first_name: 'Emili' }, logout: jest.fn(), loading: false }),
}));

import POSLayout from '@/components/POSLayout';

beforeEach(() => {
  localStorage.setItem('activeTurno', JSON.stringify({ sucursal_nombre: 'Sucursal 1' }));
});

describe('POSLayout — badge ⚡ de ventas pendientes', () => {
  it('es un botón que dispara onSyncPending al tocarlo', () => {
    const onSyncPending = jest.fn();
    render(
      <POSLayout pendingCount={1} onSyncPending={onSyncPending}>
        <div />
      </POSLayout>
    );

    fireEvent.click(screen.getByRole('button', { name: /sincronizar/i }));
    expect(onSyncPending).toHaveBeenCalledTimes(1);
  });

  it('sin ventas pendientes no muestra el badge', () => {
    render(
      <POSLayout pendingCount={0} onSyncPending={jest.fn()}>
        <div />
      </POSLayout>
    );
    expect(screen.queryByRole('button', { name: /sincronizar/i })).toBeNull();
  });
});

describe('POSLayout — badge ⚠ de ventas con error', () => {
  it('es un botón que dispara onShowErrors al tocarlo', () => {
    const onShowErrors = jest.fn();
    render(
      <POSLayout errorCount={1} onShowErrors={onShowErrors}>
        <div />
      </POSLayout>
    );

    fireEvent.click(screen.getByRole('button', { name: /ventas con error/i }));
    expect(onShowErrors).toHaveBeenCalledTimes(1);
  });

  it('sin errores no muestra el badge', () => {
    render(
      <POSLayout errorCount={0} onShowErrors={jest.fn()}>
        <div />
      </POSLayout>
    );
    expect(screen.queryByRole('button', { name: /ventas con error/i })).toBeNull();
  });
});
