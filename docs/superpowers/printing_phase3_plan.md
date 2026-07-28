# Plan Fase 3 - Web Bluetooth (GOOJPRT PT-210)

Habilitación de impresión móvil y portátil para ventas en mesa o entregas rápidas utilizando la API **Web Bluetooth**.

## FRONTEND (ledgerxpertz-frontend)
- [ ] **Extender `PrintService.ts` con soporte Bluetooth**
  - **Archivo:** `src/lib/print/PrintService.ts`
  - **Especificaciones:**
    - **Servicio BT:** `000018f0-0000-1000-8000-00805f9b34fb` (Genérico Impresión).
    - **Característica:** `00002af1-0000-1000-8000-00805f9b34fb`.
    - **Chunking:** Implementar envío de datos en fragmentos de 20 bytes (límite BLE) para evitar saturación del buffer.
- [ ] **Adaptación de Formato 58mm**
  - **Lógica:** Crear transformador de texto para 32 caracteres por línea (ancho estándar 58mm vs 42-48 de 80mm).
- [ ] **Actualizar Interfaz de Configuración**
  - **Archivo:** `src/app/configuracion/impresoras/page.tsx`
  - **Funcionalidad:** 
    - Escaneo de dispositivos Bluetooth cercanos.
    - Guardado de `deviceId` para reconexión rápida.
    - Test de impresión 58mm.

## PRUEBAS
- [ ] **Checklist GOOJPRT PT-210:**
  - [ ] Emparejamiento exitoso desde el navegador.
  - [ ] Formateo de texto ajustado a 32 columnas (sin cortes de palabras).
  - [ ] Estabilidad de conexión en impresiones de más de 10 ítems (validación de chunks).
  - [ ] Fallback a diálogo de sistema si Bluetooth está desactivado.
