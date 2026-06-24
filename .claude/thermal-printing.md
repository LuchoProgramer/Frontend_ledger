# Impresión Térmica POS

## Contexto

Persepolis Grill & Burgers (tenant `persepolis`) usa **Bematech LR2000** conectada por USB. Otros tenants no tienen impresora — la feature es completamente opcional.

**Impresora:** Bematech LR2000 · ESC/POS · 80mm · USB Tipo B + RS-232 · 24V 2.5A

## Regla de oro

**La impresión nunca bloquea la venta.** Si falla, la venta ya está en BD y el cajero ve un aviso claro.

## Estrategia elegida: `window.print()` desde Chrome

- USB Printer Class (VID_0FE6) — NO aparece como puerto COM, Web Serial API no aplica.
- Impresora LR2000 configurada en Windows como predeterminada; papel 72mm, sin márgenes.
- Sin QZ Tray, sin instalación extra.

## Estado de implementación

- [x] `handleProcessSale` abre `window.open('about:blank', '_blank')` ANTES del `await` (evita popup blocker)
- [x] Después del await: guarda `posRecibo` y `posComanda` en `localStorage`, navega la ventana a `/pos/recibo`
- [x] `/pos/recibo/page.tsx`: HTML monospace 72mm, auto-llama `window.print()` al cargar
- [x] `/pos/comanda/page.tsx`: auto-imprime; precio unitario en itálica por ítem; `VALOR TOTAL: $XX.XX` al pie
- [x] Guard de tenant: ~~`TENANTS_CON_IMPRESORA` hardcoded~~ → **centralizado en backend (2026-06-10)**

> **ACTUALIZADO 2026-06-10 — La activación de impresión/comanda ya NO es por lista hardcodeada.** Ahora vive en el backend: `Sucursal.impresora_activa` / `Sucursal.comanda_automatica` / `Sucursal.control_caja` + `Empresa.telefono_atencion`, expuestos en el payload de `turnos/verificar/` (cacheado en `pos_turno_cache`). El frontend lee `turno?.impresora_activa` (en `usePOSPayment.ts`), `pos_turno_cache.comanda_automatica` (en `recibo/page.tsx`), `sucursal.control_caja`/`turno?.control_caja` (en `pos/page.tsx` + `ShiftCloseModal`), y `turno?.telefono_atencion`. **Agregar un tenant nuevo con impresora = marcar el flag en la Sucursal desde admin Django, sin deploy de frontend.** En Fase 1 los hardcodes siguen como `?? fallback`; se eliminan en Fase 2 (ver `docs/superpowers/plans/2026-06-09-centralizacion-config-tenant-impl.md` en el repo raíz).

**Nota:** el nombre del negocio se mapea desde el subdominio en `/pos/recibo/page.tsx` (objeto `names`). Pendiente (fuera de alcance de la centralización): mover también a `Empresa.nombre_comercial`.

## Plan de migración al backend (cuando haya un segundo tenant con impresora)

**Problema:** `TENANTS_CON_IMPRESORA` hardcoded requiere deploy de frontend para agregar tenants.

**Pasos:**

1. **Backend — modelo** (`core/models.py`):
   ```python
   # En modelo Sucursal:
   impresora_activa = models.BooleanField(default=False)
   impresora_puerto = models.CharField(max_length=50, blank=True)
   ```
   Migración: `python manage.py makemigrations && python manage.py migrate_schemas --shared`

2. **Backend — serializer:** exponer `impresora_activa` en el payload de `turno-activo/` — así el POS lo tiene sin llamada extra.

3. **Frontend — tipo Turno:** agregar `impresora_activa?: boolean` a la interfaz `Turno`.

4. **Frontend — reemplazar el check hardcoded:**
   ```ts
   // Antes:
   const TENANTS_CON_IMPRESORA = ['persepolis'];
   if (TENANTS_CON_IMPRESORA.includes(currentTenant)) { ... }

   // Después:
   if (turno?.impresora_activa) { ... }
   ```

5. **Activar por sucursal** desde el admin Django: `Sucursal → impresora_activa = True`.

## Ticket ESC/POS — contenido mínimo

```
[Nombre del negocio]
[Dirección · Teléfono]
--------------------------------
# Pedido: {numero}    {hora}
--------------------------------
{item}  x{cant}    ${precio}
...
--------------------------------
TOTAL:             ${total}
Pago: {metodo}
================================
      Gracias por su compra
```
