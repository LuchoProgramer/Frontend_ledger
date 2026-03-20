'use client';

import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getApiClient } from '@/lib/api';
import { Producto, Presentacion, Categoria } from '@/lib/types/productos';
import { SucursalSimple } from '@/lib/types/usuarios';
import PortalModal from '@/components/ui/PortalModal';
import ShiftCloseModal, { ShiftCloseData } from '@/components/ShiftCloseModal';

// Tipos locales
interface CartItem {
  producto: Producto;
  presentacion: Presentacion;
  cantidad: number;
  precio: number;
  subtotal: number;
  impuesto: number;
  total: number;
  // Combo (opcionales)
  isCombo?: boolean;
  comboId?: number;
  comboNombre?: string;
  slotSelections?: { slot_id: number; producto_id: number; producto_nombre: string }[];
}

interface ComboSlotInfo {
  id: number;
  nombre: string;
  cantidad: number;
  obligatorio: boolean;
  orden: number;
}

interface ComboResult {
  type: 'combo';
  id: number;
  nombre: string;
  precio: number;
  items: { producto_id: number; presentacion_id: number; cantidad: number }[];
  slots: ComboSlotInfo[];
}

interface SlotOpcion {
  id: number;
  nombre: string;
  codigo: string;
  stock: number;
}

interface ClientData {
  id?: number;
  tipo_identificacion?: string;
  identificacion: string;
  razon_social: string;
  email: string;
  direccion: string;
  telefono?: string;
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
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [selectedCategoria, setSelectedCategoria] = useState<number | null>(null);
  const [showCategoryDrawer, setShowCategoryDrawer] = useState(false);
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
  const [openingTurno, setOpeningTurno] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('catalog');
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [selectedSucursal, setSelectedSucursal] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [esInterno, setEsInterno] = useState(true);

  // Combo / Slot Modal State
  const [combos, setCombos] = useState<ComboResult[]>([]);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [pendingCombo, setPendingCombo] = useState<ComboResult | null>(null);
  const [slotOpciones, setSlotOpciones] = useState<Record<number, SlotOpcion[]>>({});
  const [slotSelections, setSlotSelections] = useState<Record<number, SlotOpcion>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState('');

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
    direccion: '',
    telefono: ''
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
        handleOpenPaymentModal();
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
        loadCategorias();
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

  const loadCategorias = async () => {
    try {
      const res = await apiClient.getCategorias();
      setCategorias(res.data ?? []);
    } catch { /* non-critical */ }
  };

  const loadProductos = async (search = '', sucursalId?: number, categoriaId?: number | null) => {
    setLoadingProducts(true);
    try {
      const targetSucursal = sucursalId || turno?.sucursal;
      const params: Record<string, unknown> = { search, page_size: 20, activo: true, sucursal: targetSucursal };
      if (categoriaId) params.categoria = categoriaId;
      const res = await apiClient.getProductos(params as Parameters<typeof apiClient.getProductos>[0]);
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
      setOpeningTurno(true);
      const res = await apiClient.abrirTurno(selectedSucursal);
      if (res.success) {
        setTurno(res.data);
        setShowShiftModal(false);
        loadProductos('', selectedSucursal);
        loadCategorias();
      }
    } catch (e: any) {
      alert(e.message || 'Error al abrir turno');
    } finally {
      setOpeningTurno(false);
    }
  };

  const handleCloseTurno = async () => {
    setShowClosingModal(true);
  };

  const handleConfirmCloseTurno = async (data: ShiftCloseData) => {
    try {
      await apiClient.cerrarTurno(data);
      setTurno(null);
      setCart([]);
      setClient({ identificacion: '9999999999', razon_social: 'CONSUMIDOR FINAL', email: '', direccion: '' });
      await loadSucursales();
      setShowShiftModal(true); // Mostrar modal de apertura tras cerrar
    } catch (e: any) {
      alert(e.message || 'Error al cerrar turno');
      throw e; // Relanzar para que el modal sepa que falló (opcional, pero buena práctica)
    }
  };

  const allowedToClose = useRef(false); // Ref to prevent double invocation if using strict mode or weird events
  const procesandoRef = useRef(false);

  // Cart Actions
  // Presentation Selection State
  const [showPresModal, setShowPresModal] = useState(false);
  const [productToSelect, setProductToSelect] = useState<Producto | null>(null);
  const [availablePresentations, setAvailablePresentations] = useState<Presentacion[]>([]);
  const [targetCartIndex, setTargetCartIndex] = useState<number | null>(null);

  const handleCartItemClick = async (index: number, item: CartItem) => {
    // Similar to addToCart but sets targetCartIndex
    try {
      const presRes = await apiClient.getPresentaciones(item.producto.id, turno?.sucursal);
      const presentaciones = presRes.data || [];
      if (presentaciones.length > 0) {
        setProductToSelect(item.producto);
        setAvailablePresentations(presentaciones);
        setTargetCartIndex(index);
        setShowPresModal(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addToCart = async (producto: Producto) => {
    setTargetCartIndex(null); // Ensure we are in ADD mode
    // ... rest of logic checks presentations ...
    const stockActual = producto.stock ?? 0;

    if (stockActual <= 0) {
      alert('Producto agotado');
      return;
    }

    try {
      const presRes = await apiClient.getPresentaciones(producto.id, turno?.sucursal);
      const presentaciones = presRes.data || [];

      if (presentaciones.length === 0) {
        alert('Este producto no tiene presentaciones/precios definidos');
        return;
      }

      // Siempre agregar directamente al carrito usando la "presentación principal".
      // Regla de prioridad (más común en POS):
      // 1) LOCAL + "Unidad"
      // 2) LOCAL + cantidad == 1
      // 3) Cualquier LOCAL
      // 4) Primera disponible (fallback)
      const local = presentaciones.filter((p: Presentacion) => p.canal === 'LOCAL');
      const defaultPresentation =
        local.find(p => p.nombre_presentacion?.toLowerCase() === 'unidad')
        || local.find(p => Number(p.cantidad) === 1)
        || local[0]
        || presentaciones[0];

      addPresentationToCart(producto, defaultPresentation);
    } catch (e) {
      console.error(e);
      alert('Error obteniendo precios del producto');
    }
  };

  const addPresentationToCart = (producto: Producto, presentacion: Presentacion) => {
    const stockActual = producto.stock ?? 0;

    setCart(prev => {
      // 1. Calculate currently used stock (excluding the item being modified if any)
      const otherItemsStock = prev
        .filter((item, idx) => item.producto.id === producto.id && idx !== targetCartIndex)
        .reduce((sum, i) => sum + (i.cantidad * i.presentacion.cantidad), 0);

      // 2. Determine quantity for the new item
      let quantity = 1;
      if (targetCartIndex !== null && prev[targetCartIndex]) {
        quantity = prev[targetCartIndex].cantidad;
      }

      const requestedUnits = quantity * presentacion.cantidad;

      if (otherItemsStock + requestedUnits > stockActual) {
        alert(`No hay stock suficiente para esta presentación. Max disponible: ${stockActual - otherItemsStock} unidades.`);
        return prev;
      }

      // 3. Update Cart
      if (targetCartIndex !== null) {
        // Replace Mode
        const newCart = [...prev];
        const precio = Number(presentacion.precio);
        newCart[targetCartIndex] = {
          ...newCart[targetCartIndex],
          presentacion: presentacion,
          precio: precio,
          subtotal: quantity * precio,
          total: quantity * precio
        };
        return newCart;
      } else {
        // Add Mode
        // Check if exactly same presentation exists to merge
        const existingIdx = prev.findIndex(item => item.producto.id === producto.id && item.presentacion.id === presentacion.id);

        if (existingIdx >= 0) {
          const newCart = [...prev];
          const item = newCart[existingIdx];
          const newQty = item.cantidad + 1;
          const precio = Number(presentacion.precio);

          newCart[existingIdx] = {
            ...item,
            cantidad: newQty,
            subtotal: newQty * precio,
            total: newQty * precio
          };
          return newCart;
        }

        // New Line
        const precio = Number(presentacion.precio);
        return [...prev, {
          producto,
          presentacion,
          cantidad: 1,
          precio,
          subtotal: precio,
          impuesto: 0,
          total: precio
        }];
      }
    });

    // Close modal if open
    setShowPresModal(false);
    setProductToSelect(null);
    setTargetCartIndex(null);
    setToast({ message: `Actualizado: ${producto.nombre}`, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2000);
  };

  // Búsqueda de combos: solo cuando hay término de búsqueda
  useEffect(() => {
    if (!turno || !searchTerm.trim()) {
      setCombos([]);
      return;
    }
    const timer = setTimeout(() => {
      apiClient.buscarCombos(searchTerm, turno.sucursal)
        .then(res => setCombos(Array.isArray(res) ? res : []))
        .catch(() => setCombos([]));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm, turno]);

  const addComboToCart = async (combo: ComboResult) => {
    if (combo.slots.length === 0) {
      commitComboToCart(combo, []);
      return;
    }
    setPendingCombo(combo);
    setSlotSelections({});
    setSlotError('');
    setLoadingSlots(true);
    setShowSlotModal(true);
    try {
      const sucursalId = turno!.sucursal;
      const results = await Promise.all(
        combo.slots.map(slot =>
          apiClient.getComboOpciones(combo.id, slot.id, sucursalId)
            .then(opciones => ({ slotId: slot.id, opciones: Array.isArray(opciones) ? opciones : [] }))
            .catch(() => ({ slotId: slot.id, opciones: [] as SlotOpcion[] }))
        )
      );
      const opcionesMap: Record<number, SlotOpcion[]> = {};
      results.forEach(({ slotId, opciones }) => { opcionesMap[slotId] = opciones; });
      setSlotOpciones(opcionesMap);
    } finally {
      setLoadingSlots(false);
    }
  };

  const commitComboToCart = (
    combo: ComboResult,
    selections: { slot_id: number; producto_id: number; producto_nombre: string }[]
  ) => {
    const virtualProducto = { id: combo.id, nombre: combo.nombre, stock: 99 } as unknown as Producto;
    const virtualPresentacion = {
      id: combo.id, precio: combo.precio, cantidad: 1, nombre_presentacion: 'Combo',
    } as unknown as Presentacion;
    const precio = combo.precio;
    setCart(prev => [
      ...prev,
      {
        producto: virtualProducto,
        presentacion: virtualPresentacion,
        cantidad: 1,
        precio,
        subtotal: precio,
        impuesto: 0,  // combo tiene precio fijo, impuesto ya incluido
        total: precio,
        isCombo: true,
        comboId: combo.id,
        comboNombre: combo.nombre,
        slotSelections: selections,
      },
    ]);
    setToast({ message: `${combo.nombre} agregado`, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2000);
  };

  const handleConfirmSlots = () => {
    if (!pendingCombo) return;
    for (const slot of pendingCombo.slots) {
      if (slot.obligatorio && !slotSelections[slot.id]) {
        setSlotError(`Debes elegir una opción para "${slot.nombre}"`);
        return;
      }
    }
    const selections = Object.entries(slotSelections).map(([slotId, opcion]) => ({
      slot_id: Number(slotId),
      producto_id: opcion.id,
      producto_nombre: opcion.nombre,
    }));
    commitComboToCart(pendingCombo, selections);
    setShowSlotModal(false);
    setPendingCombo(null);
    setSlotSelections({});
    setSlotOpciones({});
    setSlotError('');
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, newQty: number) => {
    if (newQty < 1) return;
    setCart(prev => {
      const newCart = [...prev];
      const item = newCart[index];
      newCart[index] = {
        ...item,
        cantidad: newQty,
        subtotal: newQty * item.precio,
        total: newQty * item.precio,
      };
      return newCart;
    });
  };


  const calculateTotals = () => {
    return cart.reduce((acc, item) => {
      acc.subtotal += item.subtotal;
      acc.total += item.total;
      acc.impuesto += item.impuesto;
      return acc;
    }, { subtotal: 0, total: 0, impuesto: 0 });
  };

  // Local Types (add Payment)
  interface Payment {
    codigo: string;
    descripcion: string;
    total: number;
    plazo?: number;
    unidad_tiempo?: string;
  }

  // ... inside component state ...
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('01');
  const [paymentAmount, setPaymentAmount] = useState<string>('');

  // ... logic ...

  const handleOpenPaymentModal = () => {
    if (cart.length === 0) return;

    // Check validation for large amounts
    if (calculateTotals().total > 50 && client.identificacion === '9999999999') {
      alert("Para ventas mayores a $50, debe ingresar los datos del cliente (Facturación Electrónica).");
      setShowClientModal(true);
      return;
    }

    setPaymentAmount(calculateTotals().total.toFixed(2));
    setPayments([]); // Reset previous payments
    setPaymentMethod('01');

    // Default: Internal if CF, but if client is real, might want to bill SRI by default
    setEsInterno(client.identificacion === '9999999999');

    setShowPaymentModal(true);
  };

  const handleAddPayment = () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return alert('Monto inválido');

    const methodDesc = {
      '01': 'Efectivo',
      '19': 'Tarjeta de Crédito',
      '16': 'Tarjeta de Débito',
      '20': 'Transferencia / Otros',
      '17': 'Dinero Electrónico',
      '18': 'Tarjeta Prepago',
      '15': 'Compensación de Deudas',
      '21': 'Endoso de Títulos'
    }[paymentMethod] || 'Otro';

    setPayments(prev => [...prev, {
      codigo: paymentMethod,
      descripcion: methodDesc,
      total: amount
    }]);

    // Calculate remaining
    const currentTotal = payments.reduce((sum, p) => sum + p.total, 0) + amount;
    const remaining = Math.max(0, totals.total - currentTotal);
    setPaymentAmount(remaining.toFixed(2));
  };

  const handleRemovePayment = (index: number) => {
    setPayments(prev => prev.filter((_, i) => i !== index));
  };


  const handleProcessSale = async () => {
    if (procesandoRef.current) return;
    procesandoRef.current = true;
    setProcesando(true);
    try {
      const totalPagado = payments.reduce((sum, p) => sum + p.total, 0);

      // Allow if total paid is equal or greater (change)
      // Note: Backend expects total matches, but practically we might want to record just the invoice total?
      // For now, assume exact match or greater. If greater, maybe register change?
      // The backend creates Pago objects with the exact amount sent.
      // Usually, we should adjust the cash payment to match exactly if it exceeds.

      if (totalPagado < totals.total - 0.01) {
        alert(`Falta pagar $${(totals.total - totalPagado).toFixed(2)}`);
        procesandoRef.current = false;
        setProcesando(false);
        return;
      }

      const payload = {
        cliente: client,
        items: cart.map(item => {
          if (item.isCombo) {
            return {
              type: 'combo',
              combo_id: item.comboId,
              cantidad: item.cantidad,
              slot_selections: (item.slotSelections || []).map(s => ({
                slot_id: s.slot_id,
                producto_id: s.producto_id,
              })),
            };
          }
          return {
            id: item.producto.id,
            presentacion_id: item.presentacion.id,
            cantidad: item.cantidad,
            precio: item.precio,
          };
        }),
        pagos: payments,
        es_interno: esInterno
      };

      const res = await apiClient.crearFacturaPOS(payload);
      alert(`Venta registrada.\nFactura: ${res.numero_autorizacion}\nClave Acceso: ${res.clave_acceso}`);

      setShowPaymentModal(false);
      setCart([]);
      setClient({ identificacion: '9999999999', razon_social: 'CONSUMIDOR FINAL', email: '', direccion: '' });
      loadProductos(searchTerm, undefined, selectedCategoria);
    } catch (error: any) {
      const msg = error?.errorMessage || error?.message || 'Error al procesar venta';
      alert(msg);
    } finally {
      procesandoRef.current = false;
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
      setSavingClient(true);
      const res = await apiClient.crearCliente(newClientData);

      // Determinar si la respuesta viene envuelta
      const clienteCreado = res.data || res;

      handleSelectClient(clienteCreado);
      alert(`Cliente creado y seleccionado: ${clienteCreado.razon_social}`);
    } catch (e: any) {
      console.error('Error creating client:', e);
      const errorDetail = e.data ? JSON.stringify(e.data, null, 2) : e.message;
      alert(`Error al crear cliente (${e.status || 'N/A'}):\n${errorDetail}`);
    } finally {
      setSavingClient(false);
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
                {/* Search + category filter button (mobile/tablet only) */}
                <div className="mb-4 flex gap-2">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Buscar producto (Código o Nombre) - F2"
                    className="flex-1 p-3 border rounded-lg shadow-sm text-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      loadProductos(e.target.value, undefined, selectedCategoria);
                    }}
                  />
                  {/* Category button — hidden on lg+ (desktop keeps full catalog) */}
                  {categorias.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowCategoryDrawer(true)}
                      className={`lg:hidden shrink-0 flex flex-col items-center justify-center gap-0.5 px-3 min-h-[52px] rounded-lg border text-sm font-medium transition-colors ${
                        selectedCategoria !== null
                          ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {/* Simple grid icon */}
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                      </svg>
                      <span className="text-xs leading-none">
                        {selectedCategoria !== null
                          ? (categorias.find(c => c.id === selectedCategoria)?.nombre ?? 'Cat.')
                          : 'Cats.'}
                      </span>
                    </button>
                  )}
                </div>

                {combos.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-2 px-1">Combos</p>
                    <div className="grid grid-cols-2 gap-2">
                      {combos.map(combo => (
                        <button
                          key={`combo-${combo.id}`}
                          onClick={() => addComboToCart(combo)}
                          className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 text-left hover:border-amber-400 transition-colors"
                        >
                          <p className="text-sm font-semibold text-gray-900 truncate">{combo.nombre}</p>
                          <p className="text-xs text-amber-700 font-bold mt-1">${combo.precio.toFixed(2)}</p>
                          {combo.slots.length > 0 && (
                            <p className="text-xs text-gray-400 mt-0.5">{combo.slots.length} opción(es)</p>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 content-start pb-20">
                  {loadingProducts ? (
                    <div className="col-span-full text-center py-10">Cargando productos...</div>
                  ) : productos.map(prod => {
                    const stock = prod.stock ?? 0;
                    const hasStock = stock > 0;

                    return (
                      <div
                        key={prod.id}
                        onClick={() => {
                          if (hasStock) {
                            addToCart(prod);
                            setToast({ message: `Agregado: ${prod.nombre}`, visible: true });
                            setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2000);
                          }
                        }}
                        className={`
                          relative p-4 rounded-xl shadow-sm transition-all flex flex-col justify-between min-h-40 border
                          active:scale-95 duration-75
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
                          <h3 className="font-semibold text-gray-800 leading-tight break-words">{prod.nombre}</h3>
                        </div>
                        <div className="mt-2 flex justify-between items-end">
                          <div className="text-xs text-gray-500">
                            Stock: <span className={hasStock ? 'text-gray-700' : 'text-red-500'}>{formatStock(stock)}</span>
                          </div>
                          <span className="text-lg font-bold text-blue-600 block">
                            {(prod as any).precio_default != null ? `$${Number((prod as any).precio_default).toFixed(2)}` : '$ -'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Category Bottom Sheet — mobile/tablet only */}
              {showCategoryDrawer && (
                <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
                  {/* Backdrop */}
                  <div
                    className="absolute inset-0 bg-black/50"
                    onClick={() => setShowCategoryDrawer(false)}
                  />
                  {/* Sheet */}
                  <div className="relative bg-white rounded-t-2xl shadow-2xl p-5 pb-8">
                    {/* Handle */}
                    <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-900 text-base">Categorías</h3>
                      {selectedCategoria !== null && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCategoria(null);
                            loadProductos(searchTerm, undefined, null);
                            setShowCategoryDrawer(false);
                          }}
                          className="text-sm text-[#4F46E5] font-medium"
                        >
                          Limpiar filtro
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {/* "Todos" pill */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategoria(null);
                          loadProductos(searchTerm, undefined, null);
                          setShowCategoryDrawer(false);
                        }}
                        className={`px-4 min-h-[44px] rounded-full text-sm font-medium border transition-colors ${
                          selectedCategoria === null
                            ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                            : 'bg-gray-100 text-gray-700 border-transparent hover:bg-gray-200'
                        }`}
                      >
                        Todos
                      </button>
                      {categorias.map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setSelectedCategoria(cat.id);
                            loadProductos(searchTerm, undefined, cat.id);
                            setShowCategoryDrawer(false);
                          }}
                          className={`px-4 min-h-[44px] rounded-full text-sm font-medium border transition-colors ${
                            selectedCategoria === cat.id
                              ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                              : 'bg-gray-100 text-gray-700 border-transparent hover:bg-gray-200'
                          }`}
                        >
                          {cat.nombre}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

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
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-transparent hover:border-blue-200 hover:bg-blue-50 transition-colors"
                    >
                      {/* Nombre + presentación — tap para cambiar presentación */}
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleCartItemClick(idx, item)}
                        title="Toca para cambiar presentación"
                      >
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.isCombo ? item.comboNombre : item.producto.nombre}
                        </p>
                        {item.isCombo && item.slotSelections && item.slotSelections.length > 0 && (
                          <p className="text-xs text-gray-400 truncate">
                            {item.slotSelections.map(s => s.producto_nombre).join(', ')}
                          </p>
                        )}
                        {!item.isCombo && (
                          <div className="text-xs text-gray-500">{item.presentacion.nombre_presentacion}</div>
                        )}
                        <div className="text-xs text-gray-400">${item.precio.toFixed(2)} c/u</div>
                      </div>

                      {/* Stepper [-] [qty] [+] */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => updateQuantity(idx, item.cantidad - 1)}
                          disabled={item.cantidad <= 1}
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-40 text-xl font-bold transition-colors"
                        >
                          −
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={String(item.cantidad)}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const v = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10);
                            if (!isNaN(v) && v >= 1) updateQuantity(idx, v);
                          }}
                          className="w-12 min-h-[44px] text-center font-bold text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                        />
                        <button
                          type="button"
                          onClick={() => updateQuantity(idx, item.cantidad + 1)}
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200 text-xl font-bold transition-colors"
                        >
                          +
                        </button>
                      </div>

                      {/* Total + Eliminar */}
                      <div className="text-right shrink-0 min-w-[64px]">
                        <div className="font-bold text-gray-800">${item.total.toFixed(2)}</div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(idx)}
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
                    onClick={handleOpenPaymentModal}
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

        {/* Toast Notification */}
        {toast.visible && (
          <div className="fixed bottom-20 md:bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center animate-fade-in-up">
            <span className="text-xl mr-2">✅</span>
            <span className="font-semibold">{toast.message}</span>
          </div>
        )}

        {/* Payment Modal */}
        <PortalModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)}>
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 max-w-lg w-full">
            <div className="border-b pb-4 mb-4">
              <h3 className="text-xl font-bold text-gray-900">Procesar Pago</h3>
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-600">Total a Pagar:</span>
                <span className="text-2xl font-bold text-gray-900">${totals.total.toFixed(2)}</span>
              </div>
            </div>

            {/* SRI vs Interno Toggle */}
            <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-indigo-900">Tipo de Documento</div>
                <div className="text-xs text-indigo-700">
                  {esInterno ? 'Nota de Venta (Solo Interno)' : 'Factura Electrónica (SRI)'}
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={!esInterno}
                  onChange={(e) => setEsInterno(!e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Payments List */}
            <div className="mb-4 bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
              <div className="text-xs font-bold text-gray-500 mb-2 uppercase">Pagos Agregados</div>
              {payments.length === 0 && <div className="text-sm text-gray-400 italic">No hay pagos agregados</div>}
              {payments.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <div className="font-semibold text-gray-800">{p.descripcion}</div>
                    <div className="text-xs text-gray-500">{p.codigo}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold">${p.total.toFixed(2)}</span>
                    <button onClick={() => handleRemovePayment(idx)} className="text-red-500 hover:text-red-700">✕</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Payment Form */}
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Método</label>
                  <select
                    className="w-full p-2 border rounded text-sm"
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                  >
                    <option value="01">Efectivo (Sin Sist. Financiero)</option>
                    <option value="19">Tarjeta de Crédito</option>
                    <option value="16">Tarjeta de Débito</option>
                    <option value="20">Transferencia / Otros con SF</option>
                    <option value="17">Dinero Electrónico</option>
                    <option value="18">Tarjeta Prepago</option>
                    <option value="15">Compensación de Deudas</option>
                    <option value="21">Endoso de Títulos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Monto</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full p-2 border rounded text-sm"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                  />
                </div>
              </div>
              <button
                onClick={handleAddPayment}
                className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 text-sm"
              >
                + Agregar Pago
              </button>
            </div>

            {/* Summary & Actions */}
            <div className="border-t pt-4">
              <div className="flex justify-between mb-4 text-lg">
                <span className="text-gray-600">Total Pagado:</span>
                <span className={`font-bold ${payments.reduce((s, p) => s + p.total, 0) >= totals.total ? 'text-green-600' : 'text-red-600'}`}>
                  ${payments.reduce((s, p) => s + p.total, 0).toFixed(2)}
                </span>
              </div>

              {payments.reduce((s, p) => s + p.total, 0) >= totals.total && (
                <div className="flex justify-between mb-4 text-sm text-gray-500 bg-green-50 p-2 rounded">
                  <span>Cambio / Vuelto:</span>
                  <span className="font-bold text-green-700">
                    ${(payments.reduce((s, p) => s + p.total, 0) - totals.total).toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-3 border border-gray-300 rounded-xl font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleProcessSale}
                  disabled={procesando || payments.reduce((s, p) => s + p.total, 0) < totals.total - 0.01}
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 shadow-lg shadow-green-200"
                >
                  {procesando ? 'Procesando...' : 'FINALIZAR VENTA 🚀'}
                </button>
              </div>
            </div>
          </div>
        </PortalModal>



        {/* Presentation Selection Modal */}
        <PortalModal isOpen={showPresModal} onClose={() => setShowPresModal(false)}>
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 max-w-lg w-full rounded-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {targetCartIndex !== null ? 'Cambiar Presentación' : 'Seleccionar Presentación'}
            </h3>
            <p className="text-gray-500 mb-4 text-sm">
              Producto: <span className="font-bold text-gray-800">{productToSelect?.nombre}</span>
            </p>

            <div className="grid grid-cols-1 gap-3 max-h-[60vh] overflow-y-auto">
              {availablePresentations.map((pres) => (
                <button
                  key={pres.id}
                  onClick={() => productToSelect && addPresentationToCart(productToSelect, pres)}
                  className="flex justify-between items-center p-4 border rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all text-left"
                >
                  <div>
                    <div className="font-bold text-gray-800">{pres.nombre_presentacion}</div>
                    <div className="text-xs text-gray-500">Contiene: {pres.cantidad} unidades</div>
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    ${pres.precio}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 text-right">
              <button
                onClick={() => setShowPresModal(false)}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </PortalModal>

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
                disabled={!selectedSucursal || openingTurno}
                className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700 disabled:opacity-50"
              >
                {openingTurno ? 'Abriendo...' : 'Abrir Turno'}
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                      <input
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                        value={newClientData.telefono || ''}
                        onChange={e => setNewClientData({ ...newClientData, telefono: e.target.value })}
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
                      disabled={savingClient}
                      className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {savingClient ? 'Guardando...' : 'Guardar y Seleccionar'}
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

      <ShiftCloseModal
        isOpen={showClosingModal}
        onClose={() => setShowClosingModal(false)}
        onConfirm={handleConfirmCloseTurno}
      />

      {showSlotModal && pendingCombo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">{pendingCombo.nombre}</h3>
              <p className="text-sm text-gray-500">Personaliza tu combo</p>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {loadingSlots ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin" />
                </div>
              ) : (
                pendingCombo.slots.map(slot => {
                  const opciones = slotOpciones[slot.id] || [];
                  const selected = slotSelections[slot.id];
                  return (
                    <div key={slot.id}>
                      <p className="text-sm font-semibold text-gray-700 mb-2">
                        {slot.nombre}
                        {slot.obligatorio
                          ? <span className="ml-1 text-red-500 text-xs">*obligatorio</span>
                          : <span className="ml-1 text-gray-400 text-xs">(opcional)</span>}
                      </p>
                      {opciones.length === 0 ? (
                        <p className="text-xs text-red-500 bg-red-50 p-2 rounded">
                          Sin productos disponibles con stock para este slot.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {opciones.map(op => (
                            <button
                              key={op.id}
                              type="button"
                              onClick={() =>
                                setSlotSelections(prev => ({ ...prev, [slot.id]: op }))
                              }
                              className={`px-3 py-2 rounded-lg border text-sm font-medium min-h-[40px] transition-colors ${
                                selected?.id === op.id
                                  ? 'bg-green-600 text-white border-green-600'
                                  : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                              }`}
                            >
                              {op.nombre}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              {slotError && (
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{slotError}</p>
              )}
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => { setShowSlotModal(false); setPendingCombo(null); }}
                className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSlots}
                disabled={
                  loadingSlots ||
                  pendingCombo.slots.some(
                    s => s.obligatorio && (slotOpciones[s.id] || []).length === 0
                  )
                }
                className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50"
              >
                Agregar al carrito
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}

function formatStock(stock: number): string {
  return Number(stock).toString();
}
