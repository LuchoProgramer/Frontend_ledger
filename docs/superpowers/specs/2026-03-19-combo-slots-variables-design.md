# Combo Slots Variables — Design Spec

**Fecha:** 2026-03-19
**Repos afectados:** `/LedgerXpertz` (backend), `/ledgerxpertz-frontend` (POS frontend)

---

## Objetivo

Extender el módulo de combos para soportar slots variables — componentes que el cajero elige en el momento de la venta. Ejemplo: en el "Combo Zhumir", el cajero elige si la mezcladora es Coca Cola, Sprite o Agua. El precio del combo es siempre fijo; los slots solo afectan el stock descontado.

---

## Arquitectura General

```
Admin configura combo con slots (Django Admin o API CRUD)
        ↓
Cada slot define: nombre, cantidad, obligatorio, orden
        + categorías permitidas (ComboSlotCategoria)
        + productos específicos permitidos (ComboSlotProducto)
        ↓
POS busca combo → backend devuelve slots en respuesta de buscar
        ↓
Si combo tiene slots → POS abre SlotSelectionModal
        ↓
Cajero elige producto por slot → payload incluye slot_selections
        ↓
Checkout valida selecciones + descuenta stock fijo + stock de slots
```

---

## Modelos — `combos/models.py`

### ComboSlot

| Campo | Tipo | Notas |
|---|---|---|
| `combo` | FK → Combo (CASCADE) | Hereda tenant vía `combo.sucursal.empresa` |
| `nombre` | CharField(100) | ej: "Mezcladora" |
| `cantidad` | DecimalField(max_digits=10, decimal_places=2, default=1) | unidades a descontar del producto elegido |
| `obligatorio` | BooleanField(default=True) | si False, el cajero puede omitirlo |
| `orden` | PositiveIntegerField(default=0) | orden de aparición en el POS |

**Tenant isolation:** no requiere campo propio. La cadena `ComboSlot → Combo → sucursal → empresa` es suficiente. Todos los querysets sobre ComboSlot filtran vía `slot__combo__sucursal__empresa=tenant`.

**Validación al guardar:** debe tener al menos una `ComboSlotCategoria` o un `ComboSlotProducto`. Si ninguna existe, la configuración es inválida y el slot nunca devolvería opciones. Validar en el serializer antes de guardar.

### ComboSlotCategoria

| Campo | Tipo | Notas |
|---|---|---|
| `slot` | FK → ComboSlot (CASCADE) | |
| `categoria` | FK → core.Categoria (CASCADE) | |

### ComboSlotProducto

| Campo | Tipo | Notas |
|---|---|---|
| `slot` | FK → ComboSlot (CASCADE) | |
| `producto` | FK → core.Producto (CASCADE) | |

**Regla:** un slot puede tener categorías, productos específicos, o ambos. El endpoint `opciones_slot` devuelve la **unión** de ambos.

### Django Admin

Registrar `ComboSlot`, `ComboSlotCategoria`, `ComboSlotProducto` en `combos/admin.py` con `TabularInline` bajo `ComboAdmin`. Esto permite configurar slots desde el panel de administración sin necesidad de un frontend adicional.

---

## Serializers — `combos/serializers.py`

`ComboSerializer` se extiende con slots anidados. La estrategia de actualización es **full replace** (igual que los `items` actuales): en `PATCH`, si se envía el campo `slots`, se eliminan todos los slots existentes y se recrean. Si no se envía `slots`, no se modifican.

Payload de escritura:

```json
{
  "nombre": "Combo Zhumir",
  "precio": 5.50,
  "sucursal": 1,
  "items": [...],
  "slots": [
    {
      "nombre": "Mezcladora",
      "cantidad": "1.00",
      "obligatorio": true,
      "orden": 1,
      "categorias": [3],
      "productos": [15, 22, 31]
    }
  ]
}
```

- `cantidad` se envía como string decimal para evitar pérdida de precisión.
- Validación: si `categorias` y `productos` están ambos vacíos → error 400 `"Un slot debe tener al menos una categoría o producto permitido"`.

---

## Endpoints — `combos/views.py`

### GET `/api/combos/{id}/opciones_slot/?slot_id=X&sucursal_id=Y`

Devuelve productos disponibles para un slot. Queryset:

```python
# Productos de categorías permitidas del slot
qs_categorias = Producto.objects.filter(
    empresa=tenant,
    categoria__in=slot.categorias.values('categoria'),
    activo=True,
)
# Productos explícitos del slot
qs_productos = Producto.objects.filter(
    empresa=tenant,
    id__in=slot.productos.values('producto'),
    activo=True,
)
# Unión
qs = (qs_categorias | qs_productos).distinct()
```

Luego filtrar por stock disponible usando el modelo `Inventario` (campo `cantidad`):

```python
qs = qs.filter(
    inventarios__sucursal_id=sucursal_id,
    inventarios__cantidad__gt=0,
)
```

El filtro `empresa=tenant` garantiza aislamiento multi-tenant.

Respuesta (ordenada por `nombre`):
```json
[
  {"id": 15, "nombre": "Coca Cola 500ml", "stock": 24},
  {"id": 22, "nombre": "Sprite 500ml", "stock": 8},
  {"id": 31, "nombre": "Agua sin gas", "stock": 15}
]
```

### GET `/api/combos/buscar/?q=texto&sucursal_id=X` (actualizado)

Se agrega `slots` en la respuesta, **ordenados por `orden`**:

```json
{
  "type": "combo",
  "id": 1,
  "nombre": "Combo Zhumir",
  "precio": 5.50,
  "items": [...],
  "slots": [
    {
      "id": 3,
      "nombre": "Mezcladora",
      "cantidad": "1.00",
      "obligatorio": true,
      "orden": 1
    }
  ]
}
```

Si `slots` está vacío (`[]`), el POS agrega el combo directo al carrito (comportamiento actual — retrocompatible).

---

## Checkout — `ventas/services/checkout_service.py`

### Payload nuevo

```json
{
  "type": "combo",
  "combo_id": 1,
  "cantidad": 1,
  "slot_selections": [
    {"slot_id": 3, "producto_id": 15},
    {"slot_id": 4, "producto_id": 8}
  ]
}
```

- `slot_selections` es opcional. Si el combo no tiene slots, se ignora aunque venga en el payload.
- Si el combo tiene slots pero no se envía `slot_selections`, se trata como lista vacía.

### Validaciones (en orden)

1. **Sin duplicados en `slot_selections`:** si aparece el mismo `slot_id` más de una vez → `ValidationError` 400 `"slot_id duplicado en slot_selections"`.
2. **Slots obligatorios cubiertos:** todo slot con `obligatorio=True` debe tener una entrada en `slot_selections` con `producto_id` no nulo. Entrada con `producto_id: null` equivale a omitirla.
3. **Producto pertenece al slot:** el `producto_id` debe estar entre los productos válidos del slot (categorías + productos explícitos). Verificar también `producto.empresa == tenant`.
4. **Stock suficiente:** `slot.cantidad × combo_cantidad` disponible en la sucursal (usar `ValidacionInventarioService.validar_inventario`).

### Stock deduction

Dentro del mismo `transaction.atomic()` del checkout:

- **Items fijos:** comportamiento actual sin cambios.
- **Por cada `slot_selection` con `producto_id` no nulo:**
  ```python
  InventarioAtomicoService.descontar_stock(
      producto=producto,
      sucursal=sucursal,
      cantidad=Decimal(str(slot.cantidad)) * Decimal(str(combo_cantidad)),
      usuario=usuario,
      motivo=f"COMBO-SLOT {combo.nombre}/{slot.nombre}",
  )
  ```
  `InventarioAtomicoService.descontar_stock()` acepta `Decimal` directamente — no hay problema de tipos.

### Factura

El combo sigue siendo **un solo ítem** en la factura con el nombre del combo. Las selecciones de slots no aparecen como líneas separadas.

---

## Frontend POS — `src/app/pos/page.tsx`

### Flujo

1. Cajero busca y toca un combo.
2. Si `combo.slots.length === 0` → agrega directo al carrito (sin cambios, retrocompatible).
3. Si `combo.slots.length > 0` → abre `SlotSelectionModal`.

### SlotSelectionModal

- Modal centrado, aparece sobre el catálogo con backdrop oscuro.
- Al montar: llama `GET opciones_slot` por cada slot en paralelo (usando `sucursal_id` del turno activo).
- Por cada slot muestra: `slot.nombre` + badge `(obligatorio)` o `(opcional)` + pills de productos disponibles.
- Pills: al tocar selecciona (resaltado verde), toca de nuevo para deseleccionar si es opcional.
- **Estado de carga:** spinner mientras se cargan las opciones.
- **Estado de error / lista vacía para slot obligatorio:** mensaje `"No hay productos disponibles para este slot en esta sucursal"` + botón "Cancelar" (no permite confirmar).
- Botón "Agregar al carrito" habilitado solo cuando todos los slots obligatorios tienen selección.
- Al confirmar: agrega al carrito con `slot_selections` como metadata. Nombre en carrito: `"Combo Zhumir — Coca Cola"` (primer slot seleccionado).

### Payload al checkout

`slot_selections` viajan en el item del carrito y se envían en `POST /api/ventas/checkout/`.

---

## Migración

Una migración en `combos/` que crea las tres tablas nuevas. No modifica modelos existentes — totalmente retrocompatible. Los combos sin slots siguen funcionando igual.

---

## Tests — `combos/tests/`

| Test | Resultado esperado |
|---|---|
| Vender combo sin slots | Pasa igual que hoy — sin cambios |
| Vender combo con slot obligatorio y selección válida | Stock fijo + stock del slot descontados correctamente |
| Vender combo con slot obligatorio sin selección | `ValidationError` 400 |
| Vender combo con `producto_id: null` en slot obligatorio | `ValidationError` 400 (equivale a sin selección) |
| Vender combo con producto no permitido en slot | `ValidationError` 400 |
| Vender combo con `slot_id` duplicado en `slot_selections` | `ValidationError` 400 |
| Vender combo con slot opcional sin selección | Pasa — solo descuenta items fijos |
| Vender combo sin slots con `slot_selections` en payload | Pasa — `slot_selections` ignorado |
| `opciones_slot` filtra por categoría (tenant correcto) | Solo devuelve productos de esa categoría con stock, del tenant |
| `opciones_slot` filtra por producto explícito | Devuelve ese producto aunque no sea de la categoría |
| `opciones_slot` excluye productos sin stock | Producto con `cantidad=0` no aparece |
| `opciones_slot` con slot de otro tenant | 404 |
| Serializer rechaza slot sin categorías ni productos | Error 400 |
| PATCH combo con slots → full replace | Slots anteriores eliminados, nuevos creados |

---

## Orden de implementación

1. Modelos + migración + Django Admin
2. Serializers (CRUD combo con slots, validación de slots vacíos)
3. Endpoint `opciones_slot` + actualizar `buscar` con `order_by('orden')`
4. Checkout service (validaciones + stock de slots)
5. Tests backend
6. Frontend POS — `SlotSelectionModal`
