/**
 * @jest-environment jsdom
 */
// Pantalla de diagnóstico de la cola offline: el ⚠ del header abre este modal
// para que el operador (o Luis por teléfono) vea QUÉ venta quedó atascada y por qué,
// sin necesitar ADB/DevTools en la tablet (incidente ⚠ la_huequita 2026-07-16).
import 'fake-indexeddb/auto';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { posDB } from '@/lib/db/posDB';
import OfflineQueueModal from '@/app/pos/components/OfflineQueueModal';

beforeEach(async () => {
  await posDB.ventas_offline.clear();
});

const seedError = () =>
  posDB.ventas_offline.add({
    turno_id: 97,
    sucursal_id: 1,
    payload: JSON.stringify({ venta_uuid: 'abc' }),
    receipt_data: JSON.stringify({
      cliente: 'CONSUMIDOR FINAL',
      total: 12.5,
      items: [{ nombre: 'ZHUMIR', cantidad: 2, precio: 6.25, subtotal: 12.5 }],
    }),
    estado: 'ERROR_SYNC' as const,
    created_at: Date.now(),
    error_msg: 'Bad Request',
  });

describe('OfflineQueueModal', () => {
  it('muestra la venta con error, su total y el motivo del rechazo', async () => {
    await seedError();
    render(<OfflineQueueModal isOpen onClose={jest.fn()} />);

    expect(await screen.findByText(/CONSUMIDOR FINAL/)).toBeTruthy();
    expect(screen.getByText('$12.50')).toBeTruthy();
    expect(screen.getByText(/Bad Request/)).toBeTruthy();
    expect(screen.getByText(/2× ZHUMIR/)).toBeTruthy();
  });

  it('Reintentar re-encola la venta y dispara onRetry', async () => {
    const id = (await seedError()) as number;
    const onRetry = jest.fn();
    render(<OfflineQueueModal isOpen onClose={jest.fn()} onRetry={onRetry} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));

    await waitFor(async () => {
      expect((await posDB.ventas_offline.get(id))?.estado).toBe('PENDIENTE');
    });
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('Descartar pide confirmación y recién entonces borra', async () => {
    const id = (await seedError()) as number;
    render(<OfflineQueueModal isOpen onClose={jest.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Descartar' }));
    // Primera pulsación NO borra — aparece la confirmación
    expect(await posDB.ventas_offline.get(id)).toBeTruthy();

    fireEvent.click(await screen.findByRole('button', { name: /Seguro/ }));
    await waitFor(async () => {
      expect(await posDB.ventas_offline.get(id)).toBeUndefined();
    });
  });

  it('sin ventas atascadas muestra el estado vacío', async () => {
    render(<OfflineQueueModal isOpen onClose={jest.fn()} />);
    expect(await screen.findByText(/No hay ventas pendientes ni con error/)).toBeTruthy();
  });
});
