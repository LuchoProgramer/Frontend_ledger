# Plan de Migración a Cloudflare Workers

## 🎯 Objetivo
Migrar `ledgerxpertz-frontend` de Vercel a Cloudflare Workers para reducir costos y evitar límites de invocaciones.

## 📋 Prerequisitos

### 1. Cuenta de Cloudflare
- [ ] Tener cuenta activa en Cloudflare
- [ ] Dominio `ledgerxpertz.com` configurado en Cloudflare DNS

### 2. Herramientas Locales
- [ ] Node.js 20+ instalado ✅ (ya lo tienes)
- [ ] Wrangler CLI instalado ✅ (ya está en el proyecto)
- [ ] Git configurado ✅

---

## 🚀 Fase 1: Configuración Inicial (10 min)

### Paso 1.1: Autenticación con Cloudflare
```bash
npx wrangler login
```
Esto abrirá tu navegador para autorizar Wrangler.

### Paso 1.2: Crear R2 Bucket para Cache
```bash
npx wrangler r2 bucket create cache
```

### Paso 1.3: Verificar Configuración
```bash
npx wrangler whoami
```

---

## 🔧 Fase 2: Ajustes de Configuración (5 min)

### Paso 2.1: Actualizar `wrangler.jsonc`
El archivo ya está generado. Solo verificar que el nombre del worker sea único:

```jsonc
{
  "name": "ledgerxpertz-frontend",  // Cambiar si ya existe
  "compatibility_date": "2026-02-03",
  // ... resto de config
}
```

### Paso 2.2: Variables de Entorno
Crear archivo `.dev.vars` (local) con:
```bash
NEXT_PUBLIC_API_URL=https://api.ledgerxpertz.com/api
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=tu_api_key
NEXT_PUBLIC_DEFAULT_TENANT=public
```

Para producción, configurar vía CLI:
```bash
npx wrangler secret put NEXT_PUBLIC_API_URL
npx wrangler secret put NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
npx wrangler secret put NEXT_PUBLIC_DEFAULT_TENANT
```

---

## 🧪 Fase 3: Deploy de Prueba (5 min)

### Paso 3.1: Build Local
```bash
npx @opennextjs/cloudflare build
```

### Paso 3.2: Deploy a Workers
```bash
npx @opennextjs/cloudflare deploy
```

Esto generará una URL temporal: `ledgerxpertz-frontend.workers.dev`

### Paso 3.3: Verificar Funcionamiento
```bash
curl -I https://ledgerxpertz-frontend.workers.dev/login
```

> **⚠️ Limitación Temporal**: El dominio `.workers.dev` NO soporta subdominios wildcard, por lo que el multi-tenancy NO funcionará aún. Esto se arregla en la Fase 4.

---

## 🌐 Fase 4: Configuración de Custom Domain (15 min)

### Paso 4.1: Agregar Worker Route en Cloudflare Dashboard

1. Ve a **Workers & Pages** > Tu worker
2. Click en **Settings** > **Triggers**
3. Agregar **Custom Domain**: `app.ledgerxpertz.com`

### Paso 4.2: Configurar Wildcard DNS

En Cloudflare DNS, agregar registro:
```
Type: CNAME
Name: *
Target: ledgerxpertz-frontend.workers.dev
Proxy: ✅ Proxied (naranja)
```

Esto permite que `yanett.ledgerxpertz.com`, `empresa2.ledgerxpertz.com`, etc. funcionen.

### Paso 4.3: Verificar Multi-Tenancy
```bash
curl -H "Host: yanett.ledgerxpertz.com" https://app.ledgerxpertz.com/login
```

---

## ✅ Fase 5: Validación Final (10 min)

### Checklist de Pruebas
- [ ] Login funciona en `app.ledgerxpertz.com`
- [ ] Tenant público funciona (sin subdominio)
- [ ] Tenant privado funciona (`yanett.ledgerxpertz.com`)
- [ ] API calls funcionan correctamente
- [ ] Google Maps se carga
- [ ] Imágenes se optimizan

### Monitoreo
```bash
# Ver logs en tiempo real
npx wrangler tail
```

---

## 🔄 Fase 6: Migración Gradual (Opcional)

### Opción A: Cambio Inmediato
Actualizar DNS principal:
```
Type: CNAME
Name: @
Target: ledgerxpertz-frontend.workers.dev
```

### Opción B: Canary Deployment
1. Mantener Vercel en producción
2. Probar Workers con subdominio `beta.ledgerxpertz.com`
3. Migrar usuarios gradualmente

---

## 🆘 Plan de Rollback

Si algo falla:

1. **Revertir DNS** a Vercel:
   ```
   Name: @
   Target: cname.vercel-dns.com
   ```

2. **Pausar Worker** (no eliminar):
   ```bash
   npx wrangler delete ledgerxpertz-frontend
   ```

3. **Tiempo de propagación DNS**: 5-10 minutos

---

## 💰 Costos Estimados

**Mes 1-3 (100K requests/mes):**
- Cloudflare Workers: **$0** (dentro del free tier)
- R2 Storage: **$0** (dentro del free tier)
- **Total: $0/mes**

**Crecimiento a 1M requests/mes:**
- Cloudflare Workers: **$0** (todavía gratis)
- **Total: $0/mes**

**Crecimiento a 15M requests/mes:**
- Workers: $5 base + $1.50 extra = **$6.50/mes**
- R2: **$0** (probablemente dentro del free tier)
- **Total: ~$7/mes**

vs Vercel Pro: **$20/mes base** + overages

---

## 📝 Notas Importantes

1. **No hay prisa**: Vercel seguirá funcionando mientras configuras Workers
2. **Testing local**: Usa `npx wrangler dev` para probar localmente
3. **Logs**: Cloudflare tiene excelente observabilidad en el dashboard
4. **Soporte**: Comunidad muy activa en Discord de Cloudflare

---

## 🎯 Próximos Pasos Recomendados

1. **Ahora**: Hacer login con Wrangler y crear R2 bucket
2. **Hoy**: Deploy de prueba a `.workers.dev`
3. **Esta semana**: Configurar custom domain y wildcard DNS
4. **Próxima semana**: Migración completa si todo funciona bien
