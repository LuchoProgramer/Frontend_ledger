# LedgerXpertz Frontend

Dashboard de administración y punto de venta para el ERP LedgerXpertz.
Construido con Next.js 15 App Router. Deploy en Cloudflare Workers via OpenNext.

## Stack

- **Framework:** Next.js 15 (App Router)
- **Runtime:** Cloudflare Workers via `@opennextjs/cloudflare`
- **UI:** React 19 + Tailwind CSS
- **State:** TanStack Query

## Setup local

### Prerequisitos
- Node.js 20+
- npm

### Variables de entorno
Crear `.env.local`:
```env
NEXT_PUBLIC_API_URL=https://api.ledgerxpertz.com/api
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=tu_api_key
NEXT_PUBLIC_DEFAULT_TENANT=public
```

### Correr en desarrollo
```bash
npm install
npm run dev
```

## Multi-tenancy

El subdominio define el tenant. `src/middleware.ts` propaga el header `X-Tenant`
en todas las peticiones al backend.

```
{tenant}.app.ledgerxpertz.com  →  tenant = {tenant}
app.ledgerxpertz.com           →  tenant = public
```

## Módulos principales

| Ruta | Estado | Descripción |
|------|--------|-------------|
| `/pos` | Completo | Punto de venta; stepper carrito; combos con slots; filtro categorías |
| `/inventario` | Completo | Gestión de stock; debounce 400ms |
| `/inventario/ajustes` | Completo | Wizard 5 pasos; cantidad = stock objetivo |
| `/inventario/ingresos` | Completo | Wizard 5 pasos; cantidad = delta directo |
| `/inventario/ajustes/lote` | Completo | Dos paneles ENTRADA/SALIDA; motivo global; solo Admin |
| `/inventario/movimientos` | Completo | Kardex paginado; filtros sucursal/tipo/fecha |
| `/combos` | Completo | Lista paginada; search+sucursal+activo |
| `/combos/nuevo` | Completo | Formulario slots+categorías |
| `/combos/[id]/editar` | Completo | Pre-pobla desde `ComboSlotReadSerializer` |
| `/guias/nueva` | Completo | Modo VENTA (desde factura) y TRASLADO (wizard 4 pasos) |
| `/reportes` | Pendiente | Cierre de caja, ventas del día — UX a mejorar |

## Roles y permisos

| Rol | Descripción |
|-----|-------------|
| `Administrador` | Acceso completo al tenant |
| `Administrador de la franquicia` | Multi-sucursal |
| Operador / Cajero | Acceso restringido (POS, sin reportes ni ajuste masivo) |

Guard pattern usado en el código:
```ts
user.is_staff || user.is_superuser || user.groups?.includes('Administrador')
```

## Conexión con el backend

- **Auth:** JWT en cookie HttpOnly via `POST /api/auth/login/`
- **API REST:** `/api/auth/*` para operaciones autenticadas
- **GraphQL:** `POST /api/graphql/` — disponible desde 2025-04, pendiente de consumir desde el frontend
- **Tenant:** resuelto por subdominio; middleware propaga header `X-Tenant`
- **Regla crítica:** antes de asumir qué devuelve cualquier endpoint, inspeccionar el serializer en `/LedgerXpertz`

## Deploy

**Siempre 3 pasos en orden** (ver `CLAUDE.md` para detalles y gotchas):

```bash
npm run build                        # 1. Compila Next.js → .next/
npx opennextjs-cloudflare build      # 2. Empaqueta para Cloudflare → .open-next/
npx wrangler deploy                  # 3. Sube assets + worker a Cloudflare
```

Síntoma de omitir el paso 2: Wrangler reporta "No updated asset files to upload"
aunque el deploy diga "success" — el browser carga chunks viejos.

## Responsive

- **Tablet-first** para POS (cajeros operan con dedos — touch targets mínimo 44×44px)
- **Desktop-first** para reportes y administración (diseño principal en 1280px+)
- Nunca usar solo `hover:` para revelar acciones críticas

## Estructura

```
src/
├── app/              # Next.js App Router (rutas del dashboard)
├── components/       # Componentes compartidos (DashboardLayout, modals…)
├── lib/              # api.ts, tenant.ts — cliente HTTP y resolución de tenant
├── utils/            # tenant-server.ts — lectura de tenant en Server Components
└── middleware.ts     # Propagación de X-Tenant hacia el backend
```
