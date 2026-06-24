# Deploy — LedgerXpertz Frontend (Cloudflare Workers)

> Documentación canónica del flujo de deploy. La guía rápida también está en `CLAUDE.md`.

## Flujo normal (sin cambios Rust — lo habitual)

```bash
cd /Users/luisviteri/proyectos/Inventario/ledgerxpertz-frontend

npm run build                        # ~30s — compila Next.js → .next/
npx opennextjs-cloudflare build      # empaqueta para Cloudflare → .open-next/
npx wrangler deploy                  # sube assets + worker
```

**Gotcha crítico:** `npm run build` solo compila Next.js. Sin el paso 2 (`opennextjs-cloudflare build`), Cloudflare sigue sirviendo los chunks anteriores aunque el deploy reporte "success".

## Flujo con cambios Rust/WASM

Solo si se modifica `calculos-sri-wasm/src/`. Los artefactos ya están commiteados — en builds normales NO se recompila Rust.

```bash
npm run build:wasm                   # ~2min, requiere wasm-pack instalado
# commitear artefactos actualizados antes de continuar:
git add public/calculos_sri_wasm_bg.wasm src/lib/wasm/
git commit -m "chore: update WASM artifacts"

npm run build
npx opennextjs-cloudflare build
npx wrangler deploy
```

---

## ✅ Fase 3 POS Offline — DESPLEGADA (Cloudflare, 2026-05-26, version `7585b9a8`)

**Estado:** en producción. Patrones offline documentados en `modules.md`; trabajo posterior (T2.2 caché categorías, perf carrito/búsqueda) construye sobre esta base. El checklist DevTools de abajo se conserva como referencia para validar futuros cambios al Service Worker.

### Qué incluyó este deploy

| Subfase | Cambios | Commits clave |
|---|---|---|
| 3.1 — WASM SRI | Calculadora fiscal Rust→WASM embebida en POS | `calculos-sri-wasm/` |
| 3.2 — Dexie offline | Catálogo precargado offline, cola de ventas FIFO con sync automático, badges pendientes/error en POSLayout, cierre de turno bloqueado si hay ventas pendientes | `feat(offline): *` |
| 3.3 — Serwist SW | App shell cacheado, banner "Nueva versión disponible" user-triggered, sin auto-reload | `feat(sw): *` |

### Flujo de deploy (Rust sin cambios — los artefactos WASM ya están commiteados)

```bash
cd /Users/luisviteri/proyectos/Inventario/ledgerxpertz-frontend

npm run build
npx opennextjs-cloudflare build
npx wrangler deploy
```

**Verificar antes de deployar:**
- `git status` limpio — no hay cambios sin commitear
- Tenant persepolis sin turno activo (evitar interrumpir sesiones POS en curso)

### Checklist post-deploy en Chrome DevTools (OBLIGATORIO)

Abrir el POS (`{tenant}.ledgerxpertz.com/pos`) en Chrome y verificar:

1. **Application → Service Workers:** `sw.js` aparece como `activated and running`
2. **Application → Cache Storage:** existen los caches `lx-wasm-v1`, `next-static`, `pages`, `next-images`
3. **Network → Throttling: Offline** → recargar POS → carga completamente (catálogo Dexie disponible)
4. **Nuevo deploy posterior** → banner "Nueva versión disponible" aparece en POSProductGrid (no recarga automático)

Si algún criterio falla, revisar:
- `src/app/sw.ts` — configuración Serwist
- `next.config.ts` — `withSerwist()` (desactivado en development)
- `src/hooks/useServiceWorker.ts` — registro del SW
- `src/app/pos/page.tsx` — invocación del hook

---

## Servicios y tenants

- **Cloudflare Worker:** `ledgerxpertz-frontend` (ver `wrangler.toml`)
- **Manifest dinámico:** `src/app/manifest.json/route.ts` adapta `name`/`short_name` por subdominio
- **Impresora térmica:** agregar nuevos tenants en `src/app/pos/recibo/page.tsx` (objeto `names`)
