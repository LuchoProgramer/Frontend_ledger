# Subfase 3.3: Service Worker con Serwist — LedgerXpertz POS

## Contexto

Las Subfases 3.1 (WASM SRI) y 3.2 (Dexie offline catalog + cola de ventas) están completas.
La capa de **datos** offline está cubierta por Dexie. Lo que falta es el **app shell**: sin un
Service Worker, si el usuario abre el POS sin red, el navegador no puede cargar los bundles JS/CSS
y la app no inicia. Esta subfase cierra ese hueco.

**Separación de responsabilidades final:**

| Capa | Qué cachea |
|---|---|
| Service Worker (Serwist) | JS, CSS, HTML, WASM, iconos PWA — activos estáticos |
| Dexie.js | productos, combos, categorías, ventas offline — datos |

La API (`/api/**`) no tiene caché en el SW. Dexie es la única fuente de verdad para datos offline.

---

## Objetivo

Después del primer uso con red, el POS carga y opera completamente offline:
- El navegador sirve todos los bundles JS/CSS desde el SW cache.
- El WASM de cálculo SRI se sirve desde cache en <1ms.
- Los iconos y el manifest PWA están disponibles para instalación offline en Android/iOS.
- Cuando hay una nueva versión desplegada, el usuario ve un toast y actualiza manualmente (nunca se interrumpe una venta).

---

## Archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `package.json` | Modificar | Agregar `serwist` y `@serwist/next` |
| `next.config.ts` | Modificar | Envolver con `withSerwist()` — genera precache manifest en build |
| `src/app/sw.ts` | Crear | Entrada del SW: estrategias de caché, precache manifest, WASM |
| `src/hooks/useServiceWorker.ts` | Crear | Registra `/sw.js`, detecta updates, expone `{ needsRefresh, updateSW }` |
| `src/app/pos/page.tsx` | Modificar | Llama `useServiceWorker()` — único punto de registro en el POS; pasa `needsRefresh`/`updateSW` a `POSProductGrid` |
| `src/app/pos/components/POSProductGrid.tsx` | Modificar | Acepta `needsRefresh`/`updateSW` como props, muestra banner de actualización |
| `src/__tests__/hooks/useServiceWorker.test.ts` | Crear | Tests del hook de registro |
| `ledgerxpertz-frontend/CLAUDE.md` | Modificar | Actualizar sección PWA |

> `layout.tsx` es un Server Component async — no puede llamar hooks.
> `pos/page.tsx` ya es `'use client'` y es el punto de entrada del POS, lugar natural para
> inicializar el SW. El navegador deduplica registros del mismo `/sw.js` — no hay doble registro.

---

## Paquetes

```bash
npm install serwist @serwist/next
```

Versión objetivo: `serwist@9.x` + `@serwist/next@9.x` (misma major).

---

## Estrategias de Caché

### Precache (inyectado en build por `@serwist/next`)

Todos los archivos de `/_next/static/**` quedan precacheados automáticamente con content-hash
en el nombre, por lo que son inmutables. El plugin genera la lista en `__SW_MANIFEST`.

Archivos adicionales declarados explícitamente en `additionalPrecacheEntries`:

```typescript
additionalPrecacheEntries: [
  { url: '/calculos_sri_wasm_bg.wasm', revision: null }, // content-hash en nombre
  { url: '/icon-192.png',              revision: null },
  { url: '/icon-512.png',              revision: null },
  { url: '/apple-touch-icon.png',      revision: null },
  { url: '/favicon.ico',               revision: null },
],
```

> `revision: null` porque estos archivos tienen hash en su URL o no cambian frecuentemente.
> El manifest PWA (`/manifest.json`) es una ruta dinámica (por tenant) — no se precachea;
> usa NetworkFirst para que cada tenant vea su propio nombre e iconos.

### Runtime Cache

```typescript
runtimeCaching: [
  // Chunks de Next.js — inmutables (content hash en URL)
  {
    matcher: /^\/_next\/static\/.*/i,
    handler: 'CacheFirst',
    options: {
      cacheName: 'next-static',
      expiration: { maxEntries: 200, maxAgeSeconds: 365 * 24 * 60 * 60 },
    },
  },
  // Imágenes optimizadas de Next.js
  {
    matcher: /^\/_next\/image\/.*/i,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'next-images',
      expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 },
    },
  },
  // Navegación HTML — NetworkFirst para que las actualizaciones propaguen
  {
    matcher: ({ request }) => request.mode === 'navigate',
    handler: 'NetworkFirst',
    options: {
      cacheName: 'pages',
      networkTimeoutSeconds: 3,
      expiration: { maxEntries: 20, maxAgeSeconds: 24 * 60 * 60 },
    },
  },
  // API — sin caché; Dexie maneja los datos offline
  // (no se declara ninguna regla para /api/**)
]
```

---

## SW Entry Point (`src/app/sw.ts`)

```typescript
import { defaultCache } from '@serwist/next/worker';
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
  skipWaiting: false,        // espera en 'waiting' hasta que el usuario apruebe el update
  clientsClaim: true,        // toma control de pestañas abiertas al activar
  navigationPreload: true,   // fetch de navegación en paralelo con activación del SW
  runtimeCaching: [
    // WASM — CacheFirst, cache dedicado
    {
      matcher: /calculos_sri_wasm_bg\.wasm$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'lx-wasm-v1',
        expiration: { maxEntries: 1 },
      },
    },
    // Chunks estáticos — CacheFirst
    {
      matcher: /^\/_next\/static\/.*/i,
      handler: 'CacheFirst',
      options: { cacheName: 'next-static',
        expiration: { maxEntries: 200, maxAgeSeconds: 365 * 24 * 60 * 60 } },
    },
    // Imágenes optimizadas — StaleWhileRevalidate
    {
      matcher: /^\/_next\/image\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'next-images',
        expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 } },
    },
    // Navegación — NetworkFirst con timeout de 3s
    {
      matcher: ({ request }) => request.mode === 'navigate',
      handler: 'NetworkFirst',
      options: { cacheName: 'pages', networkTimeoutSeconds: 3,
        expiration: { maxEntries: 20, maxAgeSeconds: 24 * 60 * 60 } },
    },
  ],
});

serwist.addEventListeners();
```

---

## Hook `useServiceWorker.ts`

```typescript
// Registra /sw.js en el navegador.
// Detecta cuando hay un nuevo SW esperando (update disponible).
// Expone updateSW() que le dice al nuevo SW que active (SKIP_WAITING) y recarga.
// La recarga solo ocurre cuando el usuario la aprueba explícitamente — nunca automática.

export function useServiceWorker() {
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const swRef = useRef<ServiceWorkerRegistration | null>(null);
  const isUpdating = useRef(false); // guard: solo recargar si el usuario lo inició

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((reg) => {
      swRef.current = reg;
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker?.addEventListener('statechange', () => {
          // SW en 'installed' = esperando en waiting; hay un controller = no es la primera carga
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setNeedsRefresh(true);
          }
        });
      });
    });

    // Solo recarga si el usuario apretó "Actualizar" — no en activaciones automáticas
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (isUpdating.current) window.location.reload();
    });
  }, []);

  const updateSW = () => {
    isUpdating.current = true; // el usuario aprobó el reload
    // SW está en 'waiting' (skipWaiting: false) — waiting nunca es null aquí
    swRef.current?.waiting?.postMessage({ type: 'SKIP_WAITING' });
  };

  return { needsRefresh, updateSW };
}
```

**Por qué `skipWaiting: false` en el SW y `isUpdating` en el hook:**

Con `skipWaiting: true` el SW activaría y `waiting` pasaría a `null` antes de que el usuario
apretara "Actualizar". El `postMessage` en `updateSW()` llegaría al vacío. Con `skipWaiting: false`
el SW permanece en `waiting` hasta que recibe el mensaje `SKIP_WAITING` — garantizando que
`swRef.current.waiting` no sea nulo cuando el usuario lo aprueba. El `isUpdating` ref asegura
que `controllerchange` no recargue la página en ningún otro escenario.

---

## Toast de Actualización en POSProductGrid

Cuando `needsRefresh === true` (pasado como prop desde `pos/page.tsx`):

```tsx
{needsRefresh && (
  <div className="bg-indigo-600 text-white text-sm px-4 py-2 flex items-center justify-between">
    <span>Nueva versión disponible</span>
    <button onClick={updateSW} className="font-bold underline ml-4">Actualizar</button>
  </div>
)}
```

El banner se muestra **encima** del grid de productos, nunca interrumpe el flujo de pago.

---

## `next.config.ts` con Serwist

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

> `disable: process.env.NODE_ENV === 'development'` — el SW está desactivado en dev para no
> interferir con hot reload. Solo activo en `npm run build` y producción.

---

## Plan A / Plan B — Compatibilidad OpenNext

### Plan A (intentar primero)

Después de instalar paquetes y modificar `next.config.ts`:

```bash
npm run build                        # Verifica que sw.js se genera en public/
npx opennextjs-cloudflare build      # Verifica que sw.js llega a .open-next/assets/
```

Si ambos pasan: continuar con deploy.

### Plan B (si Plan A rompe el build de Cloudflare)

- Eliminar `withSerwist()` de `next.config.ts`
- Escribir `public/sw-template.js` manualmente con Workbox vía `importScripts`
- Agregar `workbox-cli` y un script `postbuild` que inyecte el manifest:
  ```bash
  workbox injectManifest workbox-config.js
  ```
- El hook `useServiceWorker.ts` y `ServiceWorkerRegistrar.tsx` no cambian.

El Task 1 del plan de implementación valida Plan A. Si falla, ese mismo task pivota a Plan B.

---

## Tests

### `useServiceWorker.test.ts`

```typescript
// Mock navigator.serviceWorker
// Test 1: register('/sw.js') se llama al montar el hook
// Test 2: needsRefresh pasa a true cuando el SW installing llega a 'installed'
//         y navigator.serviceWorker.controller existe
// Test 3: updateSW() llama waiting.postMessage({ type: 'SKIP_WAITING' })
```

### Verificación de build (no automatizada)

```bash
# Después de npm run build, verificar:
ls -la public/sw.js          # archivo existe
grep '__WB_MANIFEST' public/sw.js  # precache manifest inyectado
```

---

## Criterio de Éxito

1. `npm run build` genera `public/sw.js` con el manifest inyectado.
2. `npx opennextjs-cloudflare build` incluye `sw.js` en `.open-next/assets/`.
3. En Chrome DevTools → Application → Service Workers: SW registrado en `/{tenant}.ledgerxpertz.com`.
4. En Application → Cache Storage: caches `next-static`, `lx-wasm-v1`, `pages` presentes.
5. Con throttling "Offline" activado: el POS carga, muestra productos (Dexie), y el WASM calcula IVA correctamente.
6. Modificar cualquier archivo, hacer nuevo deploy: el POS muestra el toast "Nueva versión disponible".
