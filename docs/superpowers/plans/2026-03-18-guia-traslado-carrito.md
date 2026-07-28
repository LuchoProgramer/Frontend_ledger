# Guía de Remisión — Carrito de Traslado Multi-Producto

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir crear una Guía de Remisión de traslado entre sucursales con múltiples productos en un solo documento SRI, mediante una UI tipo carrito.

**Architecture:** Se agrega un endpoint `POST /api/auth/inventario/transferencia/bulk/` en el backend Django que acepta múltiples productos, ejecuta todos los movimientos de stock atómicamente y genera una sola Guía de Remisión. El frontend reemplaza el modo TRASLADO de `/guias/nueva/page.tsx` con un wizard de 4 pasos: sucursales → carrito de productos → transportista → confirmación/comprobante.

**Tech Stack:** Django/DRF (backend), Next.js 15 App Router + TailwindCSS (frontend), `InventarioAtomicoService.transferir_stock()`, `GuiaRemisionService.crear_desde_transferencia()`.

---

## Repos involucrados

| Repo | Ruta |
|---|---|
| Backend | `/Users/luisviteri/Proyectos/Inventario/LedgerXpertz` |
| Frontend | `/Users/luisviteri/Proyectos/Inventario/ledgerxpertz-frontend` |

---

## Task 1: Endpoint bulk en backend

**Files:**
- Modify: `LedgerXpertz/core/api_inventario.py` — agregar view `transferencia_bulk`
- Modify: `LedgerXpertz/core/api_urls.py` — registrar la ruta

### Contexto

El endpoint existente `transferencia_inventario` (línea 202 de `api_inventario.py`) maneja un solo producto. Necesitamos un endpoint hermano que acepte una lista de productos y:
1. Ejecute `InventarioAtomicoService.transferir_stock()` por cada producto (en una transacción atómica)
2. Cree todos los objetos `Transferencia` necesarios
3. Genere **una sola** `GuiaRemision` con todos los productos como detalles del mismo destinatario

**IMPORTANTE:** `GuiaRemisionService.crear_desde_transferencia()` solo acepta una transferencia (1 producto). Para múltiples productos debemos llamar al servicio con la primera transferencia y luego agregar manualmente los `DetalleGuiaRemision` adicionales al mismo destinatario.

- [ ] **Step 1: Agregar la view `transferencia_bulk` en `api_inventario.py`**

Agregar después de la función `transferencia_inventario` (aprox. línea 295):

```python
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def transferencia_bulk(request):
    """
    Realiza la transferencia de MÚLTIPLES productos entre sucursales
    y genera una sola Guía de Remisión.

    Payload:
    {
        "origen_id": int,
        "destino_id": int,
        "productos": [
            {"producto_id": int, "cantidad": float},
            ...
        ],
        "generar_guia": bool,  // opcional, default False
        "transportista": {     // requerido si generar_guia=True
            "ruc": str,
            "razon_social": str,
            "placa": str       // opcional
        }
    }
    """
    try:
        data = request.data
        origen_id = data.get('origen_id')
        destino_id = data.get('destino_id')
        productos_data = data.get('productos', [])

        if not all([origen_id, destino_id]):
            return Response({'error': 'origen_id y destino_id son obligatorios'}, status=status.HTTP_400_BAD_REQUEST)
        if not productos_data:
            return Response({'error': 'Debe incluir al menos un producto'}, status=status.HTTP_400_BAD_REQUEST)

        tenant = request.tenant
        sucursal_origen = get_object_or_404(Sucursal, id=origen_id, empresa=tenant)
        sucursal_destino = get_object_or_404(Sucursal, id=destino_id, empresa=tenant)
        usuario = request.user

        transferencias = []

        with transaction.atomic():
            for item in productos_data:
                producto_id = item.get('producto_id')
                cantidad = Decimal(str(item.get('cantidad', 0)))

                if not producto_id or cantidad <= 0:
                    raise ValueError(f'Producto o cantidad inválida: {item}')

                producto = get_object_or_404(Producto, id=producto_id, empresa=tenant)

                InventarioAtomicoService.transferir_stock(
                    producto=producto,
                    sucursal_origen=sucursal_origen,
                    sucursal_destino=sucursal_destino,
                    cantidad=cantidad,
                    usuario=usuario,
                )

                transferencia = Transferencia.objects.create(
                    sucursal_origen=sucursal_origen,
                    sucursal_destino=sucursal_destino,
                    producto=producto,
                    cantidad=cantidad,
                    usuario=usuario,
                )
                transferencias.append(transferencia)

        generar_guia = data.get('generar_guia', False)
        guia_numero = None

        if generar_guia and transferencias:
            datos_transportista_raw = data.get('transportista', {})
            if not all(k in datos_transportista_raw for k in ['ruc', 'razon_social']):
                return Response({'error': 'Faltan datos del transportista (ruc, razon_social)'}, status=status.HTTP_400_BAD_REQUEST)

            from facturacion.services.guia_remision_service import GuiaRemisionService
            from facturacion.models import DetalleGuiaRemision

            datos_service = {
                'tipo_identificacion': '04',
                'identificacion': datos_transportista_raw['ruc'],
                'razon_social': datos_transportista_raw['razon_social'],
                'placa': datos_transportista_raw.get('placa', ''),
            }

            try:
                with transaction.atomic():
                    # Crear guía con la primera transferencia
                    guia = GuiaRemisionService.crear_desde_transferencia(
                        transferencia=transferencias[0],
                        datos_transportista=datos_service,
                        usuario=usuario,
                        enviar_sri=False,
                    )
                    # Agregar detalles adicionales al mismo destinatario
                    destinatario = guia.destinatarios.first()
                    for transferencia in transferencias[1:]:
                        if not transferencia.producto.codigo_producto:
                            raise ValueError(f"El producto '{transferencia.producto.nombre}' no tiene código asignado")
                        DetalleGuiaRemision.objects.create(
                            destinatario=destinatario,
                            producto=transferencia.producto,
                            codigo_interno=transferencia.producto.codigo_producto,
                            descripcion=transferencia.producto.nombre,
                            cantidad=Decimal(str(transferencia.cantidad)),
                        )
                    guia_numero = guia.numero_autorizacion
            except Exception as e:
                # La guía falló pero los movimientos de stock ya están hechos
                return Response({
                    'message': 'Transferencias realizadas correctamente.',
                    'advertencia': f'No se pudo generar la guía: {str(e)}',
                    'guia_numero': None,
                }, status=status.HTTP_200_OK)

        return Response({
            'message': f'Transferencia de {len(transferencias)} producto(s) realizada correctamente.',
            'guia_numero': guia_numero,
            'transferencias': len(transferencias),
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
```

- [ ] **Step 2: Registrar la URL en `api_urls.py`**

Agregar debajo de la línea de `inventario-transferencia`:

```python
path('auth/inventario/transferencia/bulk/', api_inventario.transferencia_bulk, name='inventario-transferencia-bulk'),
```

- [ ] **Step 3: Probar manualmente desde el servidor**

```bash
ssh root@178.156.128.85
cd /opt/ledgerxpertz
docker compose exec web python manage.py shell -c "
from django_tenants.utils import schema_context
with schema_context('la_huequita'):
    from core.models import Sucursal
    for s in Sucursal.objects.all():
        print(s.id, s.nombre)
"
```

Verificar que el endpoint responde 400 con payload vacío:
```bash
# Desde la máquina local, con token de sesión válido
curl -X POST https://api.ledgerxpertz.com/api/auth/inventario/transferencia/bulk/ \
  -H "Content-Type: application/json" \
  -d '{}'
# Esperado: {"error": "origen_id y destino_id son obligatorios"}
```

- [ ] **Step 4: Deploy backend**

```bash
# En el VPS:
cd /opt/ledgerxpertz
git pull origin main
docker compose exec web python manage.py migrate --noinput
docker compose restart web
docker compose logs web --tail=20
# Verificar: "Starting development server" o gunicorn sin errores
```

- [ ] **Step 5: Commit backend**

```bash
git add core/api_inventario.py core/api_urls.py
git commit -m "feat: endpoint bulk para traslado multi-producto con una sola guía de remisión"
```

---

## Task 2: Método en api.ts (frontend)

**Files:**
- Modify: `ledgerxpertz-frontend/src/lib/api.ts` — agregar `trasladoBulk()`

- [ ] **Step 1: Agregar método `trasladoBulk` junto a `transferenciaInventario`**

Buscar `transferenciaInventario` (aprox. línea 851) y agregar después:

```typescript
async trasladoBulk(data: {
  origen_id: number;
  destino_id: number;
  productos: { producto_id: number; cantidad: number }[];
  generar_guia: boolean;
  transportista?: {
    ruc: string;
    razon_social: string;
    placa?: string;
  };
}) {
  return this.request<{
    message: string;
    guia_numero: string | null;
    transferencias: number;
    advertencia?: string;
  }>('/api/auth/inventario/transferencia/bulk/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
```

- [ ] **Step 2: Verificar TypeScript limpio**

```bash
npx tsc --noEmit
# Esperado: sin output (cero errores)
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/api.ts
git commit -m "feat(api): método trasladoBulk para transferencia multi-producto"
```

---

## Task 3: Wizard de traslado en el frontend

**Files:**
- Modify: `ledgerxpertz-frontend/src/app/guias/nueva/page.tsx` — reemplazar modo TRASLADO

### Diseño del wizard (4 pasos)

```
Paso 1: Sucursales
  [Origen ▾]  →  [Destino ▾]

Paso 2: Carrito de productos
  [🔍 Buscar producto...]
  ┌────────────────────────────────────┐
  │ Whisky Johnnie  Stock: 24  [+ Agregar] │
  │ Ron Medellín    Stock: 12  [+ Agregar] │
  └────────────────────────────────────┘
  Carrito:
  ┌────────────────────────────────────┐
  │ Whisky Johnnie  [-][  6 ][+]  ✕   │
  │ Ron Medellín    [-][  3 ][+]  ✕   │
  └────────────────────────────────────┘

Paso 3: Transportista
  [RUC/Cédula] [Nombre]  [Placa]

Paso 4: Confirmación → Comprobante
```

### Estado del componente

```typescript
type TrasladoStep = 'sucursales' | 'carrito' | 'transportista' | 'confirmacion' | 'comprobante';

interface CartItem {
  producto_id: number;
  nombre: string;
  codigo: string;
  stock: number;
  cantidad: number;
}

interface Sucursal { id: number; nombre: string; }
```

- [ ] **Step 1: Reemplazar el bloque `onClick={() => router.push('/inventario')}` del modo TRASLADO**

Cambiar en la pantalla de SELECTION:
```tsx
// ANTES:
onClick={() => router.push('/inventario')}

// DESPUÉS:
onClick={() => setMode('TRASLADO')}
```

- [ ] **Step 2: Implementar el modo TRASLADO completo**

Agregar dentro del componente los nuevos estados necesarios:

```typescript
// Traslado state
const [trasladoStep, setTrasladoStep] = useState<TrasladoStep>('sucursales');
const [sucursales, setSucursales] = useState<Sucursal[]>([]);
const [origenId, setOrigenId] = useState<number | null>(null);
const [destinoId, setDestinoId] = useState<number | null>(null);
const [searchProducto, setSearchProducto] = useState('');
const [productosDisponibles, setProductosDisponibles] = useState<any[]>([]);
const [loadingProductos, setLoadingProductos] = useState(false);
const [cartTraslado, setCartTraslado] = useState<CartItem[]>([]);
const [transportistaTraslado, setTransportistaTraslado] = useState({ ruc: '', razon_social: '', placa: '' });
const [submittingTraslado, setSubmittingTraslado] = useState(false);
const [guiaGenerada, setGuiaGenerada] = useState<string | null>(null);
```

Cargar sucursales al entrar al modo TRASLADO:
```typescript
useEffect(() => {
  if (mode === 'TRASLADO') {
    apiClient.getSucursalesList({ page_size: 50 })
      .then((res: any) => setSucursales(res.results ?? []))
      .catch(() => {});
  }
}, [mode]);
```

Búsqueda de productos con debounce (filtrada por sucursal origen):
```typescript
useEffect(() => {
  if (mode !== 'TRASLADO' || trasladoStep !== 'carrito' || !origenId) return;
  const t = setTimeout(async () => {
    setLoadingProductos(true);
    try {
      const res = await apiClient.getProductos({
        search: searchProducto,
        sucursal: origenId,
        activo: true,
        page_size: 20,
      });
      setProductosDisponibles(res.results || res.data || []);
    } catch { /* silent */ } finally {
      setLoadingProductos(false);
    }
  }, 400);
  return () => clearTimeout(t);
}, [searchProducto, origenId, trasladoStep, mode]);
```

Función para agregar/actualizar cantidad en carrito:
```typescript
const addToCart = (prod: any) => {
  setCartTraslado(prev => {
    const exists = prev.find(i => i.producto_id === prod.id);
    if (exists) return prev; // ya está, no duplicar
    return [...prev, {
      producto_id: prod.id,
      nombre: prod.nombre,
      codigo: prod.codigo_producto || '—',
      stock: prod.stock ?? 0,
      cantidad: 1,
    }];
  });
};

const updateCartQty = (producto_id: number, qty: number) => {
  if (qty < 1) return;
  setCartTraslado(prev => prev.map(i => i.producto_id === producto_id ? { ...i, cantidad: qty } : i));
};

const removeFromCart = (producto_id: number) => {
  setCartTraslado(prev => prev.filter(i => i.producto_id !== producto_id));
};
```

Submit final:
```typescript
const handleSubmitTraslado = async () => {
  if (!origenId || !destinoId || cartTraslado.length === 0) return;
  setSubmittingTraslado(true);
  try {
    const res = await apiClient.trasladoBulk({
      origen_id: origenId,
      destino_id: destinoId,
      productos: cartTraslado.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad })),
      generar_guia: true,
      transportista: {
        ruc: transportistaTraslado.ruc,
        razon_social: transportistaTraslado.razon_social,
        placa: transportistaTraslado.placa || undefined,
      },
    });
    setGuiaGenerada(res.guia_numero);
    setTrasladoStep('comprobante');
  } catch (err: any) {
    setError(err.message || 'Error al procesar el traslado');
  } finally {
    setSubmittingTraslado(false);
  }
};
```

- [ ] **Step 3: Agregar el JSX del modo TRASLADO**

El bloque de render debe agregarse como un nuevo `if (mode === 'TRASLADO')` antes del `return` final del componente, siguiendo el mismo patrón visual del modo VENTA (fondo blanco, rounded-xl, shadow-sm, max-w-3xl):

**Paso 1 — Sucursales:**
```tsx
{trasladoStep === 'sucursales' && (
  <div className="space-y-6">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Sucursal Origen</label>
      <select
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 min-h-[44px]"
        value={origenId ?? ''}
        onChange={e => setOrigenId(Number(e.target.value))}
      >
        <option value="">Seleccionar origen...</option>
        {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
      </select>
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Sucursal Destino</label>
      <select
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 min-h-[44px]"
        value={destinoId ?? ''}
        onChange={e => setDestinoId(Number(e.target.value))}
      >
        <option value="">Seleccionar destino...</option>
        {sucursales.filter(s => s.id !== origenId).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
      </select>
    </div>
    <button
      onClick={() => setTrasladoStep('carrito')}
      disabled={!origenId || !destinoId}
      className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-40 min-h-[44px]"
    >
      Continuar → Agregar Productos
    </button>
  </div>
)}
```

**Paso 2 — Carrito:**
```tsx
{trasladoStep === 'carrito' && (
  <div className="space-y-4">
    {/* Buscador */}
    <input
      type="text"
      placeholder="Buscar producto por nombre o código..."
      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
      value={searchProducto}
      onChange={e => setSearchProducto(e.target.value)}
      autoFocus
    />

    {/* Resultados de búsqueda */}
    {loadingProductos && <p className="text-sm text-gray-400">Buscando...</p>}
    {productosDisponibles.length > 0 && (
      <div className="border border-gray-200 rounded-lg divide-y max-h-48 overflow-y-auto">
        {productosDisponibles.map(prod => {
          const enCarrito = cartTraslado.some(i => i.producto_id === prod.id);
          const stock = prod.stock ?? 0;
          return (
            <div key={prod.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-900">{prod.nombre}</p>
                <p className="text-xs text-gray-500">{prod.codigo_producto || 'S/C'} · Stock: {stock}</p>
              </div>
              <button
                onClick={() => addToCart(prod)}
                disabled={enCarrito || stock === 0}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-40 min-h-[36px]"
              >
                {enCarrito ? 'Agregado ✓' : '+ Agregar'}
              </button>
            </div>
          );
        })}
      </div>
    )}

    {/* Carrito */}
    {cartTraslado.length > 0 && (
      <div className="border border-green-200 rounded-lg bg-green-50 divide-y divide-green-100">
        <div className="px-4 py-2 text-xs font-semibold text-green-700 uppercase tracking-wide">
          Productos a transferir ({cartTraslado.length})
        </div>
        {cartTraslado.map(item => (
          <div key={item.producto_id} className="flex items-center gap-3 p-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{item.nombre}</p>
              <p className="text-xs text-gray-500">{item.codigo}</p>
            </div>
            {/* Stepper */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => updateCartQty(item.producto_id, item.cantidad - 1)}
                disabled={item.cantidad <= 1}
                className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 font-bold"
              >−</button>
              <input
                type="text"
                inputMode="numeric"
                value={String(item.cantidad)}
                onFocus={e => e.target.select()}
                onChange={e => {
                  const v = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10);
                  if (!isNaN(v) && v >= 1) updateCartQty(item.producto_id, v);
                }}
                className="w-12 min-h-[36px] text-center font-bold border border-gray-300 rounded bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => updateCartQty(item.producto_id, item.cantidad + 1)}
                className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 font-bold"
              >+</button>
            </div>
            <button
              type="button"
              onClick={() => removeFromCart(item.producto_id)}
              className="text-red-400 hover:text-red-600 text-sm p-1"
            >✕</button>
          </div>
        ))}
      </div>
    )}

    <div className="flex gap-3 pt-2">
      <button onClick={() => setTrasladoStep('sucursales')} className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 min-h-[44px]">
        ← Volver
      </button>
      <button
        onClick={() => setTrasladoStep('transportista')}
        disabled={cartTraslado.length === 0}
        className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-40 min-h-[44px]"
      >
        Continuar → Transportista
      </button>
    </div>
  </div>
)}
```

**Paso 3 — Transportista:**
```tsx
{trasladoStep === 'transportista' && (
  <div className="space-y-4">
    <div>
      <label className="block text-xs font-medium text-gray-700 uppercase mb-1">RUC / Cédula Chofer</label>
      <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
        value={transportistaTraslado.ruc}
        onChange={e => setTransportistaTraslado(p => ({ ...p, ruc: e.target.value }))}
        placeholder="171..." />
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-700 uppercase mb-1">Nombre / Razón Social</label>
      <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
        value={transportistaTraslado.razon_social}
        onChange={e => setTransportistaTraslado(p => ({ ...p, razon_social: e.target.value }))}
        placeholder="Juan Pérez" />
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-700 uppercase mb-1">Placa Vehículo (opcional)</label>
      <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
        value={transportistaTraslado.placa}
        onChange={e => setTransportistaTraslado(p => ({ ...p, placa: e.target.value }))}
        placeholder="PBA-1234" />
    </div>
    {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
    <div className="flex gap-3 pt-2">
      <button onClick={() => setTrasladoStep('carrito')} className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 min-h-[44px]">
        ← Volver
      </button>
      <button
        onClick={() => { setError(''); setTrasladoStep('confirmacion'); }}
        disabled={!transportistaTraslado.ruc || !transportistaTraslado.razon_social}
        className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-40 min-h-[44px]"
      >
        Continuar → Confirmar
      </button>
    </div>
  </div>
)}
```

**Paso 4 — Confirmación:**
```tsx
{trasladoStep === 'confirmacion' && (
  <div className="space-y-4">
    <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
      <div className="flex justify-between"><span className="text-gray-500">Origen</span><span className="font-medium">{sucursales.find(s => s.id === origenId)?.nombre}</span></div>
      <div className="flex justify-between"><span className="text-gray-500">Destino</span><span className="font-medium">{sucursales.find(s => s.id === destinoId)?.nombre}</span></div>
      <div className="flex justify-between"><span className="text-gray-500">Transportista</span><span className="font-medium">{transportistaTraslado.razon_social}</span></div>
      <div className="flex justify-between"><span className="text-gray-500">Productos</span><span className="font-medium">{cartTraslado.length} ítem(s)</span></div>
    </div>
    <div className="border border-gray-200 rounded-lg divide-y">
      {cartTraslado.map(item => (
        <div key={item.producto_id} className="flex justify-between items-center px-4 py-2 text-sm">
          <span className="text-gray-800">{item.nombre}</span>
          <span className="font-bold text-gray-900">{item.cantidad} uds</span>
        </div>
      ))}
    </div>
    {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
    <div className="flex gap-3 pt-2">
      <button onClick={() => setTrasladoStep('transportista')} className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 min-h-[44px]">
        ← Volver
      </button>
      <button
        onClick={handleSubmitTraslado}
        disabled={submittingTraslado}
        className="flex-1 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 min-h-[44px]"
      >
        {submittingTraslado ? 'Procesando...' : 'Confirmar Traslado'}
      </button>
    </div>
  </div>
)}
```

**Paso 5 — Comprobante:**
```tsx
{trasladoStep === 'comprobante' && (
  <div className="text-center space-y-4 py-4">
    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
      <span className="text-3xl">✓</span>
    </div>
    <h3 className="text-xl font-bold text-gray-900">Traslado completado</h3>
    {guiaGenerada ? (
      <p className="text-sm text-gray-600">Guía de Remisión: <span className="font-mono font-bold text-green-700">{guiaGenerada}</span></p>
    ) : (
      <p className="text-sm text-gray-500">El stock fue transferido. La guía se procesará en segundo plano.</p>
    )}
    <p className="text-sm text-gray-500">
      {sucursales.find(s => s.id === origenId)?.nombre} → {sucursales.find(s => s.id === destinoId)?.nombre}
      <br/>{cartTraslado.length} producto(s) transferido(s)
    </p>
    <div className="flex gap-3 justify-center pt-2">
      <button onClick={() => { setMode('SELECTION'); setTrasladoStep('sucursales'); setCartTraslado([]); setGuiaGenerada(null); }}
        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
        Nuevo traslado
      </button>
      <button onClick={() => router.push('/guias')}
        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
        Ver guías
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 4: Verificar TypeScript limpio**

```bash
npx tsc --noEmit
# Esperado: sin output
```

- [ ] **Step 5: Commit y push frontend**

```bash
git add src/app/guias/nueva/page.tsx src/lib/api.ts
git commit -m "feat(guias): carrito multi-producto para traslado entre sucursales"
git push origin main
```

---

## Task 4: Deploy backend al VPS

- [ ] **Step 1: Subir los archivos corregidos del backend**

```bash
# Desde la máquina local, en /LedgerXpertz
rsync -avz --exclude='.git' --exclude='__pycache__' \
  core/api_inventario.py core/api_urls.py \
  root@178.156.128.85:/opt/ledgerxpertz/
```

- [ ] **Step 2: Reiniciar el contenedor web**

```bash
ssh root@178.156.128.85 "cd /opt/ledgerxpertz && docker compose restart web && docker compose logs web --tail=30"
# Verificar: sin ImportError ni SyntaxError
```

- [ ] **Step 3: Smoke test del nuevo endpoint**

```bash
ssh root@178.156.128.85 "cd /opt/ledgerxpertz && docker compose exec -T web python manage.py shell -c \"
import django.urls
try:
    url = django.urls.reverse('inventario-transferencia-bulk')
    print('URL registrada OK:', url)
except:
    print('ERROR: URL no encontrada')
\""
```

---

## Orden de ejecución

1. Task 1 (backend endpoint)
2. Task 4 (deploy backend)
3. Task 2 (api.ts)
4. Task 3 (frontend wizard)

El frontend depende del backend — ejecutar en ese orden.
