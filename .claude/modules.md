# Módulos Completados — Estado al 2026-05-25

## 🔧 Infraestructura

| Elemento | Archivo | Notas |
|---|---|---|
| PWA manifest dinámico | `src/app/manifest.json/route.ts` | `force-dynamic`; genera `name`/`short_name` según subdominio |
| Íconos PWA | `public/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `favicon.ico` | Generados desde SVG con sharp |
| Root layout | `src/app/layout.tsx` | `Viewport.themeColor`, `metadata.manifest`, `metadata.icons.apple` |
| Tenant server util | `src/utils/tenant-server.ts` | `getTenantFromServer()` lee header `x-tenant` inyectado por middleware |
| Tenant client util | `src/lib/tenant.ts` | `getTenant()` lee `window.location.hostname` |
| Middleware tenant | `src/middleware.ts` | Inyecta `x-tenant` en headers del request forwarded (`NextResponse.next({ request: { headers } })`). Antes del fix iba al response y SC no lo veían. |
| Dashboard layout | `src/components/DashboardLayout.tsx` | Menú lateral con roles; íconos: `SlidersHorizontal`, `PackagePlus`, `History`, `ShieldCheck`, `Gift`, `Layers` |
| Service Worker (Serwist) | `src/app/sw.ts`, `public/sw.js` | Plan A exitoso; `@serwist/next` + `withSerwist()`; 4 rutas de caché: WASM (CacheFirst `lx-wasm-v1`), static (CacheFirst 1y), images (StaleWhileRevalidate 30d), pages (NetworkFirst `networkTimeoutSeconds: 3`); `disable: true` en dev; `skipWaiting: false` (usuario controla activación) |
| SW hook | `src/hooks/useServiceWorker.ts` | `useServiceWorker()` → `{ needsRefresh, updateSW }`. `isUpdating` ref: `controllerchange` solo recarga si usuario apretó "Actualizar". Cleanup de listener en unmount. Llamado desde `src/app/pos/page.tsx`. |
| Dexie POS DB | `src/lib/db/posDB.ts` | Singleton `posDB`; 4 tablas: `productos` (idx: `sucursal_id, categoria_id, nombre`), `categorias`, `combos` (idx: `sucursal_id`), `ventas_offline` (idx: `estado, turno_id, created_at`) |

## 📦 Inventario

| Ruta | Estado | Notas |
|---|---|---|
| `/inventario` | Completo | Sin modal de ajuste; debounce 400ms en búsqueda. **2026-06-22:** botón \"Exportar\" (antes de \"Importar Excel\") → descarga `.xlsx` con filtros actuales en pantalla (search + sucursal). `agrupado=true` cuando no hay sucursal seleccionada (modo consolidado global), `agrupado=false` con sucursal (modo detalle por sucursal). Handler `handleExport` en `page.tsx`; método `exportarInventario(params?)` en `_inventario.ts` (espejo de `downloadPlantillaInventario`). **DESPLEGADO 2026-06-22** |
| `/inventario/ajustes` | Completo | Wizard 5 pasos (indigo); cantidad = stock objetivo → calcula delta |
| `/inventario/ingresos` | Completo | Wizard 5 pasos (verde); cantidad = delta directo; chips de motivo |
| `/inventario/movimientos` | Completo | Kardex global paginado; filtros sucursal/tipo/fecha |
| `/inventario/auditoria/[id]` | Completo | Detalle de conteo físico (contar/guardar/finalizar). **2026-06-22:** modo admin "Aplicar ajustes" — cuando la auditoría está FINALIZADA/AJUSTADA y el usuario es admin, aparece checkbox por fila ajustable (contada, dif≠0, no `revisado`) + select-all + botón "Aplicar ajustes (N)" → `POST /api/conteo/auditorias/{id}/aplicar_ajustes/` (aprobación selectiva). Filas ya aplicadas muestran ✓. Lógica pura en `[id]/_ajustes.ts` (`esAjustable`, `idsAjustables`); test `src/__tests__/inventario/auditoriaAjustes.test.ts` (6/6). Gate admin = `is_staff\|\|is_superuser\|\|grupo 'Administrador'`. **DESPLEGADO 2026-06-22 (Version `a89c3056`)** — 4 assets (BUILD_ID + CSS + chunk auditoría + chunk compartido api client `9588`; NO el del POS). persepolis sin turno; la_huequita con turno 47 (auditoría, 0 ventas). Smoke: persepolis `/`,`/pos`,`/sw.js`,`/inventario/auditoria` → 200; la-huequita `/pos`,`/inventario/auditoria` → 200; chunk contiene "Aplicar ajustes". |
| `/inventario/ajustes/lote` | Completo | Dos paneles indigo; ENTRADA/SALIDA por línea; motivo global; bulk endpoint. **2026-06-22:** muestra "Stock actual: N" de la sucursal elegida + "Quedará en: X" en vivo (rojo si negativo). Lógica pura en `lote/_calculos.ts` (`stockEnSucursal`, `calcularStockResultante`); el `desglose` por sucursal ya venía del backend en modo `agrupado`. Test: `src/__tests__/inventario/loteCalculos.test.ts` (7/7). **DESPLEGADO 2026-06-22 (Version `0ebd0bc0`)** — subió solo 2 assets (BUILD_ID + chunk de la página de lote, NO el del POS → cero impacto en ventas). persepolis sin turno; la_huequita con 3 turnos activos pero el chunk del POS no cambió. Smoke: persepolis `/`,`/pos`,`/sw.js`,`/inventario/ajustes/lote` → 200; la-huequita `/pos`,`/inventario/ajustes/lote` → 200; chunk contiene "Stock actual". |

**Patrones:**
- Role guard: `user.is_staff || user.is_superuser || user.groups?.includes('Administrador')`
- Touch targets: `min-h-[44px]` controles, `min-h-[48px]` botones primarios
- Wizard: buscar producto → sucursal → formulario → confirmación → comprobante

## 🎁 Combos

| Ruta | Estado | Notas |
|---|---|---|
| `/combos` | Completo | Lista paginada; filtros search+sucursal+activo |
| `/combos/nuevo` | Completo | Guard admin + `ComboForm` vacío |
| `/combos/[id]/editar` | Completo | Carga combo existente incl. categorías de slots |

**Patrones:**
- `api.getCombos({ page, search, sucursal, activo })` → `GET /api/combos/`
- `api.crearCombo(payload)` con `items_write` y `slots_write`
- `ComboSlotReadSerializer` devuelve `categorias: [ids]` — úsalo para pre-poblar edición
- `opciones_slot` devuelve 404 si `sucursal_id` no pertenece al tenant

## 🛒 Ventas / POS

| Ruta | Estado | Notas |
|---|---|---|
| `/pos` | Actualizado | Usa `POSLayout` (NO `DashboardLayout`). Stepper carrito; chips categoría desktop. **2026-06-24:** Autocompletado de cliente por RUC/cédula en onBlur, consultando el nuevo endpoint SRI/caché del backend. Implementado usePOSClient.lookupRuc + consultandoSri state + POSClientModal cableado. |
| `/pos/recibo` | Completo | Recibo térmico 72mm; todo `font-weight: bold`; auto-print |
| `/pos/comanda` | Completo | Comanda de cocina 72mm; ítems con precio unitario en itálica; VALOR TOTAL al pie; auto-print |
| `/ventas` | Existente | Historial de ventas (solo Administrador) |
| `/turnos` | Existente | Historial de cajas |

**Patrones POS — carrito:**
- Stepper `[-][qty][+]`: `type="text" inputMode="numeric"`, `onFocus={e => e.target.select()}`
- Carrito responsivo: anchos en el wrapper exterior (flex item del row), NO en `POSCart`. `pos/page.tsx`: `md:flex shrink-0 md:w-[320px] lg:w-[360px] xl:w-[400px]`. `POSCart` interno usa `w-full`.
- Grid wrapper (hermano del carrito) **DEBE** tener `min-w-0` — sin él, los chips de categoría + grid de productos empujan al carrito fuera del viewport en `lg` (bug histórico desde refactor `60f0985`, fix en `fe54bec7`).
- Botones stepper: `min-w-[40px] min-h-[44px]`

**Patrones POS — categorías:**
- Desktop: chips `hidden lg:flex overflow-x-auto min-h-[48px]`; chip "Todos" al inicio
- Mobile/tablet: drawer bottom sheet (`lg:hidden`)

**Patrones POS — combos con slots:**
- `buscarCombos(q, sucursalId)` → `GET /api/combos/buscar/`
- Si `combo.slots.length === 0` → agrega directo al carrito
- Si `combo.slots.length > 0` → abre `SlotSelectionModal`; fetch paralelo de `getComboOpciones`
- Payload checkout: `{ type:'combo', combo_id, cantidad, slot_selections:[{slot_id, producto_id}] }`

**Patrones POS — impresión:**
- `handleProcessSale` abre `window.open('about:blank', '_blank')` ANTES del `await` (evita popup blocker)
- Guarda `posRecibo` y `posComanda` en `localStorage`, navega la ventana pre-abierta a `/pos/recibo`
- Guard de tenant: `TENANTS_CON_IMPRESORA = ['persepolis']` — hardcoded hasta migrar flag al backend

**Patrones POS — offline (Subfases 3.2 + 3.3):**
- Catálogo offline: `useOfflineCatalog` → `preloadCatalog(sucursalId)` al abrir turno; descarga productos paginados + presentaciones **en bulk (1 sola petición)** + categorías + combos con opciones en transacción Dexie atómica
- **Perf presentaciones (2026-06-09):** `preloadCatalog` ya NO hace N+1 (1 request por producto). Usa `apiClient.getBulkPresentaciones(sucursalId)` → `GET /api/auth/productos/presentaciones/bulk/` y mapea por `producto_id` a cada producto. El sync pasó de ~N requests a **2** (productos paginados + bulk presentaciones). Backend en `changelog.md` 2026-06-09.
- **Perf carrito/búsqueda (2026-06-09):** `usePOSCart` solo llama `getPresentaciones` si `presentaciones.length === 0` (antes pegaba al backend en cada click del carrito, ignorando Dexie). `usePOSProducts.handleSearch` con debounce de 300ms (antes 1 request por tecla).
- **Reset del buscador tras cobrar (2026-06-18):** `usePOSProducts.resetSearch()` limpia texto + categoría, cancela el debounce pendiente y recarga el catálogo completo. `onSaleComplete` (`pos/page.tsx`) lo invoca y reenfoca `searchInputRef` → tras cobrar, el cajero escribe la siguiente venta directo sin borrar lo anterior. Antes recargaba con `searchTerm`/`selectedCategoria` viejos (el texto se quedaba escrito). Test: `usePOSProducts.resetSearch.test.ts`.
- **Caché de categorías — stale-while-revalidate (2026-06-23, T2.2, pendiente deploy):** `usePOSProducts.loadCategorias()` lee primero de `posDB.categorias` (Dexie) y pinta al instante (0 red), luego revalida contra `getCategorias()` y refresca estado + caché (`clear`+`bulkPut`); si el backend falla, conserva lo cacheado. Antes refetcheaba en cada carga del POS — `GET /api/auth/categorias/` se llamaba ×31 en 1h en persepolis (recarga por venta). Aislamiento por tenant = automático (Dexie es por-origen/subdominio). TDD: `usePOSProducts.categoriasCache.test.ts` (3/3). Suite POS 38/38, tsc OK. **Deploy gateado** (persepolis sin turno).
- Cola de ventas: `useOfflineQueue` → `enqueueSale()` guarda `VentaOfflineDB` como `PENDIENTE`; `processSyncQueue()` FIFO, error de red para la cola, error de negocio → `ERROR_SYNC` + continúa
- Conteos reactivos: `useLiveQuery` de dexie-react-hooks para `pendingCount`/`errorCount` en `POSLayout`
- Recuperación de turno offline: `pos_turno_cache` en localStorage; `checkTurno` catch → restaura turno desde caché si red caída
- Reconexión: `isOffline` + `online` event → `loadProductos` con `latestRef`/`loadProductosRef` (evita stale closures)
- SW cachea app shell (JS/CSS/WASM); Dexie cachea datos — nunca duplicar responsabilidades

**Bug fix — logout:**
- `AuthContext.logout()`: `sessionStorage.setItem('loggedOut', '1')` antes de redirect
- `checkSession()`: si existe el flag, lo borra y retorna sin llamar al backend
- **Logout espurio al minimizar el POS (la_huequita, 2026-06-19) — ✅ DESPLEGADO 2026-06-20 (Version `eb317515`):** access token dura 15 min (refresh 7 días). Al minimizar >15 min y volver, el primer request da 401 → `refreshAndRetry` (`_base.ts`) refrescaba, pero ante CUALQUIER fallo del refresh hacía logout duro (`removeItem('user')` + `location.href='/login'`). Al despertar la red de la tablet, el fetch del refresh fallaba transitoriamente → deslogueaba pese a sesión viva. **Fix:** desloguear SOLO si el refresh devuelve rechazo de auth real (`status===401||403`); error de red (fetch lanza, `status` undefined/0, offline) NO desloguea — el request se reintenta al recuperar la red. Espeja la defensa de red que ya tenía `checkSession`. TDD: `src/__tests__/api/refreshAndRetry.test.ts` (3/3; RED reprodujo el logout por error de red). Suite 60/60, tsc OK. Commit `2e9fd29`. **Deploy:** persepolis SIN turno (gate OK); la_huequita con turnos activos (37/38) pero el cambio es solo del interceptor de auth, NO del path de venta. Subió solo 2 assets (BUILD_ID + chunk compartido del api client `9588-cf489d830a13c9e5.js`, 111 sin cambios → precaching mínimo). Smoke: la_huequita `/`,`/pos`,`/sw.js`,chunk → 200 (8/8 estable en `/pos`, chunk contiene `auth/refresh/`); persepolis `/`,`/pos` → 200. Sin 5xx.

## 📋 Guías de Remisión

| Ruta | Estado | Notas |
|---|---|---|
| `/guias` | Completo | Tabla unificada Ventas/Traslados; filtros fecha/búsqueda/estado SRI; 358 líneas |
| `/guias/nueva` | Completo | Modo VENTA (guía desde factura) y TRASLADO (wizard 4 pasos con carrito) |

**Patrones:**
- TRASLADO: sucursales → carrito (stepper, debounce 400ms) → transportista → confirmación
- `api.trasladoBulk({ origen_id, destino_id, productos, generar_guia, transportista })`
- `enviar_sri=False` — guía queda en borrador; se envía desde `/guias`

## 🛒 Compras y Proveedores

| Ruta | Estado | Notas |
|---|---|---|
| `/compras` | Completo | Historial paginado (15.7KB) |
| `/compras/nueva` | Completo | Formulario de registro de compra |
| `/proveedores` | Completo | Gestión de proveedores (18KB) |

- `api.getCompras()`, `api.crearCompra(payload)`, `api.getProveedores()` → `_compras.ts`

## 📒 Contabilidad

| Ruta | Estado | Notas |
|---|---|---|
| `/contabilidad/libro-diario` | Completo | Asientos con filtros fecha; filas expandibles Debe/Haber (241 líneas) |
| `/contabilidad/plan-cuentas` | Completo | Árbol jerárquico; modal CRUD; tipos de cuenta (339 líneas) |

- `api.getAsientos(params)`, `api.getPlanCuentas()` → `_contabilidad.ts`

## 🗂️ Menú lateral (`DashboardLayout.tsx`)

| Sección | Ítems |
|---|---|
| Inventario | Ajuste de Stock · Ingreso de Mercadería · Ajuste por Lote (ícono `Layers`) · Movimientos |
| Productos | Listar · Agregar · Categorías · Combos (ícono `Gift`) |
| Logística | Guías de Remisión |
| Compras | Registrar Compra · Historial · Proveedores |
| Contabilidad & Tributación | Libro Diario · Plan de Cuentas |

## 📊 Reportes

| Ruta | Estado | Notas |
|---|---|---|
| `/reportes` | Pendiente mejoras | Cierre de caja, ventas del día, resumen de productos |

**Pendiente:** Cierre de caja por cajero · Ventas del día por sucursal · Exportar/filtrar visible · CSR obligatorio.

---

## 📦 Estructura de `src/lib/api/`

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

**Regla:** endpoint nuevo → al módulo de su dominio. No crear archivo para un solo método.
