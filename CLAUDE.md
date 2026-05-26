# Experto Frontend ERP - LedgerXpertz Web

**Rol:** Experto Frontend en Next.js 15+ (App Router), React, TailwindCSS, Cloudflare Workers (OpenNext).

## 🏢 Contexto
Panel de control ERP multi-tenant. Consume la API Django. Maneja datos financieros y fiscales sensibles.

## 🚨 DEPLOY — Flujo Obligatorio (NO saltarse ningún paso)

`npm run build` **solo** compila Next.js. Sin el paso 2, Cloudflare sirve chunks viejos aunque el deploy diga "success".

### Deploy normal (Rust sin cambios — lo habitual)

```bash
npm run build                        # 1. Compila Next.js → .next/  (~30s)
npx opennextjs-cloudflare build      # 2. Empaqueta para Cloudflare → .open-next/
npx wrangler deploy                  # 3. Sube assets + worker a Cloudflare
```

### Deploy cuando cambia la lógica Rust/WASM

Solo necesario si se modifica `calculos-sri-wasm/src/`. Los artefactos WASM ya están commiteados en el repo (`public/calculos_sri_wasm_bg.wasm`, `src/lib/wasm/`); en builds normales no se recompilan.

```bash
npm run build:wasm                   # 0. Compila Rust → WASM (~2min, requiere wasm-pack)
npm run build                        # 1. Compila Next.js → .next/
npx opennextjs-cloudflare build      # 2. Empaqueta para Cloudflare → .open-next/
npx wrangler deploy                  # 3. Sube assets + worker a Cloudflare
```

**Nota:** `npm run build:wasm` requiere Rust toolchain + `wasm-pack` instalados localmente. Después de correrlo, commitear los artefactos actualizados antes de continuar con el build.

### 🚀 Deploy Pendiente — Fase 3 POS Offline (implementado 2026-05-25, no desplegado)

> **REGLA:** No deployar con turno activo en persepolis — interrumpiría operaciones POS en curso.

Subfases incluidas: 3.1 (calculadora fiscal WASM en POS), 3.2 (catálogo Dexie offline + cola FIFO de ventas con sync automático), 3.3 (Serwist Service Worker — app shell cacheado + banner "Nueva versión").

```bash
# Desde /Users/luisviteri/proyectos/Inventario/ledgerxpertz-frontend/
npm run build                        # ~30s — compila Next.js
npx opennextjs-cloudflare build      # empaqueta para Cloudflare
npx wrangler deploy                  # sube a Cloudflare Workers
```

**Checklist post-deploy Chrome DevTools (OBLIGATORIO — los 4 criterios):**
1. **Application → Service Workers:** `sw.js` aparece como `activated and running`
2. **Application → Cache Storage:** existen los caches `lx-wasm-v1`, `next-static`, `pages`, `next-images`
3. **Network → Throttling: Offline** → recargar POS → carga completamente (catálogo Dexie disponible)
4. **Nuevo deploy posterior** → banner "Nueva versión disponible" aparece en POSProductGrid (sin auto-reload)

Si algún criterio falla: revisar `src/app/sw.ts`, `next.config.ts` (`withSerwist()`), `src/hooks/useServiceWorker.ts`, `src/app/pos/page.tsx`.

---

## 📐 Reglas de Arquitectura — Responsabilidad Única (OBLIGATORIO)

| Tipo de archivo | Objetivo | Señal de alarma |
|---|---|---|
| `page.tsx` | ~150 líneas | Solo composición: imports + hooks + JSX mínimo |
| Componente UI (`*.tsx`) | ~250 líneas | Más de 1 modal o más de 3 `useState` → dividir |
| Custom hook (`use*.ts`) | ~150 líneas | Si hace más de una cosa → dividir |
| Utilidad pura (`*.ts`) | ~100 líneas | Funciones puras sin estado ni efectos |

**Una responsabilidad por archivo** — descríbelo en una frase sin usar "y".

**Estructura para page components grandes:**
```
app/[feature]/
  page.tsx                     ← imports + hooks + JSX de alto nivel
  hooks/use[Feature][Concern].ts
  components/[Feature][Part].tsx
```

**Señales de refactor urgente:** >5 `useState`, `useEffect` >15 líneas, más de un modal por archivo, Ctrl+F para navegar dentro de un solo archivo.

---

## 🛠️ Reglas de Desarrollo

1. **Renderizado Híbrido:** ISR para catálogos; CSR para datos volátiles (stock, dashboards financieros).
2. **Middleware y Tenancy:** El middleware inyecta `x-tenant` en los headers del request forwarded (`NextResponse.next({ request: { headers } })`). Los Server Components lo leen con `headers().get('x-tenant')`. NO inyectar en el response.
3. **Autenticación:** JWT en cookies HttpOnly. `checkSession()` verifica `sessionStorage.loggedOut` antes de llamar al backend — evita re-autenticación tras logout.
4. **Aislamiento de Módulos:** Landing pública vs Dashboard privado — contextos separados, nunca mezclados.

## 🧠 Skills
Cuando trabajes con Server Components, React Query o caché, DEBES leer `.claude/skills/nextjs-tenant-ui/SKILL.md` antes de proponer código.

---

## ⚠️ Layout — POSLayout vs DashboardLayout (CRÍTICO)

El POS usa `POSLayout` (`src/components/POSLayout.tsx`), **NO** `DashboardLayout`. Son contratos distintos:

| Layout | Usado en | Estructura |
|---|---|---|
| `DashboardLayout` | Todas las páginas admin/ERP | Header + sidebar `w-64` + `main` con `max-w-7xl py-8` |
| `POSLayout` | `/pos` y rutas kiosk | Header 64px + `flex-1 overflow-hidden` — control total del viewport |

**Regla:** cualquier página que necesite `h-screen` y control total del viewport debe tener su propio Layout. Sniffar pathname en un layout para cambiar su estructura es un antipatrón — el layout no debería saber quién está adentro.

**Sincronización turno:** `usePOSTurno` dispara `window.dispatchEvent(new Event('storage'))` al abrir/cerrar turno — el header del POSLayout se actualiza en la misma pestaña.

---

## 📱 Responsive

**Tablet-first (POS/cajeros):** breakpoint base 768px; touch targets mínimo 44×44px; sin hover-only interactions; grids 2-3 columnas máximo.

**Desktop-first (reportes/admin):** diseño principal 1280px+; tablas con scroll horizontal en tablet.

**Regla:** nunca usar solo `hover:` para acciones críticas — siempre `focus-visible:` también.

---

## 🌐 PWA + Service Worker

- Manifest dinámico (`force-dynamic`) en `src/app/manifest.json/route.ts` — adapta `name`/`short_name` por subdominio.
- Service Worker configurado con Serwist (`src/app/sw.ts` → `public/sw.js`). Solo cachea activos estáticos (JS/CSS/WASM/iconos). La API (`/api/**`) no tiene caché en el SW — Dexie maneja los datos offline.
- `withSerwist()` en `next.config.ts` desactivado en development (`disable: process.env.NODE_ENV === 'development'`) para no interferir con hot reload.
- El SW usa `skipWaiting: false` — el nuevo SW espera en `waiting` hasta que el usuario apruebe la actualización desde el banner en `POSProductGrid`. Nunca recarga automáticamente.
- Hook: `src/hooks/useServiceWorker.ts` — llamado desde `src/app/pos/page.tsx`.
- Agregar nuevos tenants en el objeto `names` de `/pos/recibo/page.tsx` si necesitan impresora.

---

## 🔗 Contrato con el Backend

- **CRÍTICO:** Antes de asumir qué devuelve un endpoint, inspecciona el serializer en `/LedgerXpertz`.
- Combos en reportes: nombre formato `[COMBO] {nombre} #{id}`.
- Ajuste de stock: `POST /api/inventario/ajuste/` — `producto_id`, `sucursal_id`, `tipo`, `cantidad`, `motivo`.
- Kardex: `GET /api/inventario/movimientos/` — soporta `?fecha_desde=&fecha_hasta=&sucursal=&tipo=`.
- Traslado bulk: `POST /api/auth/inventario/transferencia/bulk/` — `origen_id`, `destino_id`, `productos:[{producto_id, cantidad}]`, `generar_guia`, `transportista`.
- POS checkout combo: `{ type:'combo', combo_id, cantidad, slot_selections:[{slot_id, producto_id}] }`.
- Pagos: `total = min(monto_ingresado, pendiente_por_cobrar)` — nunca enviar el billete completo.

---

## 📂 Archivos de referencia — cuándo leerlos (OBLIGATORIO)

Antes de actuar en cualquiera de estos contextos, **DEBES** leer el archivo correspondiente:

| Trigger | Archivo a leer |
|---|---|
| Trabajas en cualquier módulo del frontend (inventario, POS, guías, combos, compras, contabilidad) | `.claude/modules.md` |
| Trabajas con impresión de recibos, comanda de cocina o configuración de impresora | `.claude/thermal-printing.md` |
