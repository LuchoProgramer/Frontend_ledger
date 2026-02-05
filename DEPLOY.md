# Guía de Despliegue - Cloudflare Workers

Este proyecto ha sido migrado de Vercel a **Cloudflare Workers** para mejorar el rendimiento, reducir costos y manejar multi-tenancy de forma nativa.

## 🚀 Despliegue a Producción

A diferencia de Vercel, el despliegue a Cloudflare Workers **requiere un paso manual** explícito. Hacer `git push` guarda tu código, pero **NO** lo sube a producción automáticamente (a menos que configuremos GitHub Actions en el futuro).

### Comando de Despliegue

Para subir la última versión de tu código a `ledgerxpertz.com` y todos los subdominios:

```bash
npx wrangler deploy
```

> **Nota:** Este comando compilará la aplicación Next.js (usando OpenNext) y subirá los assets y el worker a la red global de Cloudflare.

---

## 🛠 Prerrequisitos

Si estás en una máquina nueva, necesitas:

1.  **Node.js 18+** instalado.
2.  **Cuenta de Cloudflare** con acceso al equipo.
3.  Iniciar sesión en Wrangler (solo la primera vez):
    ```bash
    npx wrangler login
    ```

---

## 🏗 Arquitectura

La aplicación ya no corre en servidores Node.js tradicionales, sino en el **Edge** de Cloudflare.

| Componente | Tecnología | Responsabilidad |
| :--- | :--- | :--- |
| **Frontend** | Cloudflare Workers | Renderizado SSR, Routing, Multi-tenancy |
| **Assets** | Cloudflare CDN | Archivos estáticos, imágenes, JS/CSS |
| **Backend** | VPS (Django) | Lógica de negocio, Base de Datos |
| **Base de Datos** | PostgreSQL (VPS) | Persistencia de datos |

### Manejo de Rutas (Routing)

El archivo `wrangler.jsonc` controla qué dominios maneja el Worker.

*   `ledgerxpertz.com` (Main) -> Worker
*   `www.ledgerxpertz.com` -> Worker
*   `*.ledgerxpertz.com` (Tenants) -> Worker
*   **EXCEPCIÓN:** `api.ledgerxpertz.com` -> **Bypass** (Va directo al VPS).

---

## 🔄 Flujo de Trabajo Recomendado

1.  **Desarrollo Local:**
    ```bash
    npm run dev
    ```
    *(Usa `.env.local` conectado a tu backend local o remoto)*

2.  **Guardar Cambios:**
    ```bash
    git add .
    git commit -m "Descripción del cambio"
    git push origin main
    ```

3.  **Desplegar a Producción:**
    ```bash
    npx wrangler deploy
    ```

---

## 🛡️ Notas de Seguridad y Optimización

*   **Variables de Entorno:** Las variables de producción se configuran en el Dashboard de Cloudflare o en `wrangler.jsonc` (no se sube el `.env.local`).
*   **Caché:** Se ha implementado `React Query` y `Debounce` para minimizar la carga al backend.
*   **Logs:** Si algo falla en producción, revisa los logs en tiempo real con:
    ```bash
    npx wrangler tail
    ```
