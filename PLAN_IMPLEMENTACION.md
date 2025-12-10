# 📋 Plan de Implementación - LedgerXpertz Frontend

## 🎯 Objetivo

Crear un sistema frontend moderno y escalable para LedgerXpertz que consuma el API REST de Django, con soporte multi-tenant desde el inicio.

---

## ✅ Progreso Actual

### 🟢 Completado (Fase 1)

#### 1. Configuración Inicial del Proyecto
- ✅ Next.js 16.0.7 instalado con TypeScript
- ✅ Tailwind CSS configurado
- ✅ React Query para manejo de estado servidor
- ✅ Estructura de carpetas establecida

#### 2. Sistema Multi-Tenant
- ✅ Detección automática de tenant por subdominio
- ✅ Cliente API con soporte multi-tenant
- ✅ Configuración de variables de entorno (.env.local)
- ✅ Utilidades de tenant (`src/lib/tenant.ts`)

#### 3. Módulo de Facturas - Vista Principal
- ✅ Listado de facturas con tabla responsive
- ✅ Filtros por estado SRI
- ✅ Búsqueda en tiempo real
- ✅ Navegación a detalle
- ✅ Badges de estado con colores

#### 4. Módulo de Facturas - Vista Detalle
- ✅ Información completa de factura
- ✅ Datos del cliente
- ✅ Tabla de productos con cálculos
- ✅ Información SRI (clave de acceso, autorización)
- ✅ Botones de acción (Enviar SRI, Consultar, Descargar XML)

#### 5. Integración con Backend
- ✅ Cliente API configurado (`src/lib/api.ts`)
- ✅ Endpoints de facturas implementados
- ✅ Manejo de errores
- ✅ Autenticación con cookies (credentials: 'include')
- ✅ CORS configurado correctamente

---

## 🔄 En Progreso

### 🟡 Fase 2 - Funcionalidades Core

- [ ] Dashboard principal con métricas
- [ ] Formulario de creación de facturas
- [ ] Módulo de clientes
- [ ] Módulo de productos
- [ ] Sistema de autenticación/login

---

## 📅 Fases Futuras

### Fase 3 - Mejoras UX/UI
- [ ] Tema claro/oscuro
- [ ] Notificaciones toast
- [ ] Confirmaciones de acciones
- [ ] Estados de carga mejorados
- [ ] Animaciones y transiciones

### Fase 4 - Módulos Avanzados
- [ ] Inventario
- [ ] Reportes y estadísticas
- [ ] Notas de crédito/débito
- [ ] Retenciones
- [ ] Configuración de empresa

### Fase 5 - Optimización
- [ ] Server-Side Rendering (SSR)
- [ ] Caché de datos
- [ ] Optimización de imágenes
- [ ] PWA (Progressive Web App)
- [ ] Testing automatizado

---

## 🏗️ Arquitectura del Sistema

### Multi-Tenant con Múltiples Frontends

```
┌─────────────────────────────────────────────────────────┐
│               Backend Django (Port 8000)                │
│            API REST + Multi-Tenant DB                   │
└────────────────────┬────────────────────────────────────┘
                     │
          ┌──────────┼──────────┐
          │          │          │
          ▼          ▼          ▼
    ┌─────────┐ ┌─────────┐ ┌─────────┐
    │ Admin   │ │ Ecommerce│ │ Mobile  │
    │ Next.js │ │ Next.js  │ │ App     │
    │ :3000   │ │ :3001    │ │         │
    └─────────┘ └─────────┘ └─────────┘
```

### Detección de Tenant

El sistema detecta automáticamente el tenant según el subdominio:

- `yanett.localhost:3000` → Tenant: `yanett`
- `empresa2.localhost:3000` → Tenant: `empresa2`
- `localhost:3000` → Tenant por defecto (configurado en `.env.local`)

---

## 📚 Cómo Consumir el API

### 1. Configuración Básica

**Archivo: `.env.local`**
```env
# URL del API con placeholder {tenant}
NEXT_PUBLIC_API_URL=http://{tenant}.localhost:8000

# Tenant por defecto
NEXT_PUBLIC_DEFAULT_TENANT=yanett
```

### 2. Usar el Cliente API

**Importar el cliente:**
```typescript
import { getApiClient } from '@/lib/api';
```

**Obtener datos con React Query:**
```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { getApiClient } from '@/lib/api';

export default function MiComponente() {
  const api = getApiClient(); // Detecta tenant automáticamente

  const { data, isLoading, error } = useQuery({
    queryKey: ['facturas'],
    queryFn: () => api.getFacturas(),
  });

  if (isLoading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data.results.map((factura) => (
        <div key={factura.id}>{factura.numero_factura}</div>
      ))}
    </div>
  );
}
```

### 3. Crear Nuevos Endpoints

**En `src/lib/api.ts`:**
```typescript
export class ApiClient {
  // ... código existente ...

  // Agregar nuevo endpoint
  async getMisProductos() {
    return this.request<any>('/api/productos/');
  }

  async crearProducto(data: any) {
    return this.request<any>('/api/productos/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}
```

### 4. Ejemplos de Uso Común

#### Listar con filtros
```typescript
const { data } = useQuery({
  queryKey: ['facturas', { estado: 'AUTORIZADO' }],
  queryFn: () => api.getFacturas({ estado_sri: 'AUTORIZADO' }),
});
```

#### Crear registro (Mutation)
```typescript
const mutation = useMutation({
  mutationFn: (nuevaFactura) => api.crearFactura(nuevaFactura),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['facturas'] });
  },
});
```

#### Actualizar registro
```typescript
const mutation = useMutation({
  mutationFn: ({ id, data }) => api.actualizarFactura(id, data),
});
```

---

## 🚀 Cómo Crear un Nuevo Proyecto Frontend

### Opción 1: Admin Panel (Copiar este proyecto)

1. **Clonar estructura:**
   ```bash
   cp -r ledgerxpertz-frontend mi-nuevo-admin
   cd mi-nuevo-admin
   ```

2. **Actualizar `.env.local`:**
   ```env
   NEXT_PUBLIC_API_URL=http://{tenant}.localhost:8000
   NEXT_PUBLIC_DEFAULT_TENANT=tu_tenant
   ```

3. **Instalar dependencias:**
   ```bash
   npm install
   ```

4. **Iniciar desarrollo:**
   ```bash
   npm run dev
   ```

### Opción 2: Ecommerce (Nuevo proyecto desde cero)

1. **Crear proyecto Next.js:**
   ```bash
   npx create-next-app@latest ledgerxpertz-shop
   cd ledgerxpertz-shop
   ```

2. **Copiar archivos de integración:**
   ```bash
   # Copiar utilidades multi-tenant
   mkdir -p src/lib
   cp ../ledgerxpertz-frontend/src/lib/tenant.ts src/lib/
   cp ../ledgerxpertz-frontend/src/lib/api.ts src/lib/
   cp ../ledgerxpertz-frontend/.env.local .
   ```

3. **Instalar dependencias necesarias:**
   ```bash
   npm install @tanstack/react-query
   ```

4. **Configurar puerto diferente (package.json):**
   ```json
   {
     "scripts": {
       "dev": "next dev -p 3001"
     }
   }
   ```

5. **Crear endpoints específicos para ecommerce:**
   ```typescript
   // src/lib/api.ts
   export class ApiClient {
     // ... código base ...

     // Catálogo público
     async getProductosPublicos() {
       return this.request('/api/productos/publicos/');
     }

     // Carrito
     async agregarAlCarrito(productoId: number, cantidad: number) {
       return this.request('/api/carrito/', {
         method: 'POST',
         body: JSON.stringify({ producto_id: productoId, cantidad }),
       });
     }

     // Checkout
     async crearOrden(datos: any) {
       return this.request('/api/ordenes/', {
         method: 'POST',
         body: JSON.stringify(datos),
       });
     }
   }
   ```

6. **Copiar provider de React Query:**
   ```bash
   cp ../ledgerxpertz-frontend/src/app/providers.tsx src/app/
   ```

### Opción 3: Mobile App (React Native / Expo)

1. **Crear proyecto:**
   ```bash
   npx create-expo-app ledgerxpertz-mobile
   cd ledgerxpertz-mobile
   ```

2. **Crear cliente API (`lib/api.ts`):**
   ```typescript
   const API_URL = 'http://yanett.localhost:8000'; // Sin detección de subdominio

   export class ApiClient {
     private baseURL: string;
     private tenant: string;

     constructor(tenant: string) {
       this.tenant = tenant;
       this.baseURL = API_URL;
     }

     private async request(endpoint: string, options = {}) {
       const url = `${this.baseURL}${endpoint}`;
       const response = await fetch(url, {
         ...options,
         headers: {
           'Content-Type': 'application/json',
           'X-Tenant': this.tenant,
           ...options.headers,
         },
       });
       return response.json();
     }

     async getFacturas() {
       return this.request('/api/facturas/');
     }
   }

   export const api = new ApiClient('yanett');
   ```

3. **Instalar dependencias:**
   ```bash
   npm install @tanstack/react-query
   ```

---

## 🔐 Autenticación Multi-Tenant

### Flujo Actual
- Django maneja sesiones con cookies
- `credentials: 'include'` en fetch para enviar cookies
- Header `X-Tenant` identifica el tenant

### Próximos Pasos
- [ ] Página de login por tenant
- [ ] Manejo de sesiones expiradas
- [ ] Refresh token
- [ ] Roles y permisos
- [ ] Protección de rutas

---

## 🎨 Stack Tecnológico

### Frontend
- **Framework:** Next.js 16.0.7 (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS
- **Estado:** React Query (TanStack Query)
- **Formularios:** React Hook Form (pendiente)
- **Validación:** Zod (pendiente)

### Backend (Consumido)
- **Framework:** Django 4.2.8
- **API:** Django REST Framework
- **Base de datos:** PostgreSQL (Multi-tenant con django-tenants)
- **Autenticación:** Session-based

---

## 📝 Convenciones de Código

### Estructura de Carpetas
```
src/
├── app/                    # Rutas de Next.js (App Router)
│   ├── facturas/
│   │   ├── [id]/          # Ruta dinámica
│   │   │   └── page.tsx
│   │   └── page.tsx       # Lista de facturas
│   ├── layout.tsx
│   ├── page.tsx           # Home
│   ├── globals.css
│   └── providers.tsx      # Providers de React Query
├── lib/                   # Utilidades y lógica
│   ├── api.ts            # Cliente API
│   └── tenant.ts         # Detección de tenant
└── types/                # Tipos TypeScript (pendiente)
    └── factura.ts
```

### Nomenclatura
- **Componentes:** PascalCase (`DetalleFactura.tsx`)
- **Funciones:** camelCase (`getApiClient()`)
- **Archivos utilitarios:** camelCase (`api.ts`, `tenant.ts`)
- **Constantes:** UPPER_SNAKE_CASE (`API_URL`)
- **Rutas dinámicas:** `[param]` (ej: `[id]`)

### Tipos TypeScript
```typescript
// Siempre definir interfaces para respuestas del API
interface Factura {
  id: number;
  numero_factura: string;
  fecha_emision: string;
  cliente: Cliente;
  items: ItemFactura[];
  estado_sri: 'PENDIENTE' | 'AUTORIZADO' | 'RECHAZADO';
}
```

---

## 🧪 Testing (Pendiente)

### Plan de Testing
- [ ] Unit tests con Jest
- [ ] Component tests con React Testing Library
- [ ] E2E tests con Playwright
- [ ] API mocking con MSW (Mock Service Worker)

### Configuración Recomendada
```bash
# Instalar dependencias de testing
npm install -D jest @testing-library/react @testing-library/jest-dom
npm install -D @playwright/test
npm install -D msw
```

---

## 📈 Métricas de Éxito

### Fase 1 (Actual)
- ✅ Tiempo de carga inicial < 2s
- ✅ Navegación fluida entre páginas
- ✅ Sin errores de consola
- ✅ Responsive en mobile/tablet/desktop

### Próximas Fases
- [ ] Lighthouse score > 90
- [ ] Core Web Vitals en verde
- [ ] 100% cobertura de tests críticos
- [ ] < 500ms tiempo de respuesta API

---

## 🤝 Contribución

### Para agregar nuevas funcionalidades:

1. **Crear rama:**
   ```bash
   git checkout -b feature/nombre-funcionalidad
   ```

2. **Desarrollar siguiendo las convenciones**

3. **Probar localmente con múltiples tenants:**
   - `yanett.localhost:3000`
   - `test.localhost:3000`

4. **Commit y Push:**
   ```bash
   git add .
   git commit -m "feat: descripción de la funcionalidad"
   git push origin feature/nombre-funcionalidad
   ```

5. **Crear Pull Request**

---

## 🔧 Comandos Útiles

### Desarrollo
```bash
# Iniciar servidor de desarrollo
npm run dev

# Iniciar en puerto específico
npm run dev -- -p 3001

# Build para producción
npm run build

# Iniciar servidor de producción
npm start
```

### Troubleshooting
```bash
# Limpiar caché de Next.js
rm -rf .next

# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install

# Verificar si puerto está en uso
lsof -ti:3000

# Matar proceso en puerto
lsof -ti:3000 | xargs kill -9
```

---

## 📞 Soporte y Documentación

### Para dudas sobre:
- **Multi-tenant:** Revisar `src/lib/tenant.ts`
- **API calls:** Revisar `src/lib/api.ts`
- **Componentes:** Revisar `src/app/`
- **Configuración:** Revisar `.env.local`

### Recursos del Backend
- Configuración Django: `/LedgerXpertz/settings.py`
- API Endpoints: `/facturacion/api/`
- Modelos: `/empresas/models.py`

---

## 🔗 Enlaces Útiles

### Documentación
- [Next.js Documentation](https://nextjs.org/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Django Tenants](https://django-tenants.readthedocs.io/)

### Tutoriales
- [Next.js App Router](https://nextjs.org/docs/app)
- [React Query Basics](https://tanstack.com/query/latest/docs/framework/react/guides/queries)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## 📊 Roadmap Visual

```
Fase 1: Fundación ✅
├── Setup inicial
├── Multi-tenant
└── Módulo facturas básico

Fase 2: Core 🔄
├── Dashboard
├── CRUD facturas completo
├── Módulos clientes/productos
└── Autenticación

Fase 3: UX/UI 📅
├── Tema claro/oscuro
├── Notificaciones
└── Animaciones

Fase 4: Avanzado 📅
├── Inventario
├── Reportes
└── Notas crédito/débito

Fase 5: Optimización 📅
├── SSR
├── PWA
└── Testing completo
```

---

**Última actualización:** 6 de diciembre de 2025  
**Versión:** 1.0.0  
**Estado:** En desarrollo activo  
**Autor:** LuchoProgramer
