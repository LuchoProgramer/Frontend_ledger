'use client';

import { useState, useCallback } from 'react';
import { getApiClient } from '@/lib/api';
import type {
  ImportPreviewResponse, ImportLineaPreview, ImportLineaPayload, ImportAccion,
} from '@/lib/types/compras';

export interface LineaEnEdicion extends ImportLineaPreview {
  // null = el operador todavía no decidió nada para esta línea. Un "sin_match"
  // NUNCA arranca en 'omitir' — eso importaría en silencio sin que nadie elija;
  // omitir debe ser una acción explícita (el botón "Omitir" del row la setea).
  accion: ImportAccion | null;
  productoIdSeleccionado: number | null;
  cantidadResuelta: number;
  factorEmpaqueEditado: number;
  guardarCodigo: boolean;
  nuevoProducto: { nombre: string; categoria_id: number | null; impuesto_id: number | null; precio_venta: number } | null;
}

function lineaAEdicion(l: ImportLineaPreview): LineaEnEdicion {
  return {
    ...l,
    accion: l.estado === 'ok' ? 'mapear' : null,
    productoIdSeleccionado: l.producto_sugerido?.id ?? null,
    cantidadResuelta: Number(l.cantidad_xml) * Number(l.factor_empaque),
    factorEmpaqueEditado: Number(l.factor_empaque),
    guardarCodigo: false,
    nuevoProducto: null,
  };
}

function lineaResuelta(l: LineaEnEdicion): boolean {
  if (l.accion === null) return false;
  if (l.accion === 'omitir') return true;
  if (l.accion === 'mapear') return l.productoIdSeleccionado !== null;
  if (l.accion === 'crear') {
    return !!l.nuevoProducto && l.nuevoProducto.nombre.trim().length > 0 && l.nuevoProducto.precio_venta > 0;
  }
  return false;
}

export function useImportCompra() {
  const [paso, setPaso] = useState<'buscar' | 'mapear'>('buscar');
  const [cabecera, setCabecera] = useState<ImportPreviewResponse['cabecera'] | null>(null);
  const [proveedor, setProveedor] = useState<ImportPreviewResponse['proveedor'] | null>(null);
  const [lineas, setLineas] = useState<LineaEnEdicion[]>([]);
  const [claveAcceso, setClaveAcceso] = useState('');
  const [sucursalId, setSucursalId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [compraCreadaId, setCompraCreadaId] = useState<number | null>(null);

  const apiClient = getApiClient();

  const buscar = useCallback(async (clave: string, sucursal: number) => {
    setBuscando(true);
    setError(null);
    try {
      const res = await apiClient.previewImportarCompra(clave, sucursal);
      setClaveAcceso(clave);
      setSucursalId(sucursal);
      setCabecera(res.cabecera);
      setProveedor(res.proveedor);
      setLineas(res.lineas.map(lineaAEdicion));
      setPaso('mapear');
    } catch (err: any) {
      setError(err?.message || 'Error buscando la clave de acceso en el SRI');
    } finally {
      setBuscando(false);
    }
  }, [apiClient]);

  const actualizarLinea = useCallback((codigo: string, cambios: Partial<LineaEnEdicion>) => {
    setLineas((prev) => prev.map((l) => (l.codigo === codigo ? { ...l, ...cambios } : l)));
  }, []);

  // Suma TODAS las líneas del XML (incluidas las omitidas): Compra.total_sin_impuestos
  // en el backend siempre es el total real de la factura, no el subconjunto que se
  // termina importando a inventario. Este total solo es informativo para el operador
  // ("¿el XML que trajimos suma lo que dice su encabezado?"); el gate real para
  // habilitar "Registrar" es que TODAS las líneas tengan una acción asignada.
  const totalResuelto = lineas.reduce((acc, l) => acc + Number(l.total), 0);
  const totalXML = cabecera ? Number(cabecera.total_sin_impuestos) : 0;
  const cuadra = Math.abs(totalResuelto - totalXML) <= 0.02;
  const todasResueltas = lineas.length > 0 && lineas.every(lineaResuelta);
  const puedeConfirmar = todasResueltas && cuadra;

  const confirmar = useCallback(async () => {
    if (!puedeConfirmar || sucursalId === null) return;
    setConfirmando(true);
    setError(null);
    try {
      const payloadLineas: ImportLineaPayload[] = lineas.map((l) => ({
        codigo: l.codigo,
        // puedeConfirmar ya garantizó (via lineaResuelta) que l.accion no es null acá.
        accion: l.accion as ImportAccion,
        producto_id: l.accion === 'mapear' ? l.productoIdSeleccionado ?? undefined : undefined,
        nuevo: l.accion === 'crear' ? l.nuevoProducto ?? undefined : undefined,
        cantidad: l.cantidadResuelta,
        factor_empaque: l.factorEmpaqueEditado,
        guardar_codigo: l.guardarCodigo,
      }));
      const res = await apiClient.confirmarImportarCompra({
        clave_acceso: claveAcceso,
        sucursal_id: sucursalId,
        lineas: payloadLineas,
      });
      setCompraCreadaId(res.compra_id);
    } catch (err: any) {
      setError(err?.message || 'Error confirmando la compra');
    } finally {
      setConfirmando(false);
    }
  }, [apiClient, claveAcceso, sucursalId, lineas, puedeConfirmar]);

  return {
    paso, cabecera, proveedor, lineas, error, buscando, confirmando, compraCreadaId,
    puedeConfirmar, totalResuelto, totalXML,
    buscar, actualizarLinea, confirmar,
  };
}
