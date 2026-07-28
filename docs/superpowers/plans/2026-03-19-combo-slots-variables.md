# Combo Slots Variables — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extender combos para que cada uno pueda tener slots variables (ej: elige tu mezcladora), con selección en el POS y descuento de stock automático.

**Architecture:** Tres modelos nuevos (`ComboSlot`, `ComboSlotCategoria`, `ComboSlotProducto`) extienden Combo sin romper combos existentes. El checkout valida y descuenta slots. El POS muestra un modal de selección antes de agregar al carrito si el combo tiene slots.

**Tech Stack:** Django 4.2, DRF, django-tenants, Next.js 15 App Router, TailwindCSS, TypeScript.

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `LedgerXpertz/combos/models.py` | Modificar | Agregar ComboSlot, ComboSlotCategoria, ComboSlotProducto |
| `LedgerXpertz/combos/migrations/000X_combo_slots.py` | Auto-crear | Migración de los 3 modelos nuevos |
| `LedgerXpertz/combos/admin.py` | Modificar | Registrar nuevos modelos como inlines |
| `LedgerXpertz/combos/serializers.py` | Modificar | ComboSlotSerializer + ComboSerializer con slots |
| `LedgerXpertz/combos/views.py` | Modificar | Action `opciones_slot` + `buscar` con slots |
| `LedgerXpertz/ventas/services/checkout_service.py` | Modificar | Validar slot_selections + descontar stock de slots |
| `LedgerXpertz/combos/tests.py` | Modificar | Tests de checkout (servicio) y de endpoint opciones_slot |
| `ledgerxpertz-frontend/src/lib/api.ts` | Modificar | `buscarCombos()` + `getComboOpciones()` |
| `ledgerxpertz-frontend/src/app/pos/page.tsx` | Modificar | SlotSelectionModal + integración carrito + checkout |

---

## Task 1: Modelos + Migración + Admin

**Files:**
- Modify: `LedgerXpertz/combos/models.py`
- Modify: `LedgerXpertz/combos/admin.py`

- [ ] **Step 1: Verificar que `Decimal` ya está importado en `combos/models.py`**

```bash
head -5 /Users/luisviteri/Proyectos/Inventario/LedgerXpertz/combos/models.py
```

Línea 1 debe decir `from decimal import Decimal`. Ya está importado — no es necesario agregarlo.

- [ ] **Step 2: Agregar los 3 modelos al final de `combos/models.py`**

```python
# Al final de combos/models.py, después de la clase ComboItem:

class ComboSlot(models.Model):
    """
    Un "hueco" configurable en un combo.
    El cajero elige qué producto va aquí al vender.
    Tenant: heredado vía combo → sucursal → empresa.
    """
    combo = models.ForeignKey(Combo, on_delete=models.CASCADE, related_name="slots")
    nombre = models.CharField(max_length=100, help_text='ej: "Mezcladora", "Vaso"')
    cantidad = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("1.00"),
        help_text="Unidades a descontar del producto elegido por el cajero",
    )
    obligatorio = models.BooleanField(default=True)
    orden = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["orden"]
        indexes = [models.Index(fields=["combo", "orden"])]

    def __str__(self):
        flag = "obligatorio" if self.obligatorio else "opcional"
        return f"Slot '{self.nombre}' ({flag}) — {self.combo.nombre}"


class ComboSlotCategoria(models.Model):
    """Categorías de productos permitidas para un slot."""
    slot = models.ForeignKey(ComboSlot, on_delete=models.CASCADE, related_name="categorias")
    categoria = models.ForeignKey("core.Categoria", on_delete=models.CASCADE)

    class Meta:
        unique_together = ("slot", "categoria")

    def __str__(self):
        return f"{self.slot.nombre} → categoría {self.categoria.nombre}"


class ComboSlotProducto(models.Model):
    """Productos específicos permitidos para un slot (más granular que categoría)."""
    slot = models.ForeignKey(ComboSlot, on_delete=models.CASCADE, related_name="productos")
    producto = models.ForeignKey("core.Producto", on_delete=models.CASCADE)

    class Meta:
        unique_together = ("slot", "producto")

    def __str__(self):
        return f"{self.slot.nombre} → producto {self.producto.nombre}"
```

- [ ] **Step 3: Reemplazar `combos/admin.py` completo**

```python
from django.contrib import admin
from .models import Combo, ComboItem, ComboSlot, ComboSlotCategoria, ComboSlotProducto


class ComboItemInline(admin.TabularInline):
    model = ComboItem
    extra = 0


class ComboSlotCategoriaInline(admin.TabularInline):
    model = ComboSlotCategoria
    extra = 1


class ComboSlotProductoInline(admin.TabularInline):
    model = ComboSlotProducto
    extra = 1


class ComboSlotInline(admin.TabularInline):
    model = ComboSlot
    extra = 0
    show_change_link = True


@admin.register(Combo)
class ComboAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre", "sucursal", "precio", "activo", "updated_at")
    list_filter = ("activo", "sucursal")
    search_fields = ("nombre",)
    inlines = [ComboItemInline, ComboSlotInline]


@admin.register(ComboSlot)
class ComboSlotAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre", "combo", "cantidad", "obligatorio", "orden")
    list_filter = ("obligatorio", "combo")
    inlines = [ComboSlotCategoriaInline, ComboSlotProductoInline]
```

- [ ] **Step 4: Generar migración**

```bash
cd /Users/luisviteri/Proyectos/Inventario/LedgerXpertz
python manage.py makemigrations combos --name combo_slots
```

Esperado: `combos/migrations/000X_combo_slots.py` creado.

- [ ] **Step 5: Aplicar migración**

```bash
# combos está en TENANT_APPS → migrate_schemas crea las tablas en cada schema de tenant
python manage.py migrate_schemas --tenant
```

Esperado: `OK` sin errores en cada schema.

- [ ] **Step 6: Verificar en shell**

```bash
python manage.py shell -c "
from combos.models import ComboSlot, ComboSlotCategoria, ComboSlotProducto
print('OK:', ComboSlot._meta.db_table, ComboSlotCategoria._meta.db_table)
"
```

Esperado: `OK: combos_comboslot combos_comboslotcategoria`

- [ ] **Step 7: Commit**

```bash
git add combos/models.py combos/admin.py combos/migrations/
git commit -m "feat(combos): modelos ComboSlot, ComboSlotCategoria, ComboSlotProducto"
```

---

## Task 2: Serializers

**Files:**
- Modify: `LedgerXpertz/combos/serializers.py`

- [ ] **Step 1: Reemplazar `combos/serializers.py` completo**

```python
from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from core.models import Sucursal
from .models import Combo, ComboItem, ComboSlot, ComboSlotCategoria, ComboSlotProducto


class ComboItemWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComboItem
        fields = ("id", "producto", "presentacion", "cantidad")


class ComboItemReadSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source="producto.nombre", read_only=True)
    presentacion_nombre = serializers.CharField(
        source="presentacion.nombre_presentacion", read_only=True
    )

    class Meta:
        model = ComboItem
        fields = (
            "id", "producto", "producto_nombre",
            "presentacion", "presentacion_nombre", "cantidad",
        )


class ComboSlotReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComboSlot
        fields = ("id", "nombre", "cantidad", "obligatorio", "orden")


class ComboSlotWriteSerializer(serializers.Serializer):
    nombre = serializers.CharField(max_length=100)
    cantidad = serializers.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("1.00")
    )
    obligatorio = serializers.BooleanField(default=True)
    orden = serializers.IntegerField(default=0)
    categorias = serializers.ListField(
        child=serializers.IntegerField(), required=False, default=list
    )
    productos = serializers.ListField(
        child=serializers.IntegerField(), required=False, default=list
    )

    def validate(self, attrs):
        if not attrs.get("categorias") and not attrs.get("productos"):
            raise serializers.ValidationError(
                "Un slot debe tener al menos una categoría o producto permitido."
            )
        return attrs


class ComboSerializer(serializers.ModelSerializer):
    items = ComboItemReadSerializer(many=True, read_only=True)
    items_write = ComboItemWriteSerializer(
        many=True, write_only=True, required=True, source="items"
    )
    slots = ComboSlotReadSerializer(many=True, read_only=True)
    slots_write = ComboSlotWriteSerializer(
        many=True, write_only=True, required=False, default=list
    )

    class Meta:
        model = Combo
        fields = (
            "id", "nombre", "descripcion", "precio", "activo", "sucursal",
            "created_at", "updated_at",
            "items", "items_write",
            "slots", "slots_write",
        )

    def validate_sucursal(self, sucursal: Sucursal):
        request = self.context.get("request")
        if request is not None and hasattr(request, "tenant"):
            if sucursal.empresa_id != request.tenant.id:
                raise serializers.ValidationError(
                    "La sucursal no pertenece a este tenant."
                )
        return sucursal

    def validate(self, attrs):
        precio = attrs.get("precio")
        if precio is not None and Decimal(str(precio)) <= 0:
            raise serializers.ValidationError(
                {"precio": "El precio debe ser mayor que cero."}
            )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        slots_data = validated_data.pop("slots_write", [])
        combo = Combo.objects.create(**validated_data)
        for item in items_data:
            ci = ComboItem(combo=combo, **item)
            ci.full_clean()
            ci.save()
        self._save_slots(combo, slots_data)
        return combo

    @transaction.atomic
    def update(self, instance: Combo, validated_data):
        items_data = validated_data.pop("items", None)
        # slots_write=None significa que no se envió → no modificar
        slots_data = validated_data.pop("slots_write", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.full_clean()
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item in items_data:
                ci = ComboItem(combo=instance, **item)
                ci.full_clean()
                ci.save()

        if slots_data is not None:
            # Full replace: igual que items
            instance.slots.all().delete()
            self._save_slots(instance, slots_data)

        return instance

    def _save_slots(self, combo: Combo, slots_data: list):
        for slot_data in slots_data:
            categorias_ids = slot_data.pop("categorias", [])
            productos_ids = slot_data.pop("productos", [])
            slot = ComboSlot.objects.create(combo=combo, **slot_data)
            for cat_id in categorias_ids:
                ComboSlotCategoria.objects.create(slot=slot, categoria_id=cat_id)
            for prod_id in productos_ids:
                ComboSlotProducto.objects.create(slot=slot, producto_id=prod_id)
```

- [ ] **Step 2: Verificar sin errores**

```bash
python manage.py shell -c "from combos.serializers import ComboSerializer; print('OK')"
```

Esperado: `OK`

- [ ] **Step 3: Commit**

```bash
git add combos/serializers.py
git commit -m "feat(combos): serializer con slots anidados (write/read, full replace)"
```

---

## Task 3: Views — opciones_slot + buscar actualizado

**Files:**
- Modify: `LedgerXpertz/combos/views.py`

- [ ] **Step 1: Reemplazar `combos/views.py` completo**

```python
from decimal import Decimal

from django.db import transaction
from django.db.models import DecimalField, OuterRef, Subquery
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from inventarios.models import Inventario
from core.models import Producto
from .models import Combo, ComboSlot
from .serializers import ComboSerializer


class ComboViewSet(viewsets.ModelViewSet):
    serializer_class = ComboSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        tenant = getattr(self.request, "tenant", None)
        qs = Combo.objects.all().select_related("sucursal").prefetch_related("items", "slots")
        if tenant is not None:
            qs = qs.filter(sucursal__empresa=tenant)
        return qs.order_by("-updated_at")

    @transaction.atomic
    def perform_create(self, serializer):
        serializer.save()

    @transaction.atomic
    def perform_update(self, serializer):
        serializer.save()

    @action(detail=True, methods=["get"], url_path="opciones_slot")
    def opciones_slot(self, request, pk=None):
        """
        GET /api/combos/{id}/opciones_slot/?slot_id=X&sucursal_id=Y

        Devuelve productos disponibles para ese slot filtrados por:
        - Categorías permitidas (ComboSlotCategoria) UNION productos explícitos (ComboSlotProducto)
        - Stock > 0 en la sucursal indicada
        - Pertenecen al tenant del request
        Una sola query para el stock (sin N+1).
        """
        tenant = getattr(request, "tenant", None)
        combo = self.get_object()  # ya filtra por tenant vía get_queryset

        slot_id = request.query_params.get("slot_id")
        sucursal_id = request.query_params.get("sucursal_id")

        if not slot_id or not sucursal_id:
            return Response(
                {"error": "slot_id y sucursal_id son obligatorios"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            slot = ComboSlot.objects.get(pk=slot_id, combo=combo)
        except ComboSlot.DoesNotExist:
            return Response({"error": "Slot no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        # Productos de categorías permitidas
        qs_cat = Producto.objects.filter(
            empresa=tenant,
            categoria__in=slot.categorias.values("categoria"),
            activo=True,
        )
        # Productos explícitos
        qs_prod = Producto.objects.filter(
            empresa=tenant,
            id__in=slot.productos.values("producto"),
            activo=True,
        )
        qs = (qs_cat | qs_prod).distinct()

        # Anotar stock y filtrar en una sola query (sin N+1)
        stock_subq = Inventario.objects.filter(
            producto=OuterRef("pk"),
            sucursal_id=sucursal_id,
        ).values("cantidad")[:1]

        qs = (
            qs.annotate(stock_en_sucursal=Subquery(stock_subq, output_field=DecimalField()))
            .filter(stock_en_sucursal__gt=0)
            .order_by("nombre")
        )

        data = [
            {
                "id": p.id,
                "nombre": p.nombre,
                "codigo": p.codigo_producto or "",
                "stock": float(p.stock_en_sucursal or 0),
            }
            for p in qs
        ]
        return Response(data)

    @action(detail=False, methods=["get"], url_path="buscar")
    def buscar(self, request):
        """
        GET /api/combos/buscar/?q=texto&sucursal_id=X
        Devuelve combos en formato POS. Incluye `slots` ordenados por `orden`
        para que el POS sepa si debe mostrar el modal de selección.
        """
        q = (request.query_params.get("q") or "").strip()
        sucursal_id = request.query_params.get("sucursal_id")

        qs = self.get_queryset().filter(activo=True)
        if sucursal_id:
            qs = qs.filter(sucursal_id=sucursal_id)
        if q:
            qs = qs.filter(nombre__icontains=q)

        data = []
        for combo in qs[:50]:
            data.append({
                "type": "combo",
                "id": combo.id,
                "nombre": combo.nombre,
                "precio": float(combo.precio),
                "items": [
                    {
                        "producto_id": ci.producto_id,
                        "presentacion_id": ci.presentacion_id,
                        "cantidad": float(ci.cantidad),
                    }
                    for ci in combo.items.all()
                ],
                "slots": [
                    {
                        "id": slot.id,
                        "nombre": slot.nombre,
                        "cantidad": float(slot.cantidad),
                        "obligatorio": slot.obligatorio,
                        "orden": slot.orden,
                    }
                    for slot in combo.slots.order_by("orden")
                ],
            })

        return Response(data)
```

- [ ] **Step 2: Verificar importaciones**

```bash
python manage.py shell -c "from combos.views import ComboViewSet; print('OK')"
```

Esperado: `OK`

- [ ] **Step 3: Commit**

```bash
git add combos/views.py
git commit -m "feat(combos): endpoint opciones_slot (sin N+1) + slots en buscar"
```

---

## Task 4: Checkout Service

**Files:**
- Modify: `LedgerXpertz/ventas/services/checkout_service.py`

Hay 4 puntos a modificar. Los pasos están ordenados de arriba a abajo del archivo.

- [ ] **Step 1: Actualizar import de combos (línea 13)**

```python
# Antes:
from combos.models import Combo
# Después:
from combos.models import Combo, ComboSlot
```

- [ ] **Step 2: Agregar imports de modelos al inicio de `finalizar_venta`, antes del bloque `for item in items_data` (~línea 43)**

Agregar estas dos líneas justo después de `with tenant_context(empresa):`:

```python
            from inventarios.models import Inventario as _Inv
            from core.models import Producto as _Prod
```

(El prefijo `_` evita colisión con `Producto` que ya se importa globalmente.)

- [ ] **Step 3: Reemplazar el bloque combo (líneas 46–121) — desde `if item.get("type") == "combo":` hasta `continue` inclusive**

```python
                    if item.get("type") == "combo":
                        combo_id = item.get("combo_id") or item.get("id")
                        if not combo_id:
                            raise ValueError("combo_id requerido para items de tipo combo")

                        combo = get_object_or_404(
                            Combo.objects.select_related("sucursal"), pk=combo_id, activo=True
                        )
                        if combo.sucursal_id != sucursal.id:
                            raise ValueError("El combo no pertenece a la sucursal del turno activo.")

                        combo_qty = Decimal(str(item.get("cantidad", 1)))
                        if combo_qty <= 0:
                            raise ValueError("La cantidad del combo debe ser mayor que cero.")

                        combo_items = list(
                            combo.items.select_related("producto", "presentacion").all()
                        )
                        if not combo_items:
                            raise ValueError("El combo no tiene items configurados.")

                        # ── Validar slot_selections ──────────────────────────────────
                        slot_selections_raw = item.get("slot_selections") or []
                        slots = list(
                            combo.slots.prefetch_related("categorias", "productos").order_by("orden")
                        )

                        # 1. Sin slot_id duplicados
                        slot_ids_enviados = [s["slot_id"] for s in slot_selections_raw]
                        if len(slot_ids_enviados) != len(set(slot_ids_enviados)):
                            raise ValueError("slot_id duplicado en slot_selections.")

                        # Mapa slot_id → producto_id (ignorar entradas con producto_id nulo)
                        selection_map = {
                            s["slot_id"]: s["producto_id"]
                            for s in slot_selections_raw
                            if s.get("producto_id") is not None
                        }

                        slot_selections_processed = []
                        for slot in slots:
                            producto_id = selection_map.get(slot.id)

                            if producto_id is None:
                                if slot.obligatorio:
                                    raise ValueError(
                                        f"El slot obligatorio '{slot.nombre}' no tiene selección."
                                    )
                                continue  # slot opcional sin selección — ok

                            # 2. Producto pertenece al tenant y al slot
                            try:
                                slot_producto = _Prod.objects.get(
                                    pk=producto_id, empresa=empresa, activo=True
                                )
                            except _Prod.DoesNotExist:
                                raise ValueError(
                                    f"Producto {producto_id} no encontrado o no pertenece al tenant."
                                )

                            cat_ids = list(
                                slot.categorias.values_list("categoria_id", flat=True)
                            )
                            prod_ids = list(
                                slot.productos.values_list("producto_id", flat=True)
                            )
                            pertenece = (
                                (slot_producto.categoria_id is not None
                                 and slot_producto.categoria_id in cat_ids)
                                or slot_producto.id in prod_ids
                            )
                            if not pertenece:
                                raise ValueError(
                                    f"El producto '{slot_producto.nombre}' no está permitido "
                                    f"en el slot '{slot.nombre}'."
                                )

                            # 3. Stock suficiente
                            # Nota: ValidacionInventarioService.validar_inventario requiere
                            # un objeto `presentacion` que los slots no tienen.
                            # ValidacionInventarioService.validar_stock_disponible no filtra
                            # por sucursal. Por eso se hace la consulta directa (producto+sucursal).
                            required_qty = slot.cantidad * combo_qty
                            inv = _Inv.objects.filter(
                                producto=slot_producto, sucursal=sucursal
                            ).first()
                            if not inv or inv.cantidad < required_qty:
                                raise ValueError(
                                    f"Stock insuficiente para '{slot_producto.nombre}' "
                                    f"en slot '{slot.nombre}'."
                                )

                            slot_selections_processed.append({
                                "slot": slot,
                                "producto": slot_producto,
                            })
                        # ── Fin validación slots ─────────────────────────────────────

                        # Producto+Presentación virtual para la factura (un solo ítem)
                        combo_code = f"COMBO-{combo.id}"
                        impuesto_combo = combo_items[0].producto.impuesto

                        nombre_combo_virtual = f"[COMBO] {combo.nombre} #{combo.id}"
                        combo_producto, _ = Producto.objects.get_or_create(
                            empresa=empresa,
                            codigo_producto=combo_code,
                            defaults={
                                "nombre": nombre_combo_virtual,
                                "tipo": "servicio",
                                "descripcion": combo.descripcion or "",
                                "activo": True,
                                "stock_minimo": 0,
                                "impuesto": impuesto_combo,
                            },
                        )
                        updated = False
                        if combo_producto.nombre != nombre_combo_virtual:
                            combo_producto.nombre = nombre_combo_virtual
                            updated = True
                        if combo_producto.activo != combo.activo:
                            combo_producto.activo = combo.activo
                            updated = True
                        if combo_producto.impuesto_id != getattr(impuesto_combo, "id", None):
                            combo_producto.impuesto = impuesto_combo
                            updated = True
                        if updated:
                            combo_producto.save()

                        combo_presentacion, _ = Presentacion.objects.get_or_create(
                            producto=combo_producto,
                            sucursal=sucursal,
                            nombre_presentacion="Combo",
                            canal="LOCAL",
                            defaults={
                                "cantidad": 1,
                                "precio": combo.precio,
                                "porcentaje_adicional": Decimal("0.00"),
                            },
                        )
                        if combo_presentacion.precio != combo.precio:
                            combo_presentacion.precio = combo.precio
                            combo_presentacion.save(update_fields=["precio"])

                        items_to_process.append({
                            "producto": combo_producto,
                            "presentacion": combo_presentacion,
                            "cantidad": combo_qty,
                            "precio_con_iva": Decimal(str(combo.precio)),
                            "is_combo": True,
                            "combo_items": combo_items,
                            "combo": combo,
                            "slot_selections_processed": slot_selections_processed,
                        })
                        continue
```

- [ ] **Step 4: Propagar `slot_selections_processed` a `detalles_calculados` (~línea 223)**

En el `detalles_calculados.append({...})` existente, agregar al final del dict:

```python
                    'slot_selections_processed': item.get('slot_selections_processed', []),
```

El dict completo queda así (añadir solo la última línea):
```python
                detalles_calculados.append({
                    'producto': prod,
                    'presentacion': item['presentacion'],
                    'cantidad': cant,
                    'precio_unitario': precio_unitario.quantize(Decimal('0.01')),
                    'subtotal': subtotal_db,
                    'valor_iva': iva_db,
                    'total': total_linea,
                    'is_combo': item.get('is_combo', False),
                    'combo_items': item.get('combo_items'),
                    'combo': item.get('combo'),
                    'slot_selections_processed': item.get('slot_selections_processed', []),  # ← nuevo
                })
```

- [ ] **Step 5: Agregar descuento de stock de slots en el bloque de deducción (~línea 330)**

Reemplazar el bloque `if d.get("is_combo"):` existente (solo ampliar, no borrar):

```python
                if d.get("is_combo"):
                    combo_qty = d["cantidad"]
                    for ci in d["combo_items"]:
                        InventarioAtomicoService.descontar_stock(
                            producto=ci.producto,
                            sucursal=sucursal,
                            cantidad=combo_qty * ci.cantidad * Decimal(str(ci.presentacion.cantidad)),
                            motivo=f"Venta COMBO {d['combo'].id} {'SRI' if not es_interno else 'Nota'} {factura.id}",
                            usuario=user,
                        )
                    # Descontar stock de los slots elegidos por el cajero
                    for sel in d.get("slot_selections_processed", []):
                        InventarioAtomicoService.descontar_stock(
                            producto=sel["producto"],
                            sucursal=sucursal,
                            cantidad=sel["slot"].cantidad * combo_qty,
                            motivo=f"COMBO-SLOT {d['combo'].nombre}/{sel['slot'].nombre} factura {factura.id}",
                            usuario=user,
                        )
```

- [ ] **Step 6: Verificar sintaxis**

```bash
python manage.py shell -c "from ventas.services.checkout_service import CheckoutService; print('OK')"
```

Esperado: `OK`

- [ ] **Step 7: Commit**

```bash
git add ventas/services/checkout_service.py
git commit -m "feat(checkout): validar y descontar stock de combo slots"
```

---

## Task 5: Tests

**Files:**
- Modify: `LedgerXpertz/combos/tests.py`

El archivo ya tiene `CombosCheckoutTestCase`. Se agregan dos clases nuevas al final:
1. `ComboSlotsCheckoutTestCase` — tests del servicio de checkout con slots
2. `ComboSlotEndpointTestCase` — tests del endpoint `opciones_slot` y serializer

- [ ] **Step 1: Agregar imports necesarios al inicio de `tests.py`**

Verificar que estén y agregar los que falten:

```python
from rest_framework.test import APIClient
from django_tenants.test.client import TenantClient
from combos.models import ComboSlot, ComboSlotCategoria, ComboSlotProducto
```

- [ ] **Step 2: Agregar `ComboSlotsCheckoutTestCase` al final de `tests.py`**

```python
class ComboSlotsCheckoutTestCase(TenantTestCase):
    """Tests de integración: checkout con slots variables."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        with schema_context("public"):
            cls.tenant = Empresa(
                schema_name="test_slots",
                nombre_comercial="Slots Test",
                razon_social="Slots Test S.A.",
                ruc="5555555555001",
            )
            cls.tenant.save()
            cls.domain = Dominio(domain="slots.localhost", tenant=cls.tenant, is_primary=True)
            cls.domain.save()

    def setUp(self):
        with tenant_context(self.tenant):
            self.user = User.objects.create_user(username="slots_user", password="pass")
            self.impuesto = Impuesto.objects.create(
                empresa=self.tenant, codigo_impuesto="2", codigo_porcentaje_sri="2",
                nombre="IVA 15%", porcentaje=Decimal("15.00"), activo=True,
            )
            self.sucursal = Sucursal.objects.create(
                nombre="Sucursal Slots", empresa=self.tenant, direccion="Av 1",
                telefono="0999999999", codigo_establecimiento="002", punto_emision="001",
            )
            self.sucursal.usuarios.add(self.user)
            self.turno = RegistroTurno.objects.create(
                usuario=self.user, sucursal=self.sucursal, inicio_turno=timezone.now()
            )
            # Categorías
            self.cat_licor = Categoria.objects.create(nombre="Licor", empresa=self.tenant)
            self.cat_mezcla = Categoria.objects.create(nombre="Mezcladora", empresa=self.tenant)
            # Producto fijo del combo
            self.ron = Producto.objects.create(
                nombre="Ron Abuelo", empresa=self.tenant, categoria=self.cat_licor,
                tipo="producto", stock_minimo=0, impuesto=self.impuesto, codigo_producto="RON1",
            )
            self.pres_ron = Presentacion.objects.create(
                producto=self.ron, sucursal=self.sucursal, nombre_presentacion="Unidad",
                cantidad=1, precio=Decimal("10.00"), canal="LOCAL",
                porcentaje_adicional=Decimal("0.00"),
            )
            Inventario.objects.create(producto=self.ron, sucursal=self.sucursal, cantidad=Decimal("20"))
            # Productos para el slot
            self.coca = Producto.objects.create(
                nombre="Coca Cola", empresa=self.tenant, categoria=self.cat_mezcla,
                tipo="producto", stock_minimo=0, impuesto=self.impuesto, codigo_producto="COCA1",
            )
            self.sprite = Producto.objects.create(
                nombre="Sprite", empresa=self.tenant, categoria=self.cat_mezcla,
                tipo="producto", stock_minimo=0, impuesto=self.impuesto, codigo_producto="SPR1",
            )
            Inventario.objects.create(producto=self.coca, sucursal=self.sucursal, cantidad=Decimal("10"))
            Inventario.objects.create(producto=self.sprite, sucursal=self.sucursal, cantidad=Decimal("5"))
            # Combo + slot obligatorio (categoría Mezcladora)
            self.combo = Combo.objects.create(
                nombre="Combo Norteño", precio=Decimal("15.00"), activo=True,
                sucursal=self.sucursal,
            )
            ComboItem.objects.create(
                combo=self.combo, producto=self.ron, presentacion=self.pres_ron,
                cantidad=Decimal("1"),
            )
            self.slot = ComboSlot.objects.create(
                combo=self.combo, nombre="Mezcladora", cantidad=Decimal("1"),
                obligatorio=True, orden=1,
            )
            ComboSlotCategoria.objects.create(slot=self.slot, categoria=self.cat_mezcla)

    def _vender(self, slot_selections=None):
        with tenant_context(self.tenant):
            return CheckoutService.finalizar_venta(
                turno=self.turno,
                cliente_data=None,
                items_data=[{
                    "type": "combo",
                    "combo_id": self.combo.id,
                    "cantidad": 1,
                    "slot_selections": slot_selections if slot_selections is not None else [],
                }],
                pagos_data=[{"codigo": "01", "total": 15.00}],
                es_interno=True,
            )

    def test_seleccion_valida_descuenta_stock_fijo_y_slot(self):
        """Stock del ron (fijo) y coca (slot) se descuentan."""
        with tenant_context(self.tenant):
            self._vender(slot_selections=[{"slot_id": self.slot.id, "producto_id": self.coca.id}])
            self.assertEqual(
                Inventario.objects.get(producto=self.ron, sucursal=self.sucursal).cantidad,
                Decimal("19"),
            )
            self.assertEqual(
                Inventario.objects.get(producto=self.coca, sucursal=self.sucursal).cantidad,
                Decimal("9"),
            )

    def test_slot_obligatorio_sin_seleccion_lanza_error(self):
        with tenant_context(self.tenant):
            with self.assertRaises(ValueError) as ctx:
                self._vender(slot_selections=[])
            self.assertIn("obligatorio", str(ctx.exception).lower())

    def test_producto_id_null_en_slot_obligatorio_lanza_error(self):
        """producto_id: null equivale a omitir la selección."""
        with tenant_context(self.tenant):
            with self.assertRaises(ValueError) as ctx:
                self._vender(
                    slot_selections=[{"slot_id": self.slot.id, "producto_id": None}]
                )
            self.assertIn("obligatorio", str(ctx.exception).lower())

    def test_producto_no_permitido_lanza_error(self):
        """Ron no pertenece a la categoría Mezcladora del slot."""
        with tenant_context(self.tenant):
            with self.assertRaises(ValueError) as ctx:
                self._vender(slot_selections=[{"slot_id": self.slot.id, "producto_id": self.ron.id}])
            self.assertIn("permitido", str(ctx.exception).lower())

    def test_slot_id_duplicado_lanza_error(self):
        with tenant_context(self.tenant):
            with self.assertRaises(ValueError) as ctx:
                self._vender(slot_selections=[
                    {"slot_id": self.slot.id, "producto_id": self.coca.id},
                    {"slot_id": self.slot.id, "producto_id": self.sprite.id},
                ])
            self.assertIn("duplicado", str(ctx.exception).lower())

    def test_slot_opcional_sin_seleccion_pasa(self):
        """Slot opcional sin selección no bloquea la venta."""
        with tenant_context(self.tenant):
            slot_opc = ComboSlot.objects.create(
                combo=self.combo, nombre="Extra", cantidad=Decimal("1"),
                obligatorio=False, orden=2,
            )
            ComboSlotCategoria.objects.create(slot=slot_opc, categoria=self.cat_mezcla)
            # Solo enviamos el slot obligatorio
            factura = self._vender(
                slot_selections=[{"slot_id": self.slot.id, "producto_id": self.coca.id}]
            )
            self.assertIsNotNone(factura)
            slot_opc.delete()

    def test_combo_sin_slots_con_slot_selections_pasa(self):
        """slot_selections enviados para combo sin slots son ignorados silenciosamente."""
        with tenant_context(self.tenant):
            combo_simple = Combo.objects.create(
                nombre="Combo Simple", precio=Decimal("10.00"), activo=True,
                sucursal=self.sucursal,
            )
            ComboItem.objects.create(
                combo=combo_simple, producto=self.ron, presentacion=self.pres_ron,
                cantidad=Decimal("1"),
            )
            with tenant_context(self.tenant):
                factura = CheckoutService.finalizar_venta(
                    turno=self.turno,
                    cliente_data=None,
                    items_data=[{
                        "type": "combo",
                        "combo_id": combo_simple.id,
                        "cantidad": 1,
                        "slot_selections": [{"slot_id": 9999, "producto_id": self.coca.id}],
                    }],
                    pagos_data=[{"codigo": "01", "total": 10.00}],
                    es_interno=True,
                )
            self.assertIsNotNone(factura)
            combo_simple.delete()
```

- [ ] **Step 3: Agregar `ComboSlotEndpointTestCase` al final de `tests.py`**

```python
class ComboSlotEndpointTestCase(TenantTestCase):
    """Tests del endpoint opciones_slot y del serializer."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        with schema_context("public"):
            cls.tenant = Empresa(
                schema_name="test_endpoint_slots",
                nombre_comercial="Endpoint Slots",
                razon_social="Endpoint Slots S.A.",
                ruc="6666666666001",
            )
            cls.tenant.save()
            cls.domain = Dominio(
                domain="endpoint-slots.localhost", tenant=cls.tenant, is_primary=True
            )
            cls.domain.save()

    def setUp(self):
        with tenant_context(self.tenant):
            self.user = User.objects.create_user(username="ep_user", password="pass")
            self.impuesto = Impuesto.objects.create(
                empresa=self.tenant, codigo_impuesto="2", codigo_porcentaje_sri="2",
                nombre="IVA 15%", porcentaje=Decimal("15.00"), activo=True,
            )
            self.sucursal = Sucursal.objects.create(
                nombre="Suc EP", empresa=self.tenant, direccion="Av 1",
                telefono="0999999999", codigo_establecimiento="003", punto_emision="001",
            )
            # Categorías y productos
            self.cat_mezcla = Categoria.objects.create(nombre="Mezcla", empresa=self.tenant)
            self.coca = Producto.objects.create(
                nombre="Coca Cola", empresa=self.tenant, categoria=self.cat_mezcla,
                tipo="producto", stock_minimo=0, impuesto=self.impuesto, codigo_producto="C1",
            )
            self.sprite = Producto.objects.create(
                nombre="Sprite", empresa=self.tenant, categoria=self.cat_mezcla,
                tipo="producto", stock_minimo=0, impuesto=self.impuesto, codigo_producto="S1",
            )
            self.ron = Producto.objects.create(
                nombre="Ron", empresa=self.tenant, categoria=None,
                tipo="producto", stock_minimo=0, impuesto=self.impuesto, codigo_producto="R1",
            )
            # Stock: coca tiene stock, sprite no, ron tiene stock
            Inventario.objects.create(producto=self.coca, sucursal=self.sucursal, cantidad=Decimal("5"))
            Inventario.objects.create(producto=self.sprite, sucursal=self.sucursal, cantidad=Decimal("0"))
            Inventario.objects.create(producto=self.ron, sucursal=self.sucursal, cantidad=Decimal("3"))
            # Combo + slot
            self.combo = Combo.objects.create(
                nombre="Combo EP", precio=Decimal("10.00"), activo=True, sucursal=self.sucursal,
            )
            self.slot = ComboSlot.objects.create(
                combo=self.combo, nombre="Mezcladora", cantidad=Decimal("1"),
                obligatorio=True, orden=1,
            )
            ComboSlotCategoria.objects.create(slot=self.slot, categoria=self.cat_mezcla)
            # Slot con producto explícito (ron, que no es de cat_mezcla)
            self.slot_exp = ComboSlot.objects.create(
                combo=self.combo, nombre="Extra", cantidad=Decimal("1"),
                obligatorio=False, orden=2,
            )
            ComboSlotProducto.objects.create(slot=self.slot_exp, producto=self.ron)

        self.client = TenantClient(self.tenant)
        self.client.force_login(self.user)

    def _get(self, url):
        with tenant_context(self.tenant):
            return self.client.get(url)

    def test_opciones_slot_filtra_por_categoria_con_stock(self):
        """Solo devuelve coca (stock>0); sprite excluida (stock=0)."""
        res = self._get(
            f"/api/combos/{self.combo.id}/opciones_slot/"
            f"?slot_id={self.slot.id}&sucursal_id={self.sucursal.id}"
        )
        self.assertEqual(res.status_code, 200)
        nombres = [p["nombre"] for p in res.json()]
        self.assertIn("Coca Cola", nombres)
        self.assertNotIn("Sprite", nombres)

    def test_opciones_slot_filtra_por_producto_explicito(self):
        """Ron aparece por estar en ComboSlotProducto aunque no tenga categoría Mezcla."""
        res = self._get(
            f"/api/combos/{self.combo.id}/opciones_slot/"
            f"?slot_id={self.slot_exp.id}&sucursal_id={self.sucursal.id}"
        )
        self.assertEqual(res.status_code, 200)
        nombres = [p["nombre"] for p in res.json()]
        self.assertIn("Ron", nombres)

    def test_opciones_slot_excluye_sin_stock(self):
        """Sprite con stock=0 no aparece en opciones."""
        res = self._get(
            f"/api/combos/{self.combo.id}/opciones_slot/"
            f"?slot_id={self.slot.id}&sucursal_id={self.sucursal.id}"
        )
        self.assertEqual(res.status_code, 200)
        nombres = [p["nombre"] for p in res.json()]
        self.assertNotIn("Sprite", nombres)

    def test_opciones_slot_otro_tenant_404(self):
        """Slot que no pertenece al combo del tenant → 404."""
        res = self._get(
            f"/api/combos/{self.combo.id}/opciones_slot/"
            f"?slot_id=99999&sucursal_id={self.sucursal.id}"
        )
        self.assertEqual(res.status_code, 404)

    def test_serializer_rechaza_slot_sin_categorias_ni_productos(self):
        """Slot vacío debe retornar 400."""
        from combos.serializers import ComboSlotWriteSerializer
        s = ComboSlotWriteSerializer(data={
            "nombre": "Vacío", "cantidad": "1.00", "obligatorio": True,
            "orden": 1, "categorias": [], "productos": [],
        })
        self.assertFalse(s.is_valid())
        self.assertIn("non_field_errors", s.errors)

    def test_patch_combo_con_slots_full_replace(self):
        """PATCH con slots_write reemplaza todos los slots anteriores."""
        with tenant_context(self.tenant):
            # Verificar que hay 2 slots antes
            self.assertEqual(self.combo.slots.count(), 2)
            # PATCH enviando solo 1 slot nuevo
            from combos.serializers import ComboSerializer
            from rest_framework.request import Request
            from django.test import RequestFactory
            rf = RequestFactory()
            request = rf.patch("/")
            request.tenant = self.tenant
            s = ComboSerializer(
                instance=self.combo,
                data={
                    "nombre": self.combo.nombre,
                    "precio": str(self.combo.precio),
                    "activo": True,
                    "sucursal": self.sucursal.id,
                    "items_write": [],
                    "slots_write": [{
                        "nombre": "Solo este", "cantidad": "1.00",
                        "obligatorio": True, "orden": 1,
                        "categorias": [self.cat_mezcla.id], "productos": [],
                    }],
                },
                context={"request": request},
                partial=True,
            )
            self.assertTrue(s.is_valid(), s.errors)
            s.save()
            self.combo.refresh_from_db()
            self.assertEqual(self.combo.slots.count(), 1)
            self.assertEqual(self.combo.slots.first().nombre, "Solo este")
```

- [ ] **Step 4: Correr solo los tests nuevos**

```bash
cd /Users/luisviteri/Proyectos/Inventario/LedgerXpertz
python manage.py test combos.tests.ComboSlotsCheckoutTestCase combos.tests.ComboSlotEndpointTestCase -v 2
```

Esperado: `13 tests, 0 errors, 0 failures`

- [ ] **Step 5: Correr suite completa de combos (no regressions)**

```bash
python manage.py test combos -v 2
```

Esperado: todos verdes.

- [ ] **Step 6: Commit**

```bash
git add combos/tests.py
git commit -m "test(combos): slots checkout + endpoint opciones_slot (13 casos)"
```

---

## Task 6: Deploy backend al VPS

- [ ] **Step 1: Subir archivos modificados**

```bash
cd /Users/luisviteri/Proyectos/Inventario/LedgerXpertz

# Archivos individuales (no directorios problemáticos)
rsync -avz \
  combos/models.py \
  combos/serializers.py \
  combos/views.py \
  combos/admin.py \
  combos/tests.py \
  root@178.156.128.85:/opt/ledgerxpertz/combos/

# Migración nueva (directory, usar -r incluido en -a)
rsync -avz combos/migrations/ \
  root@178.156.128.85:/opt/ledgerxpertz/combos/migrations/

# Checkout service
rsync -avz ventas/services/checkout_service.py \
  root@178.156.128.85:/opt/ledgerxpertz/ventas/services/
```

- [ ] **Step 2: Migrar y reiniciar**

```bash
ssh root@178.156.128.85 "
  cd /opt/ledgerxpertz &&
  docker compose exec -T web python manage.py migrate_schemas --tenant --noinput &&
  docker compose restart web &&
  sleep 5 &&
  docker compose logs web --tail=15
"
```

Esperado: gunicorn sin `ImportError` ni `OperationalError`.

- [ ] **Step 3: Smoke test**

```bash
ssh root@178.156.128.85 "cd /opt/ledgerxpertz && docker compose exec -T web python manage.py shell -c \"
from combos.models import ComboSlot
print('OK tabla:', ComboSlot._meta.db_table)
\" 2>/dev/null"
```

Esperado: `OK tabla: combos_comboslot`

---

## Task 7: Frontend POS — SlotSelectionModal

**Files:**
- Modify: `ledgerxpertz-frontend/src/lib/api.ts`
- Modify: `ledgerxpertz-frontend/src/app/pos/page.tsx`

### 7a — api.ts

- [ ] **Step 1: Agregar los dos métodos en `src/lib/api.ts` junto a `trasladoBulk`**

```typescript
  async buscarCombos(q: string, sucursalId: number) {
    const params = new URLSearchParams({ q, sucursal_id: String(sucursalId) });
    return this.request<Array<{
      type: 'combo';
      id: number;
      nombre: string;
      precio: number;
      items: { producto_id: number; presentacion_id: number; cantidad: number }[];
      slots: { id: number; nombre: string; cantidad: number; obligatorio: boolean; orden: number }[];
    }>>(`/api/combos/buscar/?${params}`);
  }

  async getComboOpciones(comboId: number, slotId: number, sucursalId: number) {
    const params = new URLSearchParams({
      slot_id: String(slotId),
      sucursal_id: String(sucursalId),
    });
    return this.request<Array<{
      id: number;
      nombre: string;
      codigo: string;
      stock: number;
    }>>(`/api/combos/${comboId}/opciones_slot/?${params}`);
  }
```

### 7b — pos/page.tsx

- [ ] **Step 2: Extender la interfaz `CartItem` (líneas 12–19) con campos combo opcionales**

```typescript
interface CartItem {
  producto: Producto;
  presentacion: Presentacion;
  cantidad: number;
  precio: number;
  subtotal: number;
  impuesto: number;
  total: number;
  // Combo (opcionales)
  isCombo?: boolean;
  comboId?: number;
  comboNombre?: string;
  slotSelections?: { slot_id: number; producto_id: number; producto_nombre: string }[];
}
```

- [ ] **Step 3: Agregar interfaces locales de slots (después de `CartItem`)**

```typescript
interface ComboSlotInfo {
  id: number;
  nombre: string;
  cantidad: number;
  obligatorio: boolean;
  orden: number;
}

interface ComboResult {
  type: 'combo';
  id: number;
  nombre: string;
  precio: number;
  items: { producto_id: number; presentacion_id: number; cantidad: number }[];
  slots: ComboSlotInfo[];
}

interface SlotOpcion {
  id: number;
  nombre: string;
  codigo: string;
  stock: number;
}
```

- [ ] **Step 4: Agregar estados del modal junto a los demás estados de UI**

```typescript
  const [combos, setCombos] = useState<ComboResult[]>([]);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [pendingCombo, setPendingCombo] = useState<ComboResult | null>(null);
  const [slotOpciones, setSlotOpciones] = useState<Record<number, SlotOpcion[]>>({});
  const [slotSelections, setSlotSelections] = useState<Record<number, SlotOpcion>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState('');
```

- [ ] **Step 5: Agregar funciones de carrito combo después de `addPresentationToCart`**

```typescript
  const addComboToCart = async (combo: ComboResult) => {
    if (combo.slots.length === 0) {
      commitComboToCart(combo, []);
      return;
    }
    setPendingCombo(combo);
    setSlotSelections({});
    setSlotError('');
    setLoadingSlots(true);
    setShowSlotModal(true);
    try {
      const sucursalId = turno!.sucursal;
      const results = await Promise.all(
        combo.slots.map(slot =>
          apiClient.getComboOpciones(combo.id, slot.id, sucursalId)
            .then(opciones => ({ slotId: slot.id, opciones: Array.isArray(opciones) ? opciones : [] }))
            .catch(() => ({ slotId: slot.id, opciones: [] as SlotOpcion[] }))
        )
      );
      const opcionesMap: Record<number, SlotOpcion[]> = {};
      results.forEach(({ slotId, opciones }) => { opcionesMap[slotId] = opciones; });
      setSlotOpciones(opcionesMap);
    } finally {
      setLoadingSlots(false);
    }
  };

  const commitComboToCart = (
    combo: ComboResult,
    selections: { slot_id: number; producto_id: number; producto_nombre: string }[]
  ) => {
    const virtualProducto = { id: combo.id, nombre: combo.nombre, stock: 99 } as unknown as Producto;
    const virtualPresentacion = {
      id: combo.id, precio: combo.precio, cantidad: 1, nombre_presentacion: 'Combo',
    } as unknown as Presentacion;
    const precio = combo.precio;
    setCart(prev => [
      ...prev,
      {
        producto: virtualProducto,
        presentacion: virtualPresentacion,
        cantidad: 1,
        precio,
        subtotal: precio,
        impuesto: 0,
        total: precio,
        isCombo: true,
        comboId: combo.id,
        comboNombre: combo.nombre,
        slotSelections: selections,
      },
    ]);
    showToast(`${combo.nombre} agregado`);
  };

  const handleConfirmSlots = () => {
    if (!pendingCombo) return;
    for (const slot of pendingCombo.slots) {
      if (slot.obligatorio && !slotSelections[slot.id]) {
        setSlotError(`Debes elegir una opción para "${slot.nombre}"`);
        return;
      }
    }
    const selections = Object.entries(slotSelections).map(([slotId, opcion]) => ({
      slot_id: Number(slotId),
      producto_id: opcion.id,
      producto_nombre: opcion.nombre,
    }));
    commitComboToCart(pendingCombo, selections);
    setShowSlotModal(false);
    setPendingCombo(null);
    setSlotSelections({});
    setSlotOpciones({});
  };
```

- [ ] **Step 6: Buscar combos en paralelo al buscar productos**

En el `useEffect` de debounce de búsqueda (donde se llama a `loadProductos`), agregar la búsqueda de combos:

```typescript
    if (turno) {
      apiClient.buscarCombos(searchTerm, turno.sucursal)
        .then(res => setCombos(Array.isArray(res) ? res : []))
        .catch(() => setCombos([]));
    }
```

- [ ] **Step 7: Actualizar el payload de checkout para enviar combos**

En la función que construye el `payload` (donde está `items: cart.map(...)`):

```typescript
        items: cart.map(item => {
          if (item.isCombo) {
            return {
              type: 'combo',
              combo_id: item.comboId,
              cantidad: item.cantidad,
              slot_selections: (item.slotSelections || []).map(s => ({
                slot_id: s.slot_id,
                producto_id: s.producto_id,
              })),
            };
          }
          return {
            id: item.producto.id,
            presentacion_id: item.presentacion.id,
            cantidad: item.cantidad,
            precio: item.precio,
          };
        }),
```

- [ ] **Step 8: Agregar tarjetas de combos en el catálogo**

En el JSX del catálogo (donde se renderizan las tarjetas de producto), agregar antes de la grilla de productos:

```tsx
              {combos.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-2 px-1">Combos</p>
                  <div className="grid grid-cols-2 gap-2">
                    {combos.map(combo => (
                      <button
                        key={`combo-${combo.id}`}
                        onClick={() => addComboToCart(combo)}
                        className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 text-left hover:border-amber-400 transition-colors"
                      >
                        <p className="text-sm font-semibold text-gray-900 truncate">{combo.nombre}</p>
                        <p className="text-xs text-amber-700 font-bold mt-1">${combo.precio.toFixed(2)}</p>
                        {combo.slots.length > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5">{combo.slots.length} opción(es)</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
```

- [ ] **Step 9: Mostrar nombre del combo y selecciones en el carrito**

En el render del item del carrito, reemplazar la línea del nombre del producto:

```tsx
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.isCombo ? item.comboNombre : item.producto.nombre}
                      </p>
                      {item.isCombo && item.slotSelections && item.slotSelections.length > 0 && (
                        <p className="text-xs text-gray-400 truncate">
                          {item.slotSelections.map(s => s.producto_nombre).join(', ')}
                        </p>
                      )}
```

- [ ] **Step 10: Agregar el `SlotSelectionModal` en el JSX (antes del `return` final)**

```tsx
      {showSlotModal && pendingCombo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">{pendingCombo.nombre}</h3>
              <p className="text-sm text-gray-500">Personaliza tu combo</p>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {loadingSlots ? (
                <div className="text-center py-8 text-gray-400">Cargando opciones...</div>
              ) : (
                pendingCombo.slots.map(slot => {
                  const opciones = slotOpciones[slot.id] || [];
                  const selected = slotSelections[slot.id];
                  return (
                    <div key={slot.id}>
                      <p className="text-sm font-semibold text-gray-700 mb-2">
                        {slot.nombre}
                        {slot.obligatorio
                          ? <span className="ml-1 text-red-500 text-xs">*obligatorio</span>
                          : <span className="ml-1 text-gray-400 text-xs">(opcional)</span>}
                      </p>
                      {opciones.length === 0 ? (
                        <p className="text-xs text-red-500 bg-red-50 p-2 rounded">
                          Sin productos disponibles con stock para este slot.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {opciones.map(op => (
                            <button
                              key={op.id}
                              type="button"
                              onClick={() =>
                                setSlotSelections(prev => ({ ...prev, [slot.id]: op }))
                              }
                              className={`px-3 py-2 rounded-lg border text-sm font-medium min-h-[40px] transition-colors ${
                                selected?.id === op.id
                                  ? 'bg-green-600 text-white border-green-600'
                                  : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                              }`}
                            >
                              {op.nombre}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              {slotError && (
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{slotError}</p>
              )}
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => { setShowSlotModal(false); setPendingCombo(null); }}
                className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSlots}
                disabled={
                  loadingSlots ||
                  pendingCombo.slots.some(
                    s => s.obligatorio && (slotOpciones[s.id] || []).length === 0
                  )
                }
                className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50"
              >
                Agregar al carrito
              </button>
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 11: Verificar TypeScript**

```bash
cd /Users/luisviteri/Proyectos/Inventario/ledgerxpertz-frontend
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

Esperado: sin output.

- [ ] **Step 12: Commit y push**

```bash
git add src/lib/api.ts src/app/pos/page.tsx
git commit -m "feat(pos): SlotSelectionModal para combos con opciones variables"
git push origin main
```

---

## Orden de ejecución

```
Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7
```

**NO iniciar Task 6 hasta que Task 5 pase al 100%.**
