/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import MovimientoDetailModal from '@/app/inventario/movimientos/components/MovimientoDetailModal';
import { Movimiento } from '@/app/inventario/movimientos/constants';

const base: Movimiento = {
  id: 1,
  producto_nombre: 'Ron Abuelo 750ml',
  sucursal_nombre: 'Matriz',
  tipo_movimiento: 'AJUSTE',
  cantidad: -3,
  saldo_posterior: 12,
  motivo:
    'Merma por vencimiento: 3 botellas lote A22 vencidas, se dieron de baja el 26/06 tras revisión de bodega.',
  usuario_nombre: 'luis',
  fecha: '2026-06-26T14:30:00Z',
};

describe('MovimientoDetailModal', () => {
  it('no renderiza nada cuando movimiento es null', () => {
    const { container } = render(
      <MovimientoDetailModal movimiento={null} onClose={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('muestra el motivo completo sin recortarlo', () => {
    render(<MovimientoDetailModal movimiento={base} onClose={() => {}} />);
    // El motivo largo aparece íntegro (la tabla lo recortaba; el modal no).
    expect(screen.getByText(base.motivo)).toBeTruthy();
    expect(screen.getByText('Ron Abuelo 750ml')).toBeTruthy();
  });

  it('muestra "Sin motivo registrado" cuando el motivo está vacío', () => {
    render(
      <MovimientoDetailModal
        movimiento={{ ...base, motivo: '   ' }}
        onClose={() => {}}
      />
    );
    expect(screen.getByText('Sin motivo registrado')).toBeTruthy();
  });
});
