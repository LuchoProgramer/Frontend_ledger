// Lógica pura de la pantalla de Notas de Crédito.
//
// Hay DOS tipos de nota, en tablas distintas del backend:
//   - ELECTRÓNICA: modelo `NotaCredito`, firmada y autorizada por el SRI.
//     GET /api/notas-credito/
//   - INTERNA: `Factura` con tipo_comprobante='04'. NO se envía al SRI; solo
//     aplica a ventas que nunca fueron comprobante electrónico.
//     GET /api/ventas/facturas/?tipo_comprobante=04
//
// La pantalla leía únicamente la segunda, así que las NC electrónicas no
// aparecían en ningún lado (la primera real de la plataforma quedó invisible).
// Se muestran ambas, distinguidas: una nota interna no anula nada ante el SRI y
// confundirlas fue justo lo que hizo creer que una factura estaba anulada.

export type OrigenNota = 'ELECTRONICA' | 'INTERNA';

export interface NotaCreditoFila {
    /** Único en toda la tabla: los ids se repiten entre las dos fuentes. */
    key: string;
    id: number;
    origen: OrigenNota;
    numero: string;
    cliente: string;
    fecha: string;
    total: number;
    /** null en las internas: nunca se enviaron al SRI, no tienen estado allá. */
    estadoSri: string | null;
}

const SIN_DATO = '—';

function aNumero(valor: unknown): number {
    const n = Number(valor);
    return Number.isFinite(n) ? n : 0;
}

export function normalizarElectronica(nc: any): NotaCreditoFila {
    return {
        key: `electronica-${nc.id}`,
        id: nc.id,
        origen: 'ELECTRONICA',
        numero: nc.numero_autorizacion || SIN_DATO,
        cliente: nc.cliente_nombre || SIN_DATO,
        fecha: nc.fecha_emision,
        total: aNumero(nc.total_con_impuestos),
        estadoSri: nc.estado_sri || null,
    };
}

export function normalizarInterna(nota: any): NotaCreditoFila {
    return {
        key: `interna-${nota.id}`,
        id: nota.id,
        origen: 'INTERNA',
        numero: nota.numero_autorizacion || SIN_DATO,
        cliente: nota.cliente_nombre || SIN_DATO,
        fecha: nota.fecha_emision,
        total: aNumero(nota.total_con_impuestos),
        estadoSri: null,
    };
}

export function combinarNotas(
    electronicas: any[] = [],
    internas: any[] = [],
): NotaCreditoFila[] {
    return [
        ...electronicas.map(normalizarElectronica),
        ...internas.map(normalizarInterna),
    ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}
