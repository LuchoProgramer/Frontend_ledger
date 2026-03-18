# Experto Frontend ERP - LedgerXpertz Web

**Rol:** Eres un Experto Frontend en Next.js 15+ (App Router), React, y TailwindCSS, especializado en arquitecturas Multi-Tenant desplegadas en Cloudflare Workers (Edge Computing vía OpenNext).

## 🏢 Contexto del Proyecto
Este es el panel de control (Dashboard) y App Shell del ERP LedgerXpertz. Consume la API de Django y maneja datos financieros y fiscales sensibles.

## 🛠️ Reglas de Desarrollo

1.  **Renderizado Híbrido:** Respeta la estrategia actual: usa ISR (Incremental Static Regeneration) con tags de caché dinámicos para catálogos, y CSR (Client-Side Rendering) para datos volátiles (como stock real o dashboards financieros).
2.  **Middleware y Tenancy:** El subdominio define el tenant. Asegúrate de que el middleware en el Edge propague correctamente el header `X-Tenant` en todas las peticiones hacia el backend.
3.  **Autenticación (JWT):** Estamos transicionando hacia JWT. El `AuthContext` debe manejar los tokens de forma segura (idealmente HttpOnly cookies si interactúa con el backend, o manejo seguro en memoria si es SPA pura), asegurando credenciales `omit` o configuraciones estrictas de CORS.
4.  **Aislamiento de Módulos:** Mantén una clara separación entre el tenant público (Landing Page) y los tenants privados (Dashboard de empresas).

## 🧠 Skills y Autoinvocación

Cuando trabajes con Server Components, llamadas a la API, hooks de React Query o problemas de caché, DEBES leer obligatoriamente el archivo `.claude/skills/nextjs-tenant-ui/SKILL.md` antes de proponer o escribir cualquier código.

---

## ✅ Módulos Completados (estado al 2026-03-18)

### 🔧 Infraestructura

| Elemento | Archivo | Estado | Notas |
|---|---|---|---|
| PWA manifest dinámico | `src/app/manifest.json/route.ts` | Completo | `force-dynamic`; genera `name`/`short_name` según subdominio del tenant |
| Íconos PWA | `public/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `favicon.ico` | Completo | Generados desde SVG con sharp |
| Root layout | `src/app/layout.tsx` | Actualizado | `Viewport.themeColor`, `metadata.manifest`, `metadata.icons.apple` |
| Tenant server util | `src/utils/tenant-server.ts` | Estable | `getTenantFromServer()` lee header `host`; úsalo en Server Components y Route Handlers |
| Tenant client util | `src/lib/tenant.ts` | Estable | `getTenant()` lee `window.location.hostname`; úsalo en Client Components |
| Dashboard layout | `src/components/DashboardLayout.tsx` | Actualizado | Menú lateral con roles; íconos importados: `SlidersHorizontal`, `PackagePlus`, `History`, `ShieldCheck` |

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

### 🛒 Ventas / POS

| Ruta | Archivo | Estado | Descripción |
|---|---|---|---|
| `/pos` | `pos/page.tsx` | Estable | Punto de venta tablet-first; probado con cajeros reales el 2026-03-17 |
| `/ventas` | `ventas/page.tsx` | Existente | Historial de ventas (solo Administrador) |
| `/turnos` | `turnos/page.tsx` | Existente | Historial de cajas |

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
- Endpoint de ajuste de stock: `POST /api/inventario/ajuste/` — campos: `producto_id`, `sucursal_id`, `tipo` (`ENTRADA`|`SALIDA`), `cantidad`, `motivo`.
- Kardex: `GET /api/inventario/movimientos/` — soporta `?fecha_desde=YYYY-MM-DD&fecha_hasta=YYYY-MM-DD&sucursal=id&tipo=TIPO`.

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
