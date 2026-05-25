'use client';

import { useEffect, useRef, useState } from 'react';
import POSLayout from '@/components/POSLayout';
import PortalModal from '@/components/ui/PortalModal';
import ShiftCloseModal from '@/components/ShiftCloseModal';
import { Tab } from './types';
import { usePOSTurno } from './hooks/usePOSTurno';
import { usePOSProducts } from './hooks/usePOSProducts';
import { usePOSCart } from './hooks/usePOSCart';
import { usePOSClient } from './hooks/usePOSClient';
import { usePOSPayment } from './hooks/usePOSPayment';
import { sriCalculator } from '@/lib/wasm/calculator';
import POSProductGrid from './components/POSProductGrid';
import POSCart from './components/POSCart';
import POSClientModal from './components/POSClientModal';
import POSSlotModal from './components/POSSlotModal';
import POSPaymentModal from './components/POSPaymentModal';

export default function POSPage() {
  const [activeTab, setActiveTab] = useState<Tab>('catalog');
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const searchInputRef = useRef<HTMLInputElement>(null);

  const tenant = typeof window !== 'undefined' ? window.location.hostname.split('.')[0] : '';
  const hasCashControl = ['persepolis'].includes(tenant);
  const [montoInicialInput, setMontoInicialInput] = useState<string>('35.00');

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2000);
  };

  const catalog = usePOSProducts(undefined);

  const turno = usePOSTurno((sucursalId) => {
    catalog.loadProductos('', sucursalId);
    catalog.loadCategorias();
  });

  // Carga el motor WASM una sola vez al montar el POS
  useEffect(() => {
    sriCalculator.init();
  }, []);

  useEffect(() => {
    if (turno.showShiftModal) {
      setMontoInicialInput(turno.efectivoSugerido.toFixed(2));
    }
  }, [turno.showShiftModal, turno.efectivoSugerido]);

  const cart = usePOSCart(turno.turno?.sucursal, showToast);
  const client = usePOSClient();
  const totals = cart.calculateTotals();

  const payment = usePOSPayment({
    items: cart.items,
    client: client.selected,
    turno: turno.turno,
    totals,
    onSaleComplete: () => {
      cart.reset();
      client.reset();
      catalog.loadProductos(catalog.searchTerm, undefined, catalog.selectedCategoria);
    },
    showToast,
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F10') { e.preventDefault(); client.setShowModal(true); }
      if (e.key === 'F9') { e.preventDefault(); payment.openModal(() => client.setShowModal(true)); }
      if (e.key === 'F2') { e.preventDefault(); searchInputRef.current?.focus(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart.items, totals]);

  // Initial load + header close event
  useEffect(() => {
    turno.checkTurno();
    const handleHeaderClose = () => turno.setShowClosingModal(true);
    window.addEventListener('pos:close-turno', handleHeaderClose);
    return () => window.removeEventListener('pos:close-turno', handleHeaderClose);
  }, []);

  if (turno.loading) {
    return (
      <POSLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Verificando turno...</p>
        </div>
      </POSLayout>
    );
  }

  return (
    <POSLayout>
      <div className="flex flex-col h-full overflow-hidden bg-gray-100">

        {/* Mobile tab navigation */}
        <div className="md:hidden flex bg-white border-b shrink-0">
          <button onClick={() => setActiveTab('catalog')} className={`flex-1 py-3 text-sm font-bold ${activeTab === 'catalog' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>
            Catálogo
          </button>
          <button onClick={() => setActiveTab('cart')} className={`flex-1 py-3 text-sm font-bold ${activeTab === 'cart' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>
            Carrito ({cart.items.reduce((a, b) => a + b.cantidad, 0)})
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {!turno.turno ? (
            // Caja cerrada
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-center p-8">
              <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
                <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">🏪</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Caja Cerrada</h2>
                <p className="text-gray-500 mb-8">No tienes un turno activo. Para comenzar a vender, abre un turno.</p>
                <div className="space-y-3">
                  <button onClick={() => { turno.loadSucursales(); turno.setShowShiftModal(true); }} className="w-full bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-0.5">
                    Abrir Turno
                  </button>
                  <button onClick={() => window.history.back()} className="w-full text-gray-500 hover:text-gray-700 font-medium text-sm">
                    Volver al Dashboard
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className={`flex-1 flex flex-col md:flex ${activeTab === 'cart' ? 'hidden' : 'block'}`}>
                <POSProductGrid
                  searchTerm={catalog.searchTerm}
                  onSearch={catalog.handleSearch}
                  searchInputRef={searchInputRef}
                  productos={catalog.productos}
                  loadingProducts={catalog.loading}
                  categorias={catalog.categorias}
                  selectedCategoria={catalog.selectedCategoria}
                  showCategoryDrawer={catalog.showCategoryDrawer}
                  setShowCategoryDrawer={catalog.setShowCategoryDrawer}
                  onSelectCategoria={catalog.handleSelectCategoria}
                  combos={catalog.combos}
                  onAddToCart={cart.addToCart}
                  onAddCombo={cart.addComboToCart}
                  showToast={showToast}
                />
              </div>
              <div className={`md:flex ${activeTab === 'catalog' ? 'hidden' : 'flex-1'}`}>
                <POSCart
                  items={cart.items}
                  totals={totals}
                  client={client.selected}
                  onOpenClientModal={() => client.setShowModal(true)}
                  onCartItemClick={cart.handleCartItemClick}
                  onUpdateQuantity={cart.updateQuantity}
                  onRemoveFromCart={cart.removeFromCart}
                  onOpenPayment={() => payment.openModal(() => client.setShowModal(true))}
                  procesando={payment.procesando}
                />
              </div>
            </>
          )}
        </div>

        {/* Toast */}
        {toast.visible && (
          <div className="fixed bottom-20 md:bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center animate-fade-in-up">
            <span className="text-xl mr-2">✅</span>
            <span className="font-semibold">{toast.message}</span>
          </div>
        )}

        {/* Presentation selection modal */}
        <PortalModal isOpen={cart.showPresModal} onClose={() => cart.setShowPresModal(false)}>
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 max-w-lg w-full rounded-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {cart.targetCartIndex !== null ? 'Cambiar Presentación' : 'Seleccionar Presentación'}
            </h3>
            <p className="text-gray-500 mb-4 text-sm">Producto: <span className="font-bold text-gray-800">{cart.productToSelect?.nombre}</span></p>
            <div className="grid grid-cols-1 gap-3 max-h-[60vh] overflow-y-auto">
              {cart.availablePresentations.map(pres => (
                <button
                  key={pres.id}
                  onClick={() => cart.productToSelect && cart.addPresentationToCart(cart.productToSelect, pres)}
                  className="flex justify-between items-center p-4 border rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all text-left"
                >
                  <div>
                    <div className="font-bold text-gray-800">{pres.nombre_presentacion}</div>
                    <div className="text-xs text-gray-500">Contiene: {pres.cantidad} unidades</div>
                  </div>
                  <div className="text-lg font-bold text-blue-600">${pres.precio}</div>
                </button>
              ))}
            </div>
            <div className="mt-4 text-right">
              <button onClick={() => cart.setShowPresModal(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700 font-medium">Cancelar</button>
            </div>
          </div>
        </PortalModal>

        {/* Slot modal */}
        <POSSlotModal
          show={cart.showSlotModal}
          pendingCombo={cart.pendingCombo}
          slotOpciones={cart.slotOpciones}
          slotSelections={cart.slotSelections}
          setSlotSelections={cart.setSlotSelections}
          loadingSlots={cart.loadingSlots}
          slotError={cart.slotError}
          onConfirm={cart.handleConfirmSlots}
          onCancel={() => { cart.setShowSlotModal(false); }}
        />

        {/* Client modal */}
        <POSClientModal
          isOpen={client.showModal}
          onClose={() => client.setShowModal(false)}
          searchTerm={client.searchTerm}
          searchResults={client.searchResults}
          searching={client.searching}
          onSearch={client.handleSearch}
          onSelect={client.handleSelect}
          newClientMode={client.newClientMode}
          setNewClientMode={client.setNewClientMode}
          newClientData={client.newClientData}
          setNewClientData={client.setNewClientData}
          saving={client.saving}
          onSave={client.handleSave}
        />

        {/* Payment modal */}
        <POSPaymentModal
          isOpen={payment.showModal}
          onClose={() => payment.setShowModal(false)}
          totals={totals}
          payments={payment.payments}
          paymentMethod={payment.paymentMethod}
          setPaymentMethod={payment.setPaymentMethod}
          paymentAmount={payment.paymentAmount}
          setPaymentAmount={payment.setPaymentAmount}
          esInterno={payment.esInterno}
          setEsInterno={payment.setEsInterno}
          totalPagado={payment.totalPagado}
          procesando={payment.procesando}
          onAddPayment={payment.addPayment}
          onRemovePayment={payment.removePayment}
          onProcessSale={payment.processSale}
        />

        {/* Shift modals */}
        <PortalModal isOpen={turno.showShiftModal} onClose={() => turno.setShowShiftModal(false)}>
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-2">Iniciar Turno de Caja</h3>
            <p className="text-gray-600 mb-4">Para realizar ventas, primero debes abrir un turno en una sucursal.</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Sucursal</label>
              <select className="w-full p-2 border rounded" value={turno.selectedSucursal || ''} onChange={e => turno.setSelectedSucursal(Number(e.target.value))}>
                {turno.sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
            {hasCashControl && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto Inicial de Caja ($)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full p-2 border rounded font-bold text-gray-900"
                  value={montoInicialInput}
                  onChange={e => setMontoInicialInput(e.target.value)}
                  placeholder="35.00"
                />
                <p className="text-xs text-gray-500 mt-1">Efectivo sugerido en base al cierre anterior.</p>
              </div>
            )}
            <div className="flex justify-end pt-4">
              <button
                onClick={() => {
                  const monto = hasCashControl ? parseFloat(montoInicialInput) || 0 : 0;
                  turno.handleOpenTurno(monto);
                }}
                disabled={!turno.selectedSucursal || turno.opening}
                className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700 disabled:opacity-50"
              >
                {turno.opening ? 'Abriendo...' : 'Abrir Turno'}
              </button>
            </div>
          </div>
        </PortalModal>

        <ShiftCloseModal
          isOpen={turno.showClosingModal}
          onClose={() => turno.setShowClosingModal(false)}
          onConfirm={data => turno.handleConfirmCloseTurno(data, () => { cart.reset(); client.reset(); })}
        />
      </div>
    </POSLayout>
  );
}
