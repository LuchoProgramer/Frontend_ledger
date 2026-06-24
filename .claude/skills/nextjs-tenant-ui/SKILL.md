## Skill: Next.js Tenant UI + Edge

**Trigger:** Cuando se modifiquen o creen archivos `.tsx` (Páginas/Componentes), clientes API (`fetch`/Axios), o hooks de React Query.

### Reglas de Multi-Tenancy y Caché (CRÍTICO)

- Cualquier llamada de `fetch` que use ISR (Incremental Static Regeneration) **DEBE** incluir un tag dinámico basado en el tenant, por ejemplo:
  - `next: { tags: ['tenant-' + tenantName] }`.
- Prohibido cachear datos globales sin diferenciar el subdominio o el header `X-Tenant`. La clave de caché siempre debe ser específica por tenant.

### Validación Estricta con Zod

Regla de oro: **Nunca confíes en el tipado de TypeScript por sí solo al recibir datos de la API. Todo endpoint consumido debe pasar por un esquema de validación de `zod` antes de inyectarse en el estado de la aplicación o en React Query.**

### Autenticación en el Edge

- El código corre en Cloudflare Workers; no puedes usar librerías nativas de Node.js (como `fs` o `crypto` puro de Node).
- El header `X-Tenant` y el token JWT (si aplica) deben pasarse explícitamente en cada petición hacia el backend.

### Ejemplo de Código: Fetch en Server Component con Tag de Tenant + Zod

```tsx
// app/(tenant)/[tenant]/dashboard/page.tsx
import { headers } from "next/headers";
import { z } from "zod";

const DashboardSchema = z.object({
  total_mes: z.number(),
  pendientes: z.number(),
});

async function getDashboardData() {
  const h = headers();
  const tenant = h.get("x-tenant");
  if (!tenant) {
    throw new Error("Missing X-Tenant header");
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/dashboard/resumen/`,
    {
      headers: {
        "X-Tenant": tenant,
        // Incluir JWT si aplica
        // Authorization: `Bearer ${token}`,
      },
      next: {
        revalidate: 60,
        tags: [`tenant-${tenant}-dashboard`],
      },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch dashboard data");
  }

  const json = await res.json();
  const parsed = DashboardSchema.parse(json);
  return parsed;
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Total mes: {data.total_mes}</p>
      <p>Facturas pendientes: {data.pendientes}</p>
    </div>
  );
}
```
