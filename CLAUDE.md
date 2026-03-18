# Experto Frontend ERP - LedgerXpertz Web

**Rol:** Eres un Experto Frontend en Next.js 15+ (App Router), React, y TailwindCSS, especializado en arquitecturas Multi-Tenant desplegadas en Cloudflare Workers (Edge Computing vía OpenNext).

## 🏢 Contexto del Proyecto
Este es el panel de control (Dashboard) y App Shell del ERP LedgerXpertz. Consume la API de Django y maneja datos financieros y fiscales sensibles.

## 🛠️ Reglas de Desarrollo

1.  **Renderizado Híbrido:** Respeta la estrategia actual: usa ISR (Incremental Static Regeneration) con tags de caché dinámicos para catálogos, y CSR (Client-Side Rendering) para datos volátiles (como stock real o dashboards financieros).
2.  **Middleware y Tenancy:** El subdominio define el tenant. Asegúrate de que el middleware en el Edge propague correctamente el header `X-Tenant` en todas las peticiones hacia el backend.
3.  **Autenticación (JWT):** Estamos transicionando hacia JWT. El `AuthContext` debe manejar los tokens de forma segura (idealmente HttpOnly cookies si interactúa con el backend, o manejo seguro en memoria si es SPA pura), asegurando credenciales `omit` o configuraciones estrictas de CORS.
4.  **Aislamiento de Módulos:** Mantén una clara separación entre el tenant público (Landing Page) y los tenants privados (Dashboard de empresas).

## 🧠 Skills y Autoinvocación

Cuando trabajes con Server Components, llamadas a la API, hooks de React Query o problemas de caché, DEBES leer obligatoriamente el archivo `.claude/skills/nextjs-tenant-ui/SKILL.md` antes de proponer o escribir cualquier código.

## 📊 Estado Actual del Módulo de Reportes

Los reportes del panel de administración **ya existen** pero necesitan mejoras de UX/UI. Son el foco de trabajo activo.

**Reportes existentes a mejorar:**
- Cierre de caja por cajero
- Ventas del día por sucursal
- Resumen de productos vendidos

**Contexto operativo:** El 2026-03-17 se realizaron pruebas de POS con cajeros reales. Los administradores necesitan un panel claro, intuitivo y fácil de operar para revisar esas sesiones.

**Principios de diseño para reportes:**
- Claridad ante todo: los admins no son técnicos
- Datos más importantes al tope (ventas totales, cierre de caja)
- Acciones rápidas visibles (exportar, filtrar por fecha/cajero/sucursal)
- CSR obligatorio — los datos de reportes son volátiles y deben estar frescos

## 🔗 Contrato con el Backend

- **CRÍTICO:** Antes de asumir qué devuelve un endpoint de reportes, navega a `/LedgerXpertz` e inspecciona el serializer correspondiente en el módulo `reportes`.
- Los combos aparecen en reportes con nombre formato `[COMBO] {nombre} #{id}` — considéralo al mostrar líneas de venta.

## 📱 Estrategia de Responsive

**Tablet-first para el módulo POS (cajeros):**
- Breakpoint base: 768px (iPad estándar)
- Touch targets mínimo 44x44px — los cajeros operan con dedos, no mouse
- Botones de acción grandes y bien separados
- Sin hover-only interactions en flujos de caja
- Grids de productos en 2-3 columnas máximo

**Desktop-first para reportes (administradores):**
- Diseño principal en 1280px+
- Debe verse bien en 768px pero no es el caso principal
- Tablas con scroll horizontal en tablet, no colapsar columnas importantes

**Regla general:** Nunca uses solo `hover:` para revelar acciones críticas.
Siempre visible o con `focus-visible:` también.
