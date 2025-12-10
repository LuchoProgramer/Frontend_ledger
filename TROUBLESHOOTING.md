# 🔧 Troubleshooting - Error 404 en API de Empresas

## Problema Actual
```
GET http://localhost:8000/api/empresas/estadisticas/ 404 (Not Found)
```

## Causa
Django no está reconociendo las nuevas rutas API que creamos en `empresas/api/`

## ✅ Solución Paso a Paso

### 1. Verificar que Django está corriendo
```bash
lsof -i :8000
```

Si NO hay output, Django no está corriendo. Necesitas iniciarlo.

### 2. Detener Django actual (si está corriendo)
```bash
pkill -f "manage.py runserver"
```

### 3. Ir al directorio del proyecto Django
```bash
cd /Users/luisviteri/Proyectos/Inventario/LedgerXpertz
```

### 4. Iniciar Django
```bash
python manage.py runserver localhost:8000
```

**IMPORTANTE:** NO uses `&` al final. Déjalo corriendo en la terminal para ver los logs.

### 5. Verificar que el endpoint funciona
En otra terminal:
```bash
curl http://localhost:8000/api/empresas/estadisticas/
```

Deberías ver una respuesta JSON con:
```json
{
  "total_empresas": 3,
  "features": [...]
}
```

### 6. Recargar el navegador
- Abre: `http://localhost:3000`
- Deberías ver la landing page SIN errores en la consola

---

## 🔍 Verificación de Archivos Creados

Confirma que estos archivos existen:

```
✅ LedgerXpertz/empresas/api/__init__.py
✅ LedgerXpertz/empresas/api/serializers.py
✅ LedgerXpertz/empresas/api/views.py
✅ LedgerXpertz/empresas/api/urls.py
```

Verifica con:
```bash
ls -la /Users/luisviteri/Proyectos/Inventario/LedgerXpertz/empresas/api/
```

---

## 🛠️ Si Sigue Sin Funcionar

### Revisar logs de Django
Cuando inicies `python manage.py runserver localhost:8000`, deberías ver:

```
System check identified no issues (0 silenced).
December 07, 2025 - XX:XX:XX
Django version 4.2.8, using settings 'LedgerXpertz.settings'
Starting development server at http://localhost:8000/
Quit the server with CONTROL-C.
```

### Probar manualmente cada endpoint

1. **Estadísticas (GET - no requiere tenant):**
```bash
curl http://localhost:8000/api/empresas/estadisticas/
```

2. **Verificar RUC (POST - no requiere tenant):**
```bash
curl -X POST http://localhost:8000/api/empresas/verificar-ruc/ \
  -H "Content-Type: application/json" \
  -d '{"ruc": "1234567890123"}'
```

3. **Facturas de Yanett (GET - requiere tenant):**
```bash
curl http://localhost:8000/api/facturas/ \
  -H "X-Tenant: yanett_pruebas"
```

---

## 📊 Configuración Actual

### Backend (Django)
- **Puerto:** 8000
- **Host:** localhost
- **URL Base:** `http://localhost:8000`
- **Multi-tenant:** Vía header `X-Tenant`, NO vía subdominio en backend

### Frontend (Next.js)
- **Puerto:** 3000
- **URLs:**
  - `localhost:3000` → Landing Page (público)
  - `yanett.localhost:3000` → Dashboard Yanett
  - `empresa.localhost:3000` → Dashboard Empresa
- **API URL:** `http://localhost:8000` (fija, sin subdominios)

### CORS Permitidos
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://.*\.localhost:3000$",  # *.localhost:3000
]
```

---

## 🎯 Estado Esperado Después de Arreglar

### Consola del Navegador (localhost:3000)
```
✅ GET http://localhost:8000/api/empresas/estadisticas/ 200 OK
✅ No errores de CORS
✅ Landing page carga con estadísticas
```

### Consola del Navegador (yanett.localhost:3000)
```
✅ GET http://localhost:8000/api/facturas/?page=1 200 OK
   Headers: X-Tenant: yanett_pruebas
✅ Dashboard carga con lista de facturas
```

---

## 🚨 Errores Comunes

### Error: `source: no such file or directory: .venv/bin/activate`
**Solución:** No usar `source .venv/bin/activate` en zsh. Usar directamente:
```bash
python manage.py runserver localhost:8000
```

### Error: `CSRF verification failed`
**Causa:** CSRF_TRUSTED_ORIGINS no incluye el origen
**Solución:** Ya está configurado en settings.py

### Error: `CORS origin 'http://yanett.localhost:3000' not allowed`
**Causa:** CORS_ALLOWED_ORIGIN_REGEXES no está funcionando
**Solución:** Ya está configurado en settings.py con regex

---

## ✨ Próximos Pasos Después de Resolver

Una vez que funcione:

1. ✅ Landing page en `localhost:3000` muestra estadísticas
2. ✅ Formulario de registro en `localhost:3000/registro`
3. ✅ Dashboard de yanett en `yanett.localhost:3000`
4. ⏳ Implementar autenticación
5. ⏳ Mejorar dashboard con más módulos

---

**Última actualización:** 7 diciembre 2025
