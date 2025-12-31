'use client';

import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getApiClient } from '@/lib/api';
import { Producto, Presentacion } from '@/lib/types/productos';
import { SucursalSimple } from '@/lib/types/usuarios';
import PortalModal from '@/components/ui/PortalModal';

// Tipos locales
interface CartItem {
  producto: Producto;
  presentacion: Presentacion;
  cantidad: number;
  precio: number;
  subtotal: number;
  impuesto: number;
  total: number;
}

interface ClientData {
  id?: number;
  tipo_identificacion?: string;
  identificacion: string;
  razon_social: string;
  email: string;
  direccion: string;
}

interface Turno {
  id: number;
  sucursal: number;
  sucursal_nombre: string;
  inicio_turno: string;
}

type Tab = 'catalog' | 'cart';

export default function POSPage() {
  // Application State
  const [turno, setTurno] = useState<Turno | null>(null);
  const [loadingTurno, setLoadingTurno] = useState(true);

  // Data State
  const [sucursales, setSucursales] = useState<SucursalSimple[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [client, setClient] = useState<ClientData>({
    identificacion: '9999999999',
    razon_social: 'CONSUMIDOR FINAL',
    email: '',
    direccion: ''
  });

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('catalog');
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [selectedSucursal, setSelectedSucursal] = useState<number | null>(null);

  // Client Modal State
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [clientSearchResults, setClientSearchResults] = useState<ClientData[]>([]);
  const [searchingClients, setSearchingClients] = useState(false);
  const [newClientMode, setNewClientMode] = useState(false);
  const [newClientData, setNewClientData] = useState<ClientData>({
    tipo_identificacion: '05',
    identificacion: '',
    razon_social: '',
    email: '',
    direccion: ''
  });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const apiClient = getApiClient();

  // Initial Load
  useEffect(() => {
    checkTurno();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Client Actions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F10') {
        e.preventDefault();
        setShowClientModal(true);
      }
      if (e.key === 'F9') {
        e.preventDefault();
        handleCheckout();
      }
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart]);

  const checkTurno = async () => {
    setLoadingTurno(true);
    try {
      const res = await apiClient.verificarTurno();
      if (res.success && res.activo && res.data) {
        setTurno(res.data);
        // Important: Pass sucursal ID explicitly because state update is async
        loadProductos('', res.data.sucursal);
      } else {
        setTurno(null);
        await loadSucursales();
        setShowShiftModal(true);
      }
    } catch (e) {
      console.error('Error checking turno:', e);
    } finally {
      setLoadingTurno(false);
    }
  };

  const loadSucursales = async () => {
    try {
      const res = await apiClient.getSucursales();
      if (res.success && res.sucursales) {
        setSucursales(res.sucursales);
        if (res.sucursales.length > 0) {
          setSelectedSucursal(res.sucursales[0].id);
        }
      }
    } catch (e) {
      console.error('Error loading sucursales', e);
    }
  };

  const loadProductos = async (search = '', sucursalId?: number) => {
    setLoadingProducts(true);
    try {
      // Determine which sucursal ID to use: passed arg -> active shift -> null
      const targetSucursal = sucursalId || turno?.sucursal;

      const res = await apiClient.getProductos({
        search,
        page_size: 20,
        activo: true,
        sucursal: targetSucursal
      });
      setProductos(res.results || res.data || []);
    } catch (error) {
      console.error('Error loading products', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Turno Actions
  const handleOpenTurno = async () => {
    if (!selectedSucursal) return alert('Seleccione una sucursal');
    try {
      const res = await apiClient.abrirTurno(selectedSucursal);
      if (res.success) {
        setTurno(res.data);
        setShowShiftModal(false);
        loadProductos('', selectedSucursal); // Load for fresh sucursal
      }
    } catch (e: any) {
      alert(e.message || 'Error al abrir turno');
    }
  };

  const handleCloseTurno = async () => {
    if (!confirm('¿Está seguro de cerrar el turno actual? Se generará el corte de caja.')) return;
    try {
      await apiClient.cerrarTurno({
        efectivo_total: totals.total,
        tarjeta_total: 0,
        transferencia_total: 0,
        salidas_caja: 0
      });
      setTurno(null);
      setCart([]);
      setClient({ identificacion: '9999999999', razon_social: 'CONSUMIDOR FINAL', email: '', direccion: '' });
      await loadSucursales();
      setShowShiftModal(true);
    } catch (e: any) {
      alert(e.message || 'Error al cerrar turno');
    }
  };

  const allowedToClose = useRef(false); // Ref to prevent double invocation if using strict mode or weird events

  // Cart Actions
  const addToCart = async (producto: Producto) => {
    const stockActual = producto.stock ?? 0;

    if (stockActual <= 0) {
      alert('Producto agotado');
      return;
    }

    let presentacion: Presentacion;
    try {
      const presRes = await apiClient.getPresentaciones(producto.id);
      if (presRes.data && presRes.data.length > 0) {
        presentacion = presRes.data[0];
      } else {
        alert('Este producto no tiene presentaciones/precios definidos');
        return;
      }
    } catch (e) {
      console.error(e);
      return;
    }

    setCart(prev => {
      const currentQtyInCart = prev.find(i => i.producto.id === producto.id)?.cantidad || 0;
      if (currentQtyInCart + 1 > stockActual) {
        alert(`No puedes agregar más de ${stockActual} unidades.`);
        return prev;
      }

      const existing = prev.find(item => item.producto.id === producto.id && item.presentacion.id === presentacion.id);
      if (existing) {
        return prev.map(item => {
          if (item.producto.id === producto.id && item.presentacion.id === presentacion.id) {
            const newQty = item.cantidad + 1;
            const precioBase = Number(presentacion.precio);
            return {
              ...item,
              cantidad: newQty,
              subtotal: newQty * precioBase,
              total: newQty * precioBase
            };
          }
          return item;
        });
      }

      const precio = Number(presentacion.precio);
      return [...prev, {
        producto,
        presentacion,
        cantidad: 1,
        precio,
        subtotal: precio,
        impuesto: 0, // Should calculate real tax if needed
        total: precio
      }];
    });
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    return cart.reduce((acc, item) => {
      acc.subtotal += item.subtotal;
      acc.total += item.total;
      acc.impuesto += item.impuesto;
      return acc;
    }, { subtotal: 0, total: 0, impuesto: 0 });
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setProcesando(true);
    try {
      if (calculateTotals().total > 50 && client.identificacion === '9999999999') {
        alert("Para ventas mayores a $50, debe ingresar los datos del cliente (Facturación Electrónica).");
        setShowClientModal(true);
        return;
      }

      const payload = {
        cliente: client,
        items: cart.map(item => ({
          id: item.producto.id,
          presentacion_id: item.presentacion.id,
          cantidad: item.cantidad,
          precio: item.precio
        })),
        pago: {
          codigo: '01',
          total: calculateTotals().total
        }
      };

      const res = await apiClient.crearFacturaPOS(payload);
      alert(`Venta registrada.\nFactura Electrónica: ${res.estado_sri === 'PPR' ? 'En Procesamiento' : res.estado_sri}\nClave Acceso: ${res.clave_acceso}`);
      setCart([]);
      setClient({ identificacion: '9999999999', razon_social: 'CONSUMIDOR FINAL', email: '', direccion: '' });
      loadProductos(searchTerm);
    } catch (error: any) {
      const msg = error?.errorMessage || error?.message || 'Error al procesar venta';
      alert(msg);
    } finally {
      setProcesando(false);
    }
  };

  const totals = calculateTotals();

  if (loadingTurno) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Verificando turno...</p>
        </div>
      </DashboardLayout>
    );
  }



  const handleClientSearch = async (term: string) => {
    setClientSearchTerm(term);
    if (term.length < 3) return;

    setSearchingClients(true);
    try {
      const res = await apiClient.getClientes({ search: term });
      setClientSearchResults(res.results || res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setSearchingClients(false);
    }
  };



  const handleSelectClient = (c: ClientData) => {
    // Robustez: Asegurar que c sea el objeto de datos, no un wrapper
    const clienteReal = (c as any).data || (c as any).results || c;

    if (!clienteReal.identificacion && !clienteReal.razon_social) {
      console.warn('Posible objeto cliente inválido recibido:', c);
    }

    setClient(clienteReal);
    setShowClientModal(false);
    setClientSearchTerm('');
    setClientSearchResults([]);
    setNewClientMode(false);
  };

  const handleSaveNewClient = async () => {
    if (!newClientData.identificacion || !newClientData.razon_social || !newClientData.email) {
      alert("Complete los campos obligatorios (*)");
      return;
    }

    try {
      const res = await apiClient.crearCliente(newClientData);

      // Determinar si la respuesta viene envuelta
      const clienteCreado = res.data || res;

      handleSelectClient(clienteCreado);
      alert(`Cliente creado y seleccionado: ${clienteCreado.razon_social}`);
    } catch (e: any) {
      console.error('Error creating client:', e);
      const errorDetail = e.data ? JSON.stringify(e.data, null, 2) : e.message;
      alert(`Error al crear cliente (${e.status || 'N/A'}):\n${errorDetail}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-gray-100">

        {/* Info Bar / Shift Status */}
        {turno && (
          <div className="bg-indigo-900 text-white px-4 py-2 flex justify-between items-center text-sm shadow-md z-10 shrink-0">
            <div className="flex gap-4">
              <span><strong>Sucursal:</strong> {turno.sucursal_nombre}</span>
              <span className="hidden md:inline">|</span>
              <span className="hidden md:inline"><strong>Inicio:</strong> {new Date(turno.inicio_turno).toLocaleString()}</span>
            </div>
            <div>
              <button
                onClick={handleCloseTurno}
                className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-xs font-bold transition-colors"
              >
                Cerrar Turno / Cambiar Sucursal
              </button>
            </div>
          </div>
        )}

        {/* Mobile Tab Navigation */}
        <div className="md:hidden flex bg-white border-b shrink-0">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex-1 py-3 text-sm font-bold ${activeTab === 'catalog' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          >
            Catálogo
          </button>
          <button
            onClick={() => setActiveTab('cart')}
            className={`flex-1 py-3 text-sm font-bold ${activeTab === 'cart' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          >
            Carrito ({cart.reduce((a, b) => a + b.cantidad, 0)})
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {!turno ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-center p-8">
              <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
                <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">🏪</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Caja Cerrada</h2>
                <p className="text-gray-500 mb-8">
                  No tienes un turno activo en este momento. Para comenzar a realizar ventas, debes abrir un turno en una sucursal.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      loadSucursales();
                      setShowShiftModal(true);
                    }}
                    className="w-full bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-0.5"
                  >
                    Abrir Turno
                  </button>
                  <button
                    onClick={() => window.history.back()}
                    className="w-full text-gray-500 hover:text-gray-700 font-medium text-sm"
                  >
                    Volver al Dashboard
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Left Side: Product Grid */}
              <div className={`flex-1 flex flex-col p-4 bg-gray-50 md:flex ${activeTab === 'cart' ? 'hidden' : 'block'}`}>
                <div className="mb-4">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Buscar producto (Código o Nombre) - F2"
                    className="w-full p-3 border rounded-lg shadow-sm text-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      loadProductos(e.target.value);
                    }}
                  />
                </div>

                <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 content-start pb-20">
                  {loadingProducts ? (
                    <div className="col-span-full text-center py-10">Cargando productos...</div>
                  ) : productos.map(prod => {
                    const stock = prod.stock ?? 0;
                    const hasStock = stock > 0;

                    return (
                      <div
                        key={prod.id}
                        onClick={() => hasStock && addToCart(prod)}
                        className={`
                          relative p-4 rounded-xl shadow-sm transition-all flex flex-col justify-between h-40 border
                          ${hasStock
                            ? 'bg-white hover:shadow-md cursor-pointer border-transparent hover:border-blue-300'
                            : 'bg-gray-100 cursor-not-allowed border-gray-200 opacity-70'}
                        `}
                      >
                        {!hasStock && (
                          <div className="absolute top-2 right-2 bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full z-10">
                            AGOTADO
                          </div>
                        )}
                        {hasStock && stock <= 5 && (
                          <div className="absolute top-2 right-2 bg-orange-100 text-orange-600 text-xs font-bold px-2 py-1 rounded-full z-10">
                            {stock} left
                          </div>
                        )}

                        <div>
                          <div className="text-xs text-gray-500 mb-1">{prod.codigo_producto || 'S/C'}</div>
                          <h3 className="font-semibold text-gray-800 line-clamp-2 leading-tight">{prod.nombre}</h3>
                        </div>
                        <div className="mt-2 flex justify-between items-end">
                          <div className="text-xs text-gray-500">
                            Stock: <span className={hasStock ? 'text-gray-700' : 'text-red-500'}>{formatStock(stock)}</span>
                          </div>
                          <span className="text-lg font-bold text-blue-600 block">$ -</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Side: Cart */}
              <div className={`w-full md:w-[400px] flex flex-col bg-white shadow-xl md:flex ${activeTab === 'catalog' ? 'hidden' : 'block'}`}>
                <div className="p-4 border-b bg-gray-50">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cliente (F10)</label>
                  <div className="flex items-center justify-between mt-1">
                    <div>
                      <div className="font-bold text-gray-800">{client.razon_social}</div>
                      <div className="text-sm text-gray-500">{client.identificacion}</div>
                    </div>
                    <button
                      onClick={() => setShowClientModal(true)}
                      className="text-blue-600 hover:bg-blue-50 p-2 rounded text-sm font-semibold"
                    >
                      Cambiar
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {cart.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center p-4">
                      <span className="block text-4xl mb-2">🛒</span>
                      <span>Carrito vacío</span>
                    </div>
                  )}
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg group">
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">{item.producto.nombre}</div>
                        <div className="text-xs text-gray-500">{item.presentacion.nombre_presentacion}</div>
                        <div className="text-sm">
                          <span className="font-bold">{item.cantidad}</span> x ${item.precio.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-800">${item.total.toFixed(2)}</div>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFromCart(idx); }}
                          className="text-red-400 hover:text-red-600 text-xs mt-1 p-1"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t bg-gray-50">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Subtotal</span>
                    <span>${totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 mb-3">
                    <span>IVA</span>
                    <span>${totals.impuesto.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-2xl font-bold text-gray-800 mb-4">
                    <span>Total</span>
                    <span>${totals.total.toFixed(2)}</span>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={cart.length === 0 || procesando}
                    className="w-full bg-blue-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-200"
                  >
                    {procesando ? 'Procesando...' : 'COBRAR (F9)'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Start Shift Modal */}
        <PortalModal isOpen={showShiftModal} onClose={() => setShowShiftModal(false)}>
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-2">Iniciar Turno de Caja</h3>
            <p className="text-gray-600 mb-4">Para realizar ventas, primero debes abrir un turno en una sucursal.</p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Sucursal</label>
              <select
                className="w-full p-2 border rounded"
                value={selectedSucursal || ''}
                onChange={e => setSelectedSucursal(Number(e.target.value))}
              >
                {sucursales.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={handleOpenTurno}
                disabled={!selectedSucursal}
                className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700 disabled:opacity-50"
              >
                Abrir Turno
              </button>
            </div>
          </div>
        </PortalModal>

        {/* Client Modal */}
        <PortalModal isOpen={showClientModal} onClose={() => setShowClientModal(false)}>
          <div className="bg-white w-full max-w-2xl mx-auto rounded-lg shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">
                {newClientMode ? 'Nuevo Cliente' : 'Buscar Cliente'}
              </h3>
              {!newClientMode && (
                <button
                  onClick={() => setNewClientMode(true)}
                  className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 font-medium"
                >
                  + Crear Nuevo
                </button>
              )}
              {newClientMode && (
                <button
                  onClick={() => setNewClientMode(false)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancelar
                </button>
              )}
            </div>

            <div className="p-6">
              {newClientMode ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tipo Indentificación *</label>
                      <select
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                        value={newClientData.tipo_identificacion}
                        onChange={e => setNewClientData({ ...newClientData, tipo_identificacion: e.target.value })}
                      >
                        <option value="05">Cédula</option>
                        <option value="04">RUC</option>
                        <option value="06">Pasaporte</option>
                        <option value="07">Consumidor Final</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Identificación *</label>
                      <input
                        autoFocus
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                        value={newClientData.identificacion}
                        onChange={e => setNewClientData({ ...newClientData, identificacion: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Razón Social *</label>
                      <input
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                        value={newClientData.razon_social}
                        onChange={e => setNewClientData({ ...newClientData, razon_social: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email * (Para Factura Electrónica)</label>
                    <input
                      type="email"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                      value={newClientData.email}
                      onChange={e => setNewClientData({ ...newClientData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Dirección</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                      value={newClientData.direccion}
                      onChange={e => setNewClientData({ ...newClientData, direccion: e.target.value })}
                    />
                  </div>

                  <div className="pt-4 flex justify-end gap-3">
                    <button
                      onClick={() => setNewClientMode(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Volver
                    </button>
                    <button
                      onClick={handleSaveNewClient}
                      className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Guardar y Seleccionar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <input
                    autoFocus
                    type="text"
                    className="w-full p-3 border rounded-lg shadow-sm text-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Escribe cédula, RUC o nombre..."
                    value={clientSearchTerm}
                    onChange={e => handleClientSearch(e.target.value)}
                  />

                  <div className="max-h-60 overflow-y-auto border rounded-md">
                    {searchingClients && <div className="p-4 text-center text-gray-500">Buscando...</div>}
                    {!searchingClients && clientSearchResults.length === 0 && clientSearchTerm.length > 2 && (
                      <div className="p-4 text-center text-gray-500">
                        No se encontraron clientes.
                        <button
                          onClick={() => {
                            setNewClientData(prev => ({ ...prev, identificacion: clientSearchTerm }));
                            setNewClientMode(true);
                          }}
                          className="text-blue-600 font-bold ml-1 hover:underline"
                        >
                          Crear nuevo
                        </button>
                      </div>
                    )}
                    {clientSearchResults.map(c => (
                      <div
                        key={c.id}
                        onClick={() => handleSelectClient(c)}
                        className="p-3 hover:bg-indigo-50 cursor-pointer border-b last:border-b-0 flex justify-between items-center"
                      >
                        <div>
                          <div className="font-bold text-gray-800">{c.razon_social}</div>
                          <div className="text-sm text-gray-500">{c.identificacion} • {c.email}</div>
                        </div>
                        <span className="text-indigo-600 text-sm font-medium">Seleccionar</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button
                      onClick={() => handleSelectClient({ id: undefined, identificacion: '9999999999', razon_social: 'CONSUMIDOR FINAL', email: '', direccion: '' })}
                      className="text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                      Usar Consumidor Final
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </PortalModal>

      </div>
    </DashboardLayout>
  );
}

function formatStock(stock: number): string {
  return Number(stock).toString();
}
