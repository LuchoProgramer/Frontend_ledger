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

## 🛠️ Reglas de Desarrollo

1.  **Renderizado Híbrido:** Respeta la estrategia actual: usa ISR (Incremental Static Regeneration) con tags de caché dinámicos para catálogos, y CSR (Client-Side Rendering) para datos volátiles (como stock real o dashboards financieros).
2.  **Middleware y Tenancy:** El subdominio define el tenant. Asegúrate de que el middleware en el Edge propague correctamente el header `X-Tenant` en todas las peticiones hacia el backend.
3.  **Autenticación (JWT):** Estamos transicionando hacia JWT. El `AuthContext` debe manejar los tokens de forma segura (idealmente HttpOnly cookies si interactúa con el backend, o manejo seguro en memoria si es SPA pura), asegurando credenciales `omit` o configuraciones estrictas de CORS.
4.  **Aislamiento de Módulos:** Mantén una clara separación entre el tenant público (Landing Page) y los tenants privados (Dashboard de empresas).

## 🧠 Skills y Autoinvocación

Cuando trabajes con Server Components, llamadas a la API, hooks de React Query o problemas de caché, DEBES leer obligatoriamente el archivo `.claude/skills/nextjs-tenant-ui/SKILL.md` antes de proponer o escribir cualquier código.

---

## ✅ Módulos Completados (estado al 2026-03-20)

### 🔧 Infraestructura

| Elemento | Archivo | Estado | Notas |
|---|---|---|---|
| PWA manifest dinámico | `src/app/manifest.json/route.ts` | Completo | `force-dynamic`; genera `name`/`short_name` según subdominio del tenant |
| Íconos PWA | `public/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `favicon.ico` | Completo | Generados desde SVG con sharp |
| Root layout | `src/app/layout.tsx` | Actualizado | `Viewport.themeColor`, `metadata.manifest`, `metadata.icons.apple` |
| Tenant server util | `src/utils/tenant-server.ts` | Estable | `getTenantFromServer()` lee header `host`; úsalo en Server Components y Route Handlers |
| Tenant client util | `src/lib/tenant.ts` | Estable | `getTenant()` lee `window.location.hostname`; úsalo en Client Components |
| Dashboard layout | `src/components/DashboardLayout.tsx` | Actualizado | Menú lateral con roles; íconos importados: `SlidersHorizontal`, `PackagePlus`, `History`, `ShieldCheck`, `Gift` |

### 📦 Inventario

| Ruta | Archivo | Estado | Descripción |
|---|---|---|---|
| `/inventario` | `inventario/page.tsx` | Limpiado | Gestión de stock; sin modal de ajuste; debounce 400ms en búsqueda |
| `/inventario/ajustes` | `inventario/ajustes/page.tsx` | Completo | Wizard 5 pasos (indigo); cantidad = **stock objetivo** → calcula delta |
| `/inventario/ingresos` | `inventario/ingresos/page.tsx` | Completo | Wizard 5 pasos (verde); cantidad = **delta directo**; campo origen; chips de motivo |
| `/inventario/movimientos` | `inventario/movimientos/page.tsx` | Completo | Kardex global paginado; filtros sucursal/tipo/fecha_desde/fecha_hasta |
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
| `/pos` | `pos/page.tsx` | Actualizado | Stepper `[-][qty][+]` en carrito; filtro categorías bottom sheet (mobile/tablet); `SlotSelectionModal` para combos con slots |
| `/ventas` | `ventas/page.tsx` | Existente | Historial de ventas (solo Administrador) |
| `/turnos` | `turnos/page.tsx` | Existente | Historial de cajas |

**Patrones POS — combos con slots:**
- `buscarCombos(q, sucursalId)` → `GET /api/combos/buscar/`
- Si `combo.slots.length === 0` → agrega directo al carrito (retrocompatible)
- Si `combo.slots.length > 0` → abre `SlotSelectionModal`; fetch paralelo de `getComboOpciones` por cada slot
- Payload checkout: `{ type:'combo', combo_id, cantidad, slot_selections:[{slot_id, producto_id}] }`
- Nombre en carrito: `"Combo Zhumir — Coca Cola"` (primer slot seleccionado)

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
