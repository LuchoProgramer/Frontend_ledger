# LedgerXpertz Frontend

Sistema de facturación electrónica multi-tenant construido con Next.js 15 y desplegado en Cloudflare Workers.

## 🚀 Stack Tecnológico

- **Framework:** Next.js 15.5.12
- **Runtime:** Cloudflare Workers
- **Adapter:** @opennextjs/cloudflare 1.16.2
- **UI:** React 19.2.0
- **Styling:** Tailwind CSS
- **State Management:** TanStack Query

## 🏗️ Arquitectura

### Multi-Tenancy
El sistema soporta múltiples tenants mediante subdomains:
- `yanett.app.ledgerxpertz.com` → Tenant: yanett
- `tenant2.app.ledgerxpertz.com` → Tenant: tenant2
- `app.ledgerxpertz.com` → Tenant: public

La detección de tenant se realiza en [`src/middleware.ts`](./src/middleware.ts).

### Deployment
- **Producción:** Cloudflare Workers
- **URL Actual:** https://ledgerxpertz-frontend.luchoviteri1990.workers.dev
- **Custom Domain:** (pendiente configuración)

## 📚 Documentación

### Deployment
Ver [`docs/deployment/`](./docs/deployment/) para documentación completa sobre:
- ✅ [Migración a Cloudflare Workers](./docs/deployment/CLOUDFLARE_WORKERS_MIGRATION.md)
- 📋 [Plan de Implementación](./docs/deployment/CLOUDFLARE_WORKERS_PLAN.md)
- 🔧 [Troubleshooting y Comandos](./docs/deployment/README.md)

## 🛠️ Desarrollo Local

### Prerequisitos
- Node.js 20+
- npm o pnpm

### Setup
```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.local.example .env.local

# Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### Variables de Entorno
```env
NEXT_PUBLIC_API_URL=https://api.ledgerxpertz.com/api
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=tu_api_key
NEXT_PUBLIC_DEFAULT_TENANT=public
```

## 🚢 Deploy

### Build Local
```bash
# Build con OpenNext
npx @opennextjs/cloudflare build

# El output estará en .open-next/
```

### Deploy a Cloudflare Workers
```bash
# Deploy a producción
npx @opennextjs/cloudflare deploy

# Ver logs en tiempo real
npx wrangler tail ledgerxpertz-frontend --format pretty
```

## ⚠️ Reglas Importantes

1. **NO usar `export const runtime = 'edge'` en layouts/pages**
   - Solo en `middleware.ts` con `experimental-edge`
   - OpenNext no soporta edge runtime en páginas individuales

2. **Usar Next.js 15.x**
   - Next.js 16 tiene bugs conocidos con OpenNext
   - Ver [CLOUDFLARE_WORKERS_MIGRATION.md](./docs/deployment/CLOUDFLARE_WORKERS_MIGRATION.md) para detalles

3. **Middleware debe llamarse `middleware.ts`**
   - Aunque Next.js 16 usa `proxy.ts`, OpenNext requiere `middleware.ts`

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Ejecutar linter
npm run lint
```

## 📦 Estructura del Proyecto

```
ledgerxpertz-frontend/
├── docs/                    # Documentación del proyecto
│   └── deployment/          # Docs de deployment
├── src/
│   ├── app/                 # Next.js App Router
│   ├── components/          # Componentes React
│   ├── lib/                 # Utilidades y helpers
│   ├── utils/               # Funciones de utilidad
│   └── middleware.ts        # Middleware de tenant detection
├── public/                  # Assets estáticos
├── wrangler.jsonc           # Configuración de Cloudflare Workers
└── next.config.ts           # Configuración de Next.js
```

## 🤝 Contribuir

1. Crear una rama desde `main`
2. Hacer cambios y commit
3. Crear Pull Request
4. Esperar review y merge

## 📄 Licencia

Propietario: LedgerXpertz
