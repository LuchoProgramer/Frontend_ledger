/** @jest-environment jsdom */
import React, { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import POSProductGrid from '@/app/pos/components/POSProductGrid';
import { Producto } from '@/lib/types/productos';

const producto = { id: 1, nombre: 'Cerveza', stock: 12, precio_default: 2.5 } as unknown as Producto;

const baseProps = () => ({
  searchTerm: '',
  onSearch: () => {},
  searchInputRef: createRef<HTMLInputElement>(),
  productos: [producto],
  loadingProducts: false,
  categorias: [],
  selectedCategoria: null,
  showCategoryDrawer: false,
  setShowCategoryDrawer: () => {},
  onSelectCategoria: () => {},
  combos: [],
  onAddToCart: () => {},
  onAddCombo: () => {},
  showToast: () => {},
});

describe('POSProductGrid — stock por-tenant', () => {
  it('muestra "Stock: 12" cuando mostrarStock=true', () => {
    render(<POSProductGrid {...baseProps()} mostrarStock={true} />);
    expect(screen.getByText(/Stock:\s*12/)).toBeTruthy();
  });

  it('NO muestra el stock cuando mostrarStock=false (default)', () => {
    render(<POSProductGrid {...baseProps()} mostrarStock={false} />);
    expect(screen.queryByText(/Stock:\s*12/)).toBeNull();
  });

  it('NO muestra el stock cuando el prop está ausente', () => {
    render(<POSProductGrid {...baseProps()} />);
    expect(screen.queryByText(/Stock:/)).toBeNull();
  });
});
