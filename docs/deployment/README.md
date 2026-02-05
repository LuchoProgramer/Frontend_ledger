# Documentación de Deployment

Esta carpeta contiene documentación importante sobre el deployment y configuración del proyecto.

## Archivos

### [CLOUDFLARE_WORKERS_MIGRATION.md](./CLOUDFLARE_WORKERS_MIGRATION.md)
**Walkthrough completo de la migración exitosa a Cloudflare Workers**

Documenta:
- ✅ Configuración final funcionando
- 🔧 Todos los problemas encontrados y sus soluciones
- 📊 Métricas de build y deploy
- 💰 Análisis de ahorro de costos
- 📝 Lecciones aprendidas

**Úsalo cuando:**
- Necesites recordar por qué se hizo el downgrade a Next.js 15
- Tengas problemas con OpenNext + Cloudflare
- Necesites replicar la configuración en otro proyecto
- Quieras entender las limitaciones de edge runtime con OpenNext

### [CLOUDFLARE_WORKERS_PLAN.md](./CLOUDFLARE_WORKERS_PLAN.md)
**Plan de implementación original para la migración**

Documenta:
- 📋 Checklist de pasos de migración
- ⚙️ Configuración de Wrangler
- 🌐 Setup de DNS para multi-tenancy
- 🔐 Variables de entorno y secrets
- 💵 Comparación de costos Vercel vs Cloudflare

**Úsalo cuando:**
- Necesites configurar un nuevo proyecto en Cloudflare Workers
- Quieras entender la arquitectura de multi-tenancy
- Necesites configurar DNS wildcard
- Quieras comparar costos de hosting

---

## Configuración Actual

### Stack
- **Next.js:** 15.5.12
- **React:** 19.2.0
- **Adapter:** @opennextjs/cloudflare 1.16.2
- **Runtime:** Cloudflare Workers

### URLs
- **Production:** https://ledgerxpertz-frontend.luchoviteri1990.workers.dev
- **Custom Domain:** (pendiente configuración)

### Reglas Importantes

1. **NO usar `export const runtime = 'edge'` en layouts/pages**
   - Solo en `middleware.ts` con `experimental-edge`
   - OpenNext no soporta edge runtime en páginas individuales

2. **Middleware debe llamarse `middleware.ts`**
   - Aunque Next.js 16 usa `proxy.ts`, OpenNext requiere `middleware.ts`

3. **Next.js 15.x es la versión estable con OpenNext**
   - Next.js 16 tiene bugs conocidos (GitHub issue #667)

4. **Build limpio cuando hay problemas**
   ```bash
   rm -rf .next .open-next
   npx @opennextjs/cloudflare build
   ```

---

## Comandos Útiles

### Build y Deploy
```bash
# Build local
npx @opennextjs/cloudflare build

# Deploy a Workers
npx @opennextjs/cloudflare deploy

# Ver logs en tiempo real
npx wrangler tail ledgerxpertz-frontend --format pretty
```

### Gestión de Secrets
```bash
# Agregar secret
npx wrangler secret put SECRET_NAME

# Listar secrets
npx wrangler secret list

# Eliminar secret
npx wrangler secret delete SECRET_NAME
```

### R2 Buckets
```bash
# Listar buckets
npx wrangler r2 bucket list

# Ver objetos en bucket
npx wrangler r2 object list cache
```

---

## Troubleshooting

### Error: "cannot use the edge runtime"
**Solución:** Remover `export const runtime = 'edge'` de layouts/pages

### Error: "Cannot read properties of undefined (reading 'default')"
**Solución:** Downgrade a Next.js 15.x

### Build falla con ENOENT
**Solución:** 
```bash
rm -rf .next .open-next node_modules
npm install
npx @opennextjs/cloudflare build
```

### 500 Error en runtime
**Solución:** Revisar logs con `npx wrangler tail` para ver el error específico

---

## Referencias

- [OpenNext Cloudflare Docs](https://opennext.js.org/cloudflare)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [Next.js 15 Docs](https://nextjs.org/docs)
