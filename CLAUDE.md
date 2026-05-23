# Experto Frontend ERP - LedgerXpertz Web

**Rol:** Eres un Experto Frontend en Next.js 15+ (App Router), React, y TailwindCSS, especializado en arquitecturas Multi-Tenant desplegadas en Cloudflare Workers (Edge Computing vía OpenNext).

## 🏢 Contexto del Proyecto
Este es el panel de control (Dashboard) y App Shell del ERP LedgerXpertz. Consume la API de Django y maneja datos financieros y fiscales sensibles.

## 🚨 DEPLOY — Flujo Obligatorio (IMPORTANTE)

`npm run build` **solo** compila Next.js. Si no corres OpenNext después, Cloudflare sirve los chunks viejos aunque el código haya cambiado.

**Siempre usar estos 3 pasos en orden:**
```bash
npm run build                        # 1. Compila Next.js → .next/
npx opennextjs-cloudflare build      # 2. Empaqueta para Cloudflare → .open-next/
npx wrangler deploy                  # 3. Sube assets + worker a Cloudflare
```

Síntoma de omitir el paso 2: el browser carga chunks viejos (mismo hash) aunque el deploy diga "success". Wrangler reporta "No updated asset files to upload" cuando `.open-next/` no fue regenerado.

---

## 📐 Reglas de Arquitectura — Responsabilidad Única (OBLIGATORIO)

Estas reglas aplican a todo archivo nuevo o modificado. No son negociables.

### Límites de tamaño

| Tipo de archivo | Objetivo | Señal de alarma |
|-----------------|----------|-----------------|
| `page.tsx` | ~150 líneas | Solo composición: imports + hooks + JSX mínimo |
| Componente UI (`*.tsx`) | ~250 líneas | Si tiene más de 1 modal o más de 3 `useState`, dividir |
| Custom hook (`use*.ts`) | ~150 líneas | Si hace más de una cosa, dividir |
| Utilidad pura (`*.ts`) | ~100 líneas | Funciones puras sin estado ni efectos |

> **Estos límites son guías, no reglas absolutas.** Pasarse 10-20 líneas está bien si el código es cohesivo. Si algo depende estrechamente de otra cosa y separarlos rompería la lógica o haría el código más confuso, déjalo junto. El objetivo es claridad, no cumplir un número.
>
> **Regla de oro:** Si necesitas scrollear para ver todo el código de un archivo, ya es demasiado grande.

### Una responsabilidad por archivo

Cada archivo debe poder describirse en una frase sin usar "y":

- ✅ `usePOSCart.ts` — maneja el estado y operaciones del carrito
- ✅ `POSClientModal.tsx` — UI del modal de búsqueda/creación de cliente
- ❌ `pos/page.tsx` — maneja el carrito, los clientes, los combos, la impresión y el turno ← esto es un god file

### Cómo dividir un page component grande

Cuando un `page.tsx` supera 150 líneas, usar esta estructura:

```
app/[feature]/
  page.tsx               ← solo imports + hooks + JSX de alto nivel (<150 líneas)
  hooks/
    use[Feature][Concern].ts   ← un hook por dominio de estado
  components/
    [Feature][Part].tsx        ← un componente por sección de UI
```

**Ejemplo para el POS:**
```
app/pos/
  page.tsx                  ← orquesta hooks, renderiza layout
  hooks/
    usePOSTurno.ts           ← estado del turno, abrir/cerrar
    usePOSCart.ts            ← carrito, agregar/quitar/calcular
    usePOSClient.ts          ← búsqueda y creación de cliente
    usePOSProducts.ts        ← catálogo, categorías, búsqueda
  components/
    POSCart.tsx              ← UI del carrito con stepper
    POSClientModal.tsx       ← modal buscar/crear cliente
    POSProductGrid.tsx       ← grilla de productos y categorías
    POSSlotModal.tsx         ← selector de slots de combos
```

### Señales de que hay que refactorizar YA

- Un componente tiene más de 5 `useState`
- Un `useEffect` supera 15 líneas
- Hay que buscar con Ctrl+F dentro de un solo archivo
- Un bug requiere leer más de 200 líneas para entenderse
- Hay más de un modal definido en el mismo archivo

### Lo que NO hacer

- No crear abstracciones genéricas antes de necesitarlas (YAGNI)
- No unificar hooks solo porque "parecen relacionados" — que cada uno haga una cosa
- No mover lógica a un hook si solo la usa un componente y tiene < 20 líneas

---

## 🛠️ Reglas de Desarrollo

1.  **Renderizado Híbrido:** Respeta la estrategia actual: usa ISR (Incremental Static Regeneration) con tags de caché dinámicos para catálogos, y CSR (Client-Side Rendering) para datos volátiles (como stock real o dashboards financieros).
2.  **Middleware y Tenancy:** El subdominio define el tenant. Asegúrate de que el middleware en el Edge propague correctamente el header `X-Tenant` en todas las peticiones hacia el backend.
3.  **Autenticación (JWT):** Estamos transicionando hacia JWT. El `AuthContext` debe manejar los tokens de forma segura (idealmente HttpOnly cookies si interactúa con el backend, o manejo seguro en memoria si es SPA pura), asegurando credenciales `omit` o configuraciones estrictas de CORS.
4.  **Aislamiento de Módulos:** Mantén una clara separación entre el tenant público (Landing Page) y los tenants privados (Dashboard de empresas).

## 🧠 Skills y Autoinvocación

Cuando trabajes con Server Components, llamadas a la API, hooks de React Query o problemas de caché, DEBES leer obligatoriamente el archivo `.claude/skills/nextjs-tenant-ui/SKILL.md` antes de proponer o escribir cualquier código.

---

## ✅ Módulos Completados (estado al 2026-05-22)

### 🔧 Infraestructura

| Elemento | Archivo | Estado | Notas |
|---|---|---|---|
| PWA manifest dinámico | `src/app/manifest.json/route.ts` | Completo | `force-dynamic`; genera `name`/`short_name` según subdominio del tenant |
| Íconos PWA | `public/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `favicon.ico` | Completo | Generados desde SVG con sharp |
| Root layout | `src/app/layout.tsx` | Actualizado | `Viewport.themeColor`, `metadata.manifest`, `metadata.icons.apple` |
| Tenant server util | `src/utils/tenant-server.ts` | Estable | `getTenantFromServer()` lee header `host`; úsalo en Server Components y Route Handlers |
| Tenant client util | `src/lib/tenant.ts` | Estable | `getTenant()` lee `window.location.hostname`; úsalo en Client Components |
| Dashboard layout | `src/components/DashboardLayout.tsx` | Actualizado | Menú lateral con roles; íconos importados: `SlidersHorizontal`, `PackagePlus`, `History`, `ShieldCheck`, `Gift`, `Layers` |

### 📦 Inventario

| Ruta | Archivo | Estado | Descripción |
|---|---|---|---|
| `/inventario` | `inventario/page.tsx` | Limpiado | Gestión de stock; sin modal de ajuste; debounce 400ms en búsqueda |
| `/inventario/ajustes` | `inventario/ajustes/page.tsx` | Completo | Wizard 5 pasos (indigo); cantidad = **stock objetivo** → calcula delta |
| `/inventario/ingresos` | `inventario/ingresos/page.tsx` | Completo | Wizard 5 pasos (verde); cantidad = **delta directo**; campo origen; chips de motivo |
| `/inventario/movimientos` | `inventario/movimientos/page.tsx` | Completo | Kardex global paginado; filtros sucursal/tipo/fecha_desde/fecha_hasta |
| `/inventario/ajustes/lote` | `inventario/ajustes/lote/page.tsx` | Completo | Dos paneles (indigo); ENTRADA/SALIDA por línea; motivo global; reutiliza bulk endpoint |
| `/inventario/auditoria` | `inventario/auditoria/page.tsx` | Existente | Sin cambios |

**Patrones del módulo de inventario:**
- Role guard (solo Administrador): `user.is_staff || user.is_superuser || user.groups?.includes('Administrador')` → `router.replace('/inventario')`
- Touch targets: `min-h-[44px]` controles, `min-h-[48px]` botones de acción primaria
- Wizard: search producto → sucursal → formulario → confirmación → comprobante
- Búsquedas: `useDebounce(term, 400)` + `getInventario({ agrupado: true, search })`
- Ajustes e ingresos: `api.ajusteInventario({ producto_id, sucursal_id, tipo, cantidad, motivo })`
- Kardex: `api.getMovimientos({ page, sucursal, tipo, fecha_desde, fecha_hasta })`

### 🎁 Combos

| Ruta | Archivo | Estado | Descripción |
|---|---|---|---|
| `/combos` | `combos/page.tsx` | Completo | Lista paginada; columnas Nombre/Precio/Sucursal/Items fijos/Slots variables/Estado; filtros search+sucursal+activo; cards mobile |
| `/combos/nuevo` | `combos/nuevo/page.tsx` | Completo | Guard admin + `ComboForm` vacío |
| `/combos/[id]/editar` | `combos/[id]/editar/page.tsx` | Completo | Carga combo existente (incl. categorías de slots); rellena `ComboForm` |
| — | `combos/ComboForm.tsx` | Completo | Formulario compartido: datos básicos · productos fijos (búsqueda debounce 400ms + presentaciones) · slots variables (categorías pill-toggle) |

**Patrones del módulo de combos:**
- Guard de permisos: `user.is_superuser || user.is_staff || user.groups?.includes('Administrador')`
- `api.getCombos({ page, search, sucursal, activo, page_size })` → `GET /api/combos/`
- `api.crearCombo(payload)` → `POST /api/combos/` con `items_write` y `slots_write`
- `api.actualizarCombo(id, payload)` → `PATCH /api/combos/{id}/`
- `api.eliminarCombo(id)` → `DELETE /api/combos/{id}/`
- `api.getCombo(id)` → `GET /api/combos/{id}/` — devuelve `slots[].categorias` como lista de IDs
- `sucursalFilter` cross-check: `opciones_slot` devuelve 404 si `sucursal_id` no pertenece al tenant

### 🛒 Ventas / POS

| Ruta | Archivo | Estado | Descripción |
|---|---|---|---|
| `/pos` | `pos/page.tsx` | Actualizado | Usa `POSLayout` (NO `DashboardLayout`). Stepper `[-][qty][+]` en carrito; chips de categoría desktop; carrito responsivo `md:w-[320px] lg:w-[360px] xl:w-[400px]`; impresión térmica post-venta |
| `/pos/recibo` | `pos/recibo/page.tsx` | Completo | Recibo térmico 72mm; todo `font-weight: bold`; auto-print; botón "Imprimir Comanda Cocina" visible en pantalla, oculto al imprimir |
| `/pos/comanda` | `pos/comanda/page.tsx` | Completo | Comanda de cocina 72mm; solo ítems con cantidades en letra grande (26px/17px bold); auto-print |
| `/ventas` | `ventas/page.tsx` | Existente | Historial de ventas (solo Administrador) |
| `/turnos` | `turnos/page.tsx` | Existente | Historial de cajas |

**Patrones POS — layout (CRÍTICO):**

El POS usa `POSLayout` (`src/components/POSLayout.tsx`), NO `DashboardLayout`. Son layouts con contratos distintos:

| Layout | Usado en | Estructura |
|---|---|---|
| `DashboardLayout` | Todas las páginas admin/ERP | Header + sidebar `w-64` + `main` con `max-w-7xl py-8` |
| `POSLayout` | `/pos` y futuras rutas kiosk | Header 64px + `flex-1 overflow-hidden` — control total del viewport |

Por qué esta separación existe: el POS es una app kiosk full-screen. Meterla dentro de `DashboardLayout` obligaba a anular todos sus estilos con excepciones por ruta (`isPOS`). Sniffar el pathname en el layout para cambiar su propia estructura es un antipatrón — el layout no debería saber quién está adentro.

**Regla:** Cualquier página que necesite `h-screen` y control total del viewport (kiosk, modo pantalla completa) debe tener su propio Layout, nunca usar excepciones dentro de `DashboardLayout`.

**Sincronización de turno en POSLayout:**
- Lee `localStorage.getItem('activeTurno')` al montar
- Escucha `window.addEventListener('storage', ...)` para actualizaciones cross-tab
- `usePOSTurno` dispara `window.dispatchEvent(new Event('storage'))` al abrir/cerrar turno — así el header del POSLayout se actualiza en la misma pestaña
- El botón "Cerrar Turno" despacha `new CustomEvent('pos:close-turno')` → `pos/page.tsx` lo escucha y abre el modal de cierre

**Patrones POS — combos con slots:**
- `buscarCombos(q, sucursalId)` → `GET /api/combos/buscar/`
- Si `combo.slots.length === 0` → agrega directo al carrito (retrocompatible)
- Si `combo.slots.length > 0` → abre `SlotSelectionModal`; fetch paralelo de `getComboOpciones` por cada slot
- Payload checkout: `{ type:'combo', combo_id, cantidad, slot_selections:[{slot_id, producto_id}] }`
- Nombre en carrito: `"Combo Zhumir — Coca Cola"` (primer slot seleccionado)

**Patrones POS — impresión térmica:**
- `handleProcessSale` abre `window.open('about:blank', '_blank')` ANTES del `await` (evita popup blocker de Chrome)
- Después del `await`: guarda `posRecibo` y `posComanda` en `localStorage`, navega la ventana pre-abierta a `/pos/recibo`
- `/pos/recibo` auto-imprime el recibo; muestra botón naranja "Imprimir Comanda Cocina" (solo en pantalla)
- Al tocar el botón → `window.open('/pos/comanda', '_blank')` (click directo → Chrome lo permite)
- `/pos/comanda` auto-imprime la comanda de cocina
- Guard de tenant: `TENANTS_CON_IMPRESORA = ['persepolis']` — solo abre ventanas para tenants con impresora

**Patrones POS — categorías desktop:**
- Chips horizontales scrolleables (`overflow-x-auto`) con `min-h-[48px]` para touch-first en 14"
- Visibles solo en `lg+` (`hidden lg:flex`); mobile/tablet sigue usando el drawer bottom sheet
- Chip "Todos" al inicio para limpiar filtro

**Bug fix — logout redirige al dashboard:**
- `AuthContext.logout()`: agrega `sessionStorage.setItem('loggedOut', '1')` antes de `window.location.href = '/login'`
- `checkSession()`: si existe el flag, lo borra y retorna sin llamar `getCurrentUser()` — evita que la cookie de sesión aún válida re-autentique al usuario

### 📋 Guías de Remisión

| Ruta | Archivo | Estado | Descripción |
|---|---|---|---|
| `/guias/nueva` | `guias/nueva/page.tsx` | Actualizado | Modo VENTA: guía desde factura autorizada. Modo TRASLADO: wizard 4 pasos con carrito multi-producto |

**Patrones del módulo de guías:**
- TRASLADO: sucursales → carrito de productos (stepper `[-][qty][+]`, búsqueda debounce 400ms por sucursal origen) → transportista → confirmación → comprobante
- `api.trasladoBulk({ origen_id, destino_id, productos, generar_guia, transportista })` → `POST /api/auth/inventario/transferencia/bulk/`
- `enviar_sri=False` — guía queda en borrador; se envía al SRI manualmente desde `/guias` (firmado con `.p12` vía `FirmaGuiaRemisionService`)
- Carrito verde (`border-green-200`, `bg-green-50`); comprobante muestra `guia_numero` o mensaje de fallback

### 📊 Reportes

| Ruta | Archivo | Estado | Descripción |
|---|---|---|---|
| `/reportes` | `reportes/page.tsx` | Pendiente mejoras | Cierre de caja, ventas del día, resumen de productos — UX a mejorar |

**Pendiente en reportes:**
- Cierre de caja por cajero
- Ventas del día por sucursal
- Resumen de productos vendidos
- Principios: claridad ante todo, datos clave al tope, exportar/filtrar visibles, CSR obligatorio

---

## 📦 Estructura de API (`src/lib/api/`)

`src/lib/api.ts` fue dividido en módulos por dominio (2026-05-23). El barrel `index.ts` re-exporta todo — los imports existentes `import { api } from '@/lib/api'` siguen funcionando sin cambios.

```
src/lib/api/
├── _base.ts         — apiFetch, headers X-Tenant/Authorization, manejo de errores
├── _auth.ts         — login, logout, getCurrentUser, botLogin
├── _productos.ts    — getProductos, getProducto, crearProducto, categorías
├── _inventario.ts   — getInventario, ajusteInventario, getMovimientos, transferencia
├── _ventas.ts       — getPOS, procesarVenta, getVentas
├── _combos.ts       — getCombos, crearCombo, actualizarCombo, opciones slots
├── _compras.ts      — getCompras, crearCompra, proveedores
├── _guias.ts        — getGuias, crearGuia, trasladoBulk, enviarSRI
├── _terceros.ts     — getClientes, crearCliente, buscarCliente
├── _sucursales.ts   — getSucursales, getTurnoActivo
├── _turnos.ts       — getTurnos, abrirTurno, cerrarTurno
├── _empresas.ts     — getEmpresa, actualizarEmpresa, uploadCertificado
├── _reportes.ts     — getReportes, getCierreCaja, getVentasDia
├── _contabilidad.ts — getAsientos, getPlanCuentas
└── index.ts         — re-exporta todo (retrocompatible con api.ts)
```

**Regla:** Si agregas un endpoint nuevo, ponlo en el módulo de su dominio (`_inventario.ts` para inventario, etc.). No crear un nuevo archivo para un solo método.

---

## 🔗 Contrato con el Backend

- **CRÍTICO:** Antes de asumir qué devuelve cualquier endpoint, navega a `/LedgerXpertz` e inspecciona el serializer correspondiente.
- Los combos aparecen en reportes con nombre formato `[COMBO] {nombre} #{id}` — considéralo al mostrar líneas de venta.
- `GET /api/combos/` soporta `?search=`, `?activo=`, `?sucursal=` (DjangoFilterBackend + SearchFilter configurados en el ViewSet).
- `ComboSlotReadSerializer` devuelve `categorias: [ids]` — úsalo para pre-poblar el formulario de edición.
- Endpoint de ajuste de stock: `POST /api/inventario/ajuste/` — campos: `producto_id`, `sucursal_id`, `tipo` (`ENTRADA`|`SALIDA`), `cantidad`, `motivo`.
- Kardex: `GET /api/inventario/movimientos/` — soporta `?fecha_desde=YYYY-MM-DD&fecha_hasta=YYYY-MM-DD&sucursal=id&tipo=TIPO`.
- Traslado bulk: `POST /api/auth/inventario/transferencia/bulk/` — campos: `origen_id`, `destino_id`, `productos:[{producto_id, cantidad}]`, `generar_guia`, `transportista:{ruc, razon_social, placa?}`. Registrado bajo namespace `auth_api`.

## 📱 Estrategia de Responsive

**Tablet-first para el módulo POS (cajeros):**
- Breakpoint base: 768px (iPad estándar)
- Touch targets mínimo 44×44px — los cajeros operan con dedos, no mouse
- Botones de acción grandes y bien separados
- Sin hover-only interactions en flujos de caja
- Grids de productos en 2-3 columnas máximo

**Desktop-first para reportes y administración:**
- Diseño principal en 1280px+
- Debe verse bien en 768px pero no es el caso principal
- Tablas con scroll horizontal en tablet, no colapsar columnas importantes

**Regla general:** Nunca uses solo `hover:` para revelar acciones críticas.
Siempre visible o con `focus-visible:` también.

## 🌐 PWA — Notas de Implementación

- El manifest **debe ser dinámico** (`force-dynamic`) porque cada subdominio es un tenant distinto con su propio `name`/`short_name`.
- No implementar Service Worker ni caché offline por ahora — solo instalable.
- El `favicon.ico` usa el formato ICO moderno con PNG embebido (32×32); compatible con todos los navegadores modernos.
- Si se agregan nuevos tenants, el manifest se adapta automáticamente — no requiere cambios de código.

---

## 🖨️ Impresión Térmica POS — Diseño (pendiente de implementación)

### Contexto
Persepolis Grill & Burgers (tenant `persepolis`) usa una impresora térmica **Bematech LR2000** conectada por USB o Serial RS-232 a la laptop del cajero. Otros tenants no tienen impresora — la feature debe ser completamente opcional.

**Impresora:** Bematech LR2000 · ESC/POS · 80mm · USB Tipo B + RS-232 · 24V 2.5A

### Regla de oro
**La impresión nunca bloquea la venta.** Si falla (impresora offline, papel agotado, puerto incorrecto), la venta ya está guardada en BD y el cajero ve un aviso claro — nunca un error silencioso ni el POS congelado.

### Configuración por tenant/sucursal
Campo `impresora_activa: bool` + `impresora_puerto: str` en `Sucursal` (backend).  
Si `impresora_activa = false` o el campo no existe → el frontend **no intenta imprimir**, sin errores.

### Flujo post-venta
```
Venta guardada en BD
  └─ ¿sucursal.impresora_activa?
       ├─ No  → fin (flujo normal)
       └─ Sí  → intentar imprimir ticket ESC/POS
                  ├─ Éxito → ticket impreso, toast verde
                  └─ Falla → toast amarillo "No se pudo imprimir — venta guardada"
```

### Estrategia de integración (probar en orden)

**Opción A — Web Serial API** *(preferida, sin instalación)*
- Chrome/Edge 89+ soportan `navigator.serial` nativo
- El browser solicita permiso al usuario una vez (queda recordado)
- Funciona si el USB de la Bematech aparece como puerto COM en Windows, o directo por RS-232
- Sin software adicional en la laptop del cajero

**Opción B — QZ Tray** *(fallback robusto)*
- App Java que corre en background en la laptop del cajero
- El browser se conecta vía WebSocket a `localhost:8181`
- Soporta USB, Serial y red — agnóstico al tipo de impresora
- Requiere instalar Java + QZ Tray en cada máquina cajero

### Ticket ESC/POS — contenido mínimo
```
[Nombre del negocio]
[Dirección · Teléfono]
--------------------------------
# Pedido: {numero}    {hora}
--------------------------------
{item}  x{cant}    ${precio}
...
--------------------------------
TOTAL:             ${total}
Pago: {metodo}
================================
      Gracias por su compra
```

### Estado actual
- [x] Verificar USB Bematech — **USB Printer Class** (VID_0FE6), NO aparece como COM. Web Serial API no aplica.
- [x] Elegir estrategia — **`window.print()` desde Chrome** (impresora LR2000 configurada en Windows como predeterminada; papel 72mm, sin márgenes). Sin QZ Tray, sin instalación extra.
- [x] Integrar en POS post-checkout — `handleProcessSale` guarda datos en `localStorage['posRecibo']` y abre `/pos/recibo` en nueva ventana.
- [x] Página `/pos/recibo/page.tsx` — HTML monospace 72mm, auto-llama `window.print()` al cargar. Muestra: negocio, sucursal, fecha, items, IVA, total, pagos, cambio, número autorización.
- [x] Lógica condicional en `handleProcessSale` — lista `TENANTS_CON_IMPRESORA` en el frontend (hardcoded). Solo abre ventana de recibo si el tenant está en la lista. Solución temporal hasta que el backend exponga el flag.
- [ ] **Migración backend pendiente** (cuando haya un segundo tenant con impresora): ver sección "Plan de migración impresora → backend" más abajo.

**Notas de implementación:**
- El nombre del negocio se mapea en `/pos/recibo/page.tsx` desde el subdominio (objeto `names`). Agregar nuevos tenants ahí si necesitan impresora.
- El recibo NUNCA bloquea la venta: se guarda en BD primero, la ventana se abre después. Si el usuario cierra sin imprimir, la venta ya está registrada.
- Chrome en el POS de Persepolis: impresora LR2000 como predeterminada, papel 72mm configurado, sin márgenes.

### Plan de migración impresora → backend (cuando haya un segundo tenant con impresora)

**Problema que resuelve:** Hoy la lista `TENANTS_CON_IMPRESORA` está hardcoded en `pos/page.tsx`. Agregar un tenant nuevo requiere deploy de frontend. Con el flag en BD, basta con cambiar un campo en el admin de Django.

**Pasos:**

1. **Backend — modelo** (`core/models.py` o `empresas/models.py`):
   ```python
   # En modelo Sucursal:
   impresora_activa = models.BooleanField(default=False)
   impresora_puerto = models.CharField(max_length=50, blank=True)  # reservado, hoy no se usa
   ```
   Migración: `python manage.py makemigrations && python manage.py migrate_schemas --shared`

2. **Backend — serializer** (`core/serializers.py`): exponer `impresora_activa` en el serializer de `Sucursal` (o en la respuesta del turno activo `getTurnoActivo`). Lo más práctico: añadirlo al payload de `turno-activo/` para que el POS lo tenga sin llamada extra.

3. **Frontend — tipo Turno** (`pos/page.tsx`): agregar `impresora_activa?: boolean` a la interfaz `Turno`.

4. **Frontend — reemplazar el check hardcoded**:
   ```ts
   // Antes:
   const TENANTS_CON_IMPRESORA = ['persepolis'];
   if (TENANTS_CON_IMPRESORA.includes(currentTenant)) { ... }

   // Después:
   if (turno?.impresora_activa) { ... }
   ```

5. **Activar por sucursal** desde el admin Django: `Sucursal → impresora_activa = True`.
