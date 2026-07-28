# Ajuste por Lote — Spec de Diseño

**Fecha:** 2026-03-24
**Estado:** Aprobado

## Contexto

La contadora necesita ajustar el inventario de múltiples productos a la vez sin tener que hacerlo uno por uno. El módulo actual de Ajustes solo permite un producto por vez. Se crea una página separada "Ajuste por Lote" que sigue el patrón visual de Ingresos de Mercadería, con una diferencia deliberada: el motivo es global (único para todo el lote) en lugar de por línea, para reducir fricción en ajustes de conteo físico masivo.

## Ruta y navegación

- Nueva página: `/inventario/ajustes/lote`
- Se agrega enlace "Ajuste por Lote" en el menú lateral bajo la sección Inventario, con ícono `Layers` de lucide-react
- Se agrega botón secundario "Ajuste por Lote" en la página `/inventario/ajustes` para descubribilidad
- Roles permitidos: solo `Administrador`

## Layout — Dos paneles (tema indigo, igual que ajustes individuales)

### Panel izquierdo (agregar producto)

- Buscador de producto con debounce 400ms
- Dropdown de sucursal
- Input de cantidad con selector ENTRADA / SALIDA
- Botón "Agregar a la lista" (deshabilitado si faltan campos)

### Panel derecho (lista del lote)

- Tabla desktop con columnas: Producto | Sucursal | Tipo | Cantidad | Acción
- Cards mobile (`md:hidden`) siguiendo el mismo patrón de Ingresos de Mercadería
- Botón de papelera por fila para eliminar
- Estado vacío: mensaje "Agrega productos para comenzar"
- Abajo de la lista (dentro del panel derecho, NO sticky footer): motivo global + botón confirmar

### Motivo global y confirmación (dentro del panel derecho)

- Input de motivo global (texto libre, obligatorio, max 255 chars)
- Botón "Confirmar ajuste de N productos" — deshabilitado si lista vacía o sin motivo
- A diferencia de Ingresos (motivo por línea), aquí el motivo se ingresa una sola vez y se replica en todos los ítems enviados al backend

## API

Reutiliza el endpoint existente sin cambios en backend:

```
POST /api/auth/inventario/ajuste/bulk/
Body: [{ producto_id, sucursal_id, tipo: 'ENTRADA'|'SALIDA', cantidad, motivo }]
Response: { procesados, fallidos, exitosos: [{index, producto_id, nombre, cantidad}], errores: [{index, producto_id, error}] }
```

El motivo global del formulario se replica en cada ítem del array enviado al backend.

**Nota:** Los objetos en `errores` contienen `producto_id` pero NO el nombre del producto. Las filas de error se muestran como "Producto #{e.producto_id}: {e.error}" — no intentar resolver el nombre con una llamada adicional.

## Duplicados en el lote

Se permiten entradas duplicadas (mismo producto + sucursal) — es responsabilidad del usuario. No se agrega validación de duplicados.

## Semántica de cantidad

- El usuario ingresa el **delta directo** (cuánto sube o baja), no el stock objetivo
- Igual que Ingresos de Mercadería — no como el wizard de Ajustes individuales

## Pantalla de resultado

Igual al patrón de Ingresos de Mercadería:
- Exitosos y fallidos lado a lado
- Filas de error muestran ID del producto (no nombre, limitación del backend)
- Opción "Nuevo lote" o "Ir a inventario"

## Archivos a crear/modificar

- **Crear:** `src/app/inventario/ajustes/lote/page.tsx`
- **Modificar:** `src/app/inventario/ajustes/page.tsx` — agregar botón de acceso
- **Modificar:** `src/components/DashboardLayout.tsx` — agregar ítem con ícono `Layers`

## Riesgos

- Ningún cambio de backend requerido
- El flujo de ajuste individual existente no se toca
- Riesgo de romper funcionalidad existente: muy bajo
