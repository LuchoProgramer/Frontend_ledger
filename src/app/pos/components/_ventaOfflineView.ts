import { posDB, VentaOfflineDB } from '@/lib/db/posDB';

export interface VentaOfflineResumen {
  id: number;
  estado: VentaOfflineDB['estado'];
  fecha: string;
  turnoId: number;
  cliente: string;
  total: string;
  items: string[];
  error: string | null;
}

// receipt_data lo escribió este mismo POS, pero si un registro viejo viene
// corrupto el diagnóstico debe mostrarlo igual, nunca reventar.
export function describirVentaOffline(v: VentaOfflineDB): VentaOfflineResumen {
  let receipt: any = {};
  try {
    receipt = JSON.parse(v.receipt_data || '{}');
  } catch {
    receipt = {};
  }
  const items = Array.isArray(receipt.items)
    ? receipt.items.map((i: any) => `${i.cantidad}× ${i.nombre} ($${Number(i.precio ?? 0).toFixed(2)})`)
    : [];
  return {
    id: v.id!,
    estado: v.estado,
    fecha: new Date(v.created_at).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }),
    turnoId: v.turno_id,
    cliente: receipt.cliente || 'Consumidor Final',
    total: typeof receipt.total === 'number' ? `$${receipt.total.toFixed(2)}` : '—',
    items,
    error: v.error_msg || null,
  };
}

// Vuelve a poner la venta en cola: el próximo processSyncQueue la reintenta.
// venta_uuid es idempotente en el backend → sin riesgo de duplicado.
export async function reintentarVentaOffline(id: number): Promise<void> {
  await posDB.ventas_offline.update(id, { estado: 'PENDIENTE', error_msg: undefined });
}

export async function descartarVentaOffline(id: number): Promise<void> {
  await posDB.ventas_offline.delete(id);
}
