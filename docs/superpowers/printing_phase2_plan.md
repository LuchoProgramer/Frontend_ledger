# Plan Fase 2 - Web Serial (Bematech LR2000)

Este plan detalla la transición de la impresión basada en el diálogo del sistema (`window.print()`) a una comunicación directa mediante la API **Web Serial**, permitiendo mayor control sobre los comandos ESC/POS, el cajón monedero y el corte de papel en la impresora Bematech LR2000.

## INFRAESTRUCTURA
- [ ] **Instalar driver Virtual COM Bematech en PC cajero**
  - **Acción:** Descargar e instalar el driver Prolific/Virtual COM para la LR2000.
  - **Link:** [Logic Controls Product Drivers](https://logiccontrols.com/product-drivers/)
  - **Validación:** El dispositivo debe aparecer como `LR_COM` o un puerto `COM` específico en el Administrador de Dispositivos de Windows.
  - **Configuración:** Baud rate 9600 (estándar de fábrica).

## BACKEND (LedgerXpertz)
- [ ] **Definir modelo `ConfiguracionImpresora`**
  - **Archivo:** `LedgerXpertz/empresas/models.py`
  - **Campos:** 
    - `tenant` (FK a Empresa)
    - `sucursal` (FK a core.Sucursal, `db_constraint=False`)
    - `tipo` (Choices: `SERIAL`, `BLUETOOTH`, `WINDOW`)
    - `nombre_impresora` (String para alias)
    - `config` (JSONField: para baudRate, productId, vendorId, deviceId)
    - `proposito` (Choices: `RECIBO`, `COMANDA`, `AMBOS`)
- [ ] **Ejecutar migraciones**
  - **Comandos:** `python manage.py makemigrations` y `python manage.py migrate_schemas`.
- [ ] **Implementar API CRUD**
  - **Serializer:** Crear `ConfiguracionImpresoraSerializer` en `LedgerXpertz/empresas/api/serializers.py`.
  - **ViewSet:** Crear `ConfiguracionImpresoraViewSet` en `LedgerXpertz/empresas/api/views.py`.
  - **Routing:** Registrar en `LedgerXpertz/empresas/api/urls.py` bajo `/api/empresas/configuracion-impresoras/`.

## FRONTEND (ledgerxpertz-frontend)
- [ ] **Desarrollar `PrintService.ts`**
  - **Archivo:** `src/lib/print/PrintService.ts`
  - **Responsabilidad:** Abstraer la conexión Web Serial.
  - **Métodos:**
    - `requestSerialPort()`: Solicitar permiso al usuario.
    - `printViaSerial(data, config)`: Enviar comandos ESC/POS (texto, corte, apertura cajón).
    - `fallbackToWindow(url)`: Llamar al flujo actual si falla Serial.
- [ ] **Crear interfaz de Configuración**
  - **Archivo:** `src/app/configuracion/impresoras/page.tsx`
  - **Funcionalidad:** Selector de sucursal, botón de "Conectar Impresora Serial" (Web Serial API) y guardado de `vendorId`/`productId` en el backend.
- [ ] **Actualizar Hook de Pago**
  - **Archivo:** `src/app/pos/hooks/usePOSPayment.ts`
  - **Cambio:** Importar `PrintService` y llamar a la impresión directa después de guardar en `printStore`, reemplazando el `window.open` automático por una ejecución silenciosa si la config existe.
- [ ] **Refactorizar Recibo**
  - **Archivo:** `src/app/pos/recibo/page.tsx`
  - **Cambio:** Integrar con `PrintService` para permitir "Re-imprimir" vía Serial desde la pantalla de visualización.

## PRUEBAS
- [ ] **Checklist Bematech LR2000:**
  - [ ] Permiso de puerto persistente en Chrome/Edge.
  - [ ] Impresión correcta de caracteres especiales (acentos/ñ).
  - [ ] Comando de corte automático (`GS V 1`) al final del ticket.
  - [ ] Apertura de cajón monedero (`ESC p 0 25 250`).
  - [ ] Fallback automático a `window.print()` si el puerto está ocupado o no disponible.
