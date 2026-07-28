# Subfase 3.3: Service Worker con Serwist — LedgerXpertz POS

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir un Service Worker con Serwist que cachee el app shell (JS/CSS/WASM/HTML/iconos PWA) para que el POS cargue completamente offline después del primer uso, sin tocar la capa de datos manejada por Dexie.

**Architecture:** `@serwist/next` envuelve `next.config.ts` con un webpack plugin que inyecta el precache manifest en `src/app/sw.ts` y genera `public/sw.js` en build. El hook `useServiceWorker` registra el SW desde `pos/page.tsx` y expone `{ needsRefresh, updateSW }` para un banner de actualización user-triggered en `POSProductGrid`. El SW usa `skipWaiting: false` para que el nuevo SW espere en `waiting` hasta que el usuario apruebe — nunca recarga en medio de una venta.

**Tech Stack:** `serwist@9.x`, `@serwist/next@9.x`, `@testing-library/react` (hooks test), Jest (node + jsdom per-file override)

---

## Mapa de archivos

| Archivo | Acción |
|---|---|
| `package.json` | Agregar `serwist`, `@serwist/next` a dependencies; `@testing-library/react` a devDependencies |
| `next.config.ts` | Envolver config existente con `withSerwist()` |
| `src/app/sw.ts` | CREAR — SW entry point con precache + runtime cache strategies |
| `src/hooks/useServiceWorker.ts` | CREAR — registro, detección de update, `isUpdating` guard |
| `src/app/pos/page.tsx` | Agregar `useServiceWorker()`, pasar props a `POSProductGrid` |
| `src/app/pos/components/POSProductGrid.tsx` | Agregar props `needsRefresh`/`updateSW`, banner de update |
| `src/__tests__/hooks/useServiceWorker.test.ts` | CREAR — 3 tests con jsdom + renderHook |
| `CLAUDE.md` (raíz del frontend) | Actualizar sección PWA |

---

## Task 1: Instalar paquetes, crear SW entry point, configurar next.config.ts — Verificar build (Plan A gate)

**Files:**
- Modify: `package.json`
- Modify: `next.config.ts`
- Create: `src/app/sw.ts`

- [ ] **Step 1: Instalar paquetes**

Desde `/Users/luisviteri/proyectos/Inventario/ledgerxpertz-frontend`:

```bash
npm install serwist @serwist/next
npm install --save-dev @testing-library/react
```

Expected: packages added to `package.json`, no peer dep errors.

- [ ] **Step 2: Crear `src/app/sw.ts`**

Este archivo es el SW. NO tiene `'use client'` — corre en el contexto del Service Worker, no en el navegador.

```typescript
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: /calculos_sri_wasm_bg\.wasm$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'lx-wasm-v1',
        expiration: { maxEntries: 1 },
      },
    },
    {
      matcher: /^\/_next\/static\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static',
        expiration: { maxEntries: 200, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    {
      matcher: /^\/_next\/image\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-images',
        expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
    {
      matcher: ({ request }: { request: Request }) => request.mode === 'navigate',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages',
        networkTimeoutSeconds: 3,
        expiration: { maxEntries: 20, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
  ],
});

serwist.addEventListeners();
```

- [ ] **Step 3: Modificar `next.config.ts` con `withSerwist()`**

Reemplazar el contenido completo de `next.config.ts`:

```typescript
import withSerwist from '@serwist/next';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: { ignoreDuringBuilds: true },
  webpack(config) {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    return config;
  },
};

export default withSerwist({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  additionalPrecacheEntries: [
    { url: '/calculos_sri_wasm_bg.wasm', revision: null },
    { url: '/icon-192.png',              revision: null },
    { url: '/icon-512.png',              revision: null },
    { url: '/apple-touch-icon.png',      revision: null },
    { url: '/favicon.ico',               revision: null },
  ],
  disable: process.env.NODE_ENV === 'development',
})(nextConfig);
```

- [ ] **Step 4: Verificar Plan A — `npm run build`**

```bash
npm run build 2>&1 | tail -20
```

Expected: build exitoso (`✓ Compiled successfully` o similar). Verificar que se generó el SW:

```bash
ls -lh public/sw.js
grep -c '__WB_MANIFEST' public/sw.js
```

Expected: archivo existe (>10KB), grep devuelve `1`.

**Si `npm run build` falla con error relacionado a Serwist o webpack:** ir a Plan B (ver al final de este Task).

- [ ] **Step 5: Verificar Plan A — OpenNext build**

```bash
npx opennextjs-cloudflare build 2>&1 | tail -20
```

Expected: build exitoso. Verificar que `sw.js` llegó a assets:

```bash
ls -lh .open-next/assets/sw.js
```

Expected: archivo existe.

**Si este paso falla:** ir a Plan B.

- [ ] **Step 6: Commit (Plan A exitoso)**

```bash
git add package.json package-lock.json next.config.ts src/app/sw.ts
git commit -m "feat(sw): add Serwist service worker — app shell cache for offline POS"
```

---

### Plan B — Solo ejecutar si los Steps 4 o 5 del Task 1 fallan

Plan B reemplaza el plugin de webpack con `workbox-build` ejecutado como script post-build. El hook `useServiceWorker.ts` y los cambios en `page.tsx`/`POSProductGrid.tsx` no cambian — son independientes del mecanismo de build.

- [ ] **Plan B Step 1: Revertir `next.config.ts` al estado sin Serwist**

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: { ignoreDuringBuilds: true },
  webpack(config) {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    return config;
  },
};

export default nextConfig;
```

- [ ] **Plan B Step 2: Instalar `workbox-build`**

```bash
npm install --save-dev workbox-build
```

- [ ] **Plan B Step 3: Crear `public/sw-template.js`**

Este archivo es el SW fuente — `workbox-build` inyectará `__WB_MANIFEST` en él:

```javascript
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { ExpirationPlugin } from 'workbox-expiration';
import { clientsClaim } from 'workbox-core';

clientsClaim();

// El array de precache se inyecta aquí por workbox-build
precacheAndRoute(self.__WB_MANIFEST || []);

registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style',
  new CacheFirst({ cacheName: 'next-static',
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 365 * 24 * 60 * 60 })] })
);

registerRoute(
  /^\/_next\/image\/.*/i,
  new StaleWhileRevalidate({ cacheName: 'next-images',
    plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 })] })
);

registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({ cacheName: 'pages', networkTimeoutSeconds: 3,
    plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 24 * 60 * 60 })] })
);

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
```

- [ ] **Plan B Step 4: Crear `scripts/build-sw.js`**

```javascript
const { injectManifest } = require('workbox-build');

async function main() {
  const { count, size } = await injectManifest({
    swSrc: 'public/sw-template.js',
    swDest: 'public/sw.js',
    globDirectory: '.next/static',
    globPatterns: ['**/*.{js,css,woff2}'],
    globIgnores: ['**/*.map'],
    injectionPoint: 'self.__WB_MANIFEST',
    additionalManifestEntries: [
      { url: '/calculos_sri_wasm_bg.wasm', revision: null },
      { url: '/icon-192.png',              revision: null },
      { url: '/icon-512.png',              revision: null },
      { url: '/apple-touch-icon.png',      revision: null },
      { url: '/favicon.ico',               revision: null },
    ],
  });
  console.log(`[build-sw] Precached ${count} files (${size} bytes)`);
}

main().catch(console.error);
```

- [ ] **Plan B Step 5: Agregar `postbuild` a `package.json`**

En la sección `"scripts"` de `package.json`, agregar después de `"build"`:

```json
"postbuild": "node scripts/build-sw.js",
```

- [ ] **Plan B Step 6: Verificar build con Plan B**

```bash
npm run build 2>&1 | tail -20
ls -lh public/sw.js
npx opennextjs-cloudflare build 2>&1 | tail -20
ls -lh .open-next/assets/sw.js
```

Expected: ambos builds exitosos, `sw.js` presente en ambas ubicaciones.

- [ ] **Plan B Step 7: Commit (Plan B)**

```bash
git add package.json package-lock.json next.config.ts public/sw-template.js scripts/build-sw.js
git commit -m "feat(sw): add Workbox service worker via injectManifest (Plan B — OpenNext compat)"
```

---

## Task 2: Hook `useServiceWorker` (TDD)

**Files:**
- Create: `src/hooks/useServiceWorker.ts`
- Create: `src/__tests__/hooks/useServiceWorker.test.ts`

- [ ] **Step 1: Crear directorio de tests y escribir tests que fallan**

```bash
mkdir -p src/__tests__/hooks
```

Crear `src/__tests__/hooks/useServiceWorker.test.ts`:

```typescript
/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useServiceWorker } from '../../hooks/useServiceWorker';

const mockRegister = jest.fn();
const mockPostMessage = jest.fn();
const mockAddEventListener = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  // navigator.serviceWorker no existe en jsdom — lo definimos manualmente
  Object.defineProperty(navigator, 'serviceWorker', {
    value: {
      register: mockRegister,
      addEventListener: mockAddEventListener,
      controller: { state: 'activated' },
    },
    configurable: true,
    writable: true,
  });
});

describe('useServiceWorker', () => {
  it('registra /sw.js al montar', async () => {
    mockRegister.mockResolvedValue({ addEventListener: jest.fn() });

    renderHook(() => useServiceWorker());
    await act(async () => {});

    expect(mockRegister).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('updateSW llama postMessage SKIP_WAITING en el SW en waiting', async () => {
    const mockRegistration = {
      addEventListener: jest.fn(),
      waiting: { postMessage: mockPostMessage },
    };
    mockRegister.mockResolvedValue(mockRegistration);

    const { result } = renderHook(() => useServiceWorker());
    await act(async () => {});

    act(() => {
      result.current.updateSW();
    });

    expect(mockPostMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });

  it('needsRefresh arranca en false', async () => {
    mockRegister.mockResolvedValue({ addEventListener: jest.fn() });

    const { result } = renderHook(() => useServiceWorker());
    await act(async () => {});

    expect(result.current.needsRefresh).toBe(false);
  });
});
```

- [ ] **Step 2: Ejecutar tests para verificar que fallan**

```bash
npx jest src/__tests__/hooks/useServiceWorker.test.ts --no-coverage 2>&1 | tail -20
```

Expected: FAIL — `Cannot find module '../../hooks/useServiceWorker'`

- [ ] **Step 3: Crear `src/hooks/useServiceWorker.ts`**

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';

export interface UseServiceWorkerReturn {
  needsRefresh: boolean;
  updateSW: () => void;
}

export function useServiceWorker(): UseServiceWorkerReturn {
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const swRef = useRef<ServiceWorkerRegistration | null>(null);
  const isUpdating = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((reg) => {
      swRef.current = reg;
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setNeedsRefresh(true);
          }
        });
      });
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (isUpdating.current) window.location.reload();
    });
  }, []);

  const updateSW = () => {
    isUpdating.current = true;
    swRef.current?.waiting?.postMessage({ type: 'SKIP_WAITING' });
  };

  return { needsRefresh, updateSW };
}
```

- [ ] **Step 4: Ejecutar tests para verificar que pasan**

```bash
npx jest src/__tests__/hooks/useServiceWorker.test.ts --no-coverage 2>&1 | tail -20
```

Expected: `Tests: 3 passed, 3 total`

- [ ] **Step 5: Ejecutar suite completa para verificar sin regresiones**

```bash
npx jest --no-coverage 2>&1 | tail -10
```

Expected: todos los tests previos siguen pasando.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useServiceWorker.ts src/__tests__/hooks/useServiceWorker.test.ts
git commit -m "feat(sw): add useServiceWorker hook with user-triggered update flow"
```

---

## Task 3: Integrar en `pos/page.tsx` y actualizar `POSProductGrid`

**Files:**
- Modify: `src/app/pos/page.tsx`
- Modify: `src/app/pos/components/POSProductGrid.tsx`

- [ ] **Step 1: Actualizar `POSProductGrid` — agregar props `needsRefresh`/`updateSW` y banner**

En `src/app/pos/components/POSProductGrid.tsx`, actualizar la interfaz `Props` agregando al final de la lista de propiedades existentes:

```typescript
interface Props {
  // ... propiedades existentes sin cambios ...
  isOffline?: boolean;
  needsRefresh?: boolean;
  updateSW?: () => void;
}
```

Y actualizar la destructuración del componente para incluir las nuevas props:

```typescript
export default function POSProductGrid({
  searchTerm, onSearch, searchInputRef,
  productos, loadingProducts,
  categorias, selectedCategoria, showCategoryDrawer, setShowCategoryDrawer, onSelectCategoria,
  combos, onAddToCart, onAddCombo, showToast,
  isOffline = false,
  needsRefresh = false,
  updateSW,
}: Props) {
```

Dentro del JSX del componente, inmediatamente después del bloque `{isOffline && ...}` (que ya existe en la línea ~35), agregar el banner de actualización:

```tsx
{needsRefresh && (
  <div className="bg-indigo-600 text-white text-sm px-4 py-2 flex items-center justify-between shrink-0 mb-2 rounded-lg">
    <span>Nueva versión disponible</span>
    <button
      onClick={updateSW}
      className="font-bold underline ml-4 hover:text-indigo-200 transition-colors"
    >
      Actualizar
    </button>
  </div>
)}
```

- [ ] **Step 2: Actualizar `pos/page.tsx` — llamar `useServiceWorker` y pasar props**

En `src/app/pos/page.tsx`, agregar el import del hook junto a los demás imports:

```typescript
import { useServiceWorker } from '@/hooks/useServiceWorker';
```

Dentro del componente `POSPage`, después de la línea donde se declara `offlineQueue`:

```typescript
const sw = useServiceWorker();
```

En el JSX, encontrar el componente `<POSProductGrid` y agregar las dos props nuevas:

```tsx
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
  isOffline={catalog.isOffline}
  needsRefresh={sw.needsRefresh}
  updateSW={sw.updateSW}
/>
```

- [ ] **Step 3: Verificar TypeScript sin errores**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: sin errores de tipos.

- [ ] **Step 4: Verificar tests**

```bash
npx jest --no-coverage 2>&1 | tail -10
```

Expected: todos los tests pasan.

- [ ] **Step 5: Commit**

```bash
git add src/app/pos/page.tsx src/app/pos/components/POSProductGrid.tsx
git commit -m "feat(sw): wire useServiceWorker into POS — update banner in POSProductGrid"
```

---

## Task 4: Actualizar `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md` (en `ledgerxpertz-frontend/`)

- [ ] **Step 1: Actualizar sección PWA**

Encontrar la sección `## 🌐 PWA` en `ledgerxpertz-frontend/CLAUDE.md` y reemplazarla con:

```markdown
## 🌐 PWA + Service Worker

- Manifest dinámico (`force-dynamic`) en `src/app/manifest.json/route.ts` — adapta `name`/`short_name` por subdominio.
- Service Worker configurado con Serwist (`src/app/sw.ts` → `public/sw.js`). Solo cachea activos estáticos (JS/CSS/WASM/iconos). La API (`/api/**`) no tiene caché en el SW — Dexie maneja los datos offline.
- `withSerwist()` en `next.config.ts` desactivado en development (`disable: process.env.NODE_ENV === 'development'`) para no interferir con hot reload.
- El SW usa `skipWaiting: false` — el nuevo SW espera en `waiting` hasta que el usuario apruebe la actualización desde el banner en `POSProductGrid`. Nunca recarga automáticamente.
- Hook: `src/hooks/useServiceWorker.ts` — llamado desde `src/app/pos/page.tsx`.
- Agregar nuevos tenants en el objeto `names` de `/pos/recibo/page.tsx` si necesitan impresora.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update PWA section — document Serwist SW setup and skipWaiting behavior"
```

---

## Verificación Final (Manual — en navegador)

Estos pasos se ejecutan en Chrome con DevTools abierto después de un deploy en staging o local con `NODE_ENV=production`.

- [ ] **Verificar registro del SW**

1. Abrir `https://{tenant}.ledgerxpertz.com/pos` (o localhost con build de producción)
2. DevTools → Application → Service Workers
3. Expected: `sw.js` aparece con estado "Activated and is running"

- [ ] **Verificar caches**

1. DevTools → Application → Cache Storage
2. Expected: caches `lx-wasm-v1`, `next-static`, `pages`, `next-images` presentes con entradas

- [ ] **Verificar funcionamiento offline**

1. DevTools → Network → Throttling: "Offline"
2. Recargar la página
3. Expected: POS carga, muestra productos (desde Dexie), el WASM calcula IVA correctamente

- [ ] **Verificar banner de actualización**

1. Modificar cualquier texto visible en el POS
2. Hacer `npm run build && npx opennextjs-cloudflare build && npx wrangler deploy`
3. Reabrir el POS en el navegador
4. Expected: banner "Nueva versión disponible — Actualizar" aparece en la parte superior del grid
5. Hacer clic en "Actualizar" → página recarga con la nueva versión
