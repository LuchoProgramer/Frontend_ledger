# Experto Frontend ERP - LedgerXpertz Web

**Rol:** Experto Frontend en Next.js 15+ (App Router), React, TailwindCSS, Cloudflare Workers (OpenNext).

## 🏢 Contexto
Panel de control ERP multi-tenant. Consume la API Django. Maneja datos financieros y fiscales sensibles.

## 🚨 DEPLOY — Flujo Obligatorio (NO saltarse ningún paso)

> **REGLA CRÍTICA MANDATORIA (FRONTEND):** Realizar despliegues de frontend **ÚNICAMENTE** cuando el tenant `persepolis` haya cerrado formalmente su turno de caja. El deploy reemplaza el worker de Cloudflare en caliente → puede cortar una venta en pleno swap o disparar el loop de CPU/precaching del Service Worker (incidente 27-May-2026). **Esto aplica SOLO al frontend;** los deploys de **backend** (`restart web`) SÍ se toleran con turno activo porque el POS encola el 502 del restart (fix idempotente `venta_uuid` — ver `LedgerXpertz/.claude/deploy.md`).
>
> `npm run build` **solo** compila Next.js. Sin el paso 2, Cloudflare sirve chunks viejos aunque el deploy diga "success".

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

### ✅ Mostrar stock en tarjetas del POS (por-tenant) — DESPLEGADO 2026-06-14 (Version ID `4655c8ea`)

`POSProductGrid` muestra "Stock: N" en cada tarjeta solo si `turno.mostrar_stock_pos` (flag backend, activado en la_huequita). Default false → tarjeta igual que hoy (persepolis no muestra). Incluyó fix de `jest.config` (`jsx` classic → `react-jsx`) para poder renderizar componentes en tests (suite 44/44). Desplegado con turno activo en persepolis (override del usuario) — mitigado (2 assets nuevos), post-deploy estable sin 5xx. **Pendiente smoke visual:** las tarjetas de la_huequita muestran "Stock: N"; persepolis no. Plan: `docs/superpowers/plans/2026-06-15-pos-mostrar-stock-por-tenant.md`.

### ✅ Default por-tenant del toggle de factura — DESPLEGADO 2026-06-14 (Version ID `c52c14d4`)

`usePOSPayment.ts` inicializa el toggle Factura/Nota desde `turno.factura_electronica_default` (flag del backend, desplegado + activado en la_huequita). Commits: `fafee3f` (tipo `Turno`), `beaecac` (`useEffect`). **Desplegado con turno activo en persepolis (override explícito del usuario)** — riesgo aceptado; mitigado porque el deploy subió solo 2 assets nuevos (BUILD_ID + 1 chunk del POS, los otros 111 sin cambios → re-precaching mínimo del SW). Post-deploy verificado: homepage/`/pos`/sw.js/chunk → 200, 6 hits estables sin 5xx (sin loop de CPU).

### ✅ FIX toggle factura — `openModal` pisaba el flag para Consumidor Final — DESPLEGADO 2026-06-16 (Version ID `23dd1cbc`)

**Bug reportado en producción (la_huequita, primer día):** las 43 ventas del día salieron como **Nota interna** pese a `factura_electronica_default=true`. Investigación (Network response, bundle de Cloudflare, chunk compilado): el flag llegaba `true` al navegador y el `useEffect` lo aplicaba bien, **pero `openModal` (al abrir el modal de pago) hacía `setEsInterno(client.identificacion === '9999999999')` → forzaba interna para Consumidor Final** (el cliente por defecto, el 99% de ventas de mostrador), pisando el flag. Por eso el toggle aparecía en "Nota" al ir a pagar. **Fix (`usePOSPayment.ts`, commit `78d70a5`):** si el tenant factura por defecto, `openModal` arranca en Factura SIEMPRE (incluso CF); sin el flag se preserva el comportamiento previo (CF→nota, identificado→factura). TDD: test RED reproduce el síntoma exacto (openModal+CF+flag→factura); 6/6 toggle + 28/28 POS. **Deploy:** gate de persepolis verificado pero override del usuario ("hazlo ahora con cuidado") — mitigado: solo 2 assets nuevos (BUILD_ID + chunk POS `page-312dd34bc99ab96a.js`, 111 sin cambios). Smoke: la_huequita `/`,`/pos`,`/sw.js`,chunk → 200; persepolis `/pos` → 200 (no roto); el chunk desplegado contiene el fix (`factura_electronica_default` ×2). **Workaround usado mientras tanto:** el cajero activaba el toggle a mano (1 click). **Pendiente:** las 43 notas internas ya emitidas → promocionar a SRI en un plan aparte (ambiente 2, cuidar fecha/error 65; `promocionar_a_sri` no descuadra stock).

### 🚀 Deploy Pendiente — Toggle "ojo" en login (implementado 2026-06-03, no desplegado)

Se agregó un botón mostrar/ocultar contraseña (ícono de ojo) en `src/app/login/page.tsx`. No se deployó: había turno activo en persepolis al momento del cambio. Deploy normal (Rust/WASM sin cambios):

```bash
# Desde /Users/luisviteri/proyectos/Inventario/ledgerxpertz-frontend/
npm run build                        # ~30s
npx opennextjs-cloudflare build      # empaqueta para Cloudflare
npx wrangler deploy                  # sube a Cloudflare Workers
```

**Verificar antes:** sin turno activo en persepolis (el deploy reemplaza el worker y puede interrumpir una venta en el POS).

### 🚀 Deploy Pendiente — Fase 3 POS Offline (implementado 2026-05-25, no desplegado)

> **REGLA (frontend):** No deployar con turno activo en persepolis — el swap del worker de Cloudflare interrumpiría operaciones POS en curso. (Deploys de **backend** sí se toleran con turno — ver regla reconciliada arriba.)

Subfases incluidas: 3.1 (calculadora fiscal WASM en POS), 3.2 (catálogo Dexie offline + cola FIFO de ventas con sync automático), 3.3 (Serwist Service Worker — app shell cacheado + banner "Nueva versión").

```bash
# Desde /Users/luisviteri/proyectos/Inventario/ledgerxpertz-frontend/
npm run build                        # ~30s — compila Next.js
npx opennextjs-cloudflare build      # empaqueta para Cloudflare
npx wrangler deploy                  # sube a Cloudflare Workers
```

> [!WARNING]
> **Lección Aprendida — Incidente de Loop de Precaching (27-Mayo-2026):**
> Se registraron ~75k requests y 4,880 errores `Exceeded CPU Time Limit` en Cloudflare por el bucle de instalación del Service Worker en el navegador del cliente. El precaching de Serwist intentó descargar chunks JS pesados en segundo plano que pasaron por SSR y superaron los 10ms de CPU (plan Free), lo que abortó la instalación y provocó que el navegador reintentara la descarga de forma indefinida y oculta.
>
> **Prevención Obligatoria:**
> 1. **Avisar al cliente:** Antes de un deploy grande, notificar a Persepolis que al cerrar caja recargue el navegador una vez para una instalación limpia del SW en frío.
> 2. **Optimizar precaching:** Mantener el manifiesto de precacheo de Serwist configurado únicamente para los recursos indispensables del POS (WASM, CSS, assets clave) y no meter chunks JS de páginas no offline del dashboard.

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
  - *Alerta CPU Limit (10ms):* No incluir en el precaching de Serwist todos los chunks JS de Next.js, ya que al descargarse en paralelo se excede el límite de CPU del plan Free en Cloudflare Workers, lo que aborta la conexión e inicia un loop infinito de reintentos de instalación en segundo plano.
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
