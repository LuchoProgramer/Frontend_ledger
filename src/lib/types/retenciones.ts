export interface Retencion {
    id: number;
    numero_retencion: string;
    fecha_emision: string;
    factura_id: number;
    factura_numero: string;
    proveedor_nombre: string;
    total_retencion: string;
    estado: string;
    estado_sri: string;
    pdf_url: string;
    xml_url: string;
    identificacion?: string; // Added for frontend compatibility
}

export interface DetalleRetencion {
    codigo?: string;
    codigo_impuesto?: string; // Alias
    codigo_retencion: string;
    base_imponible: number;
    porcentaje: number;
    valor?: number;
    valor_retenido?: number; // Alias
}

export interface CreateRetencionPayload {
    factura_id?: number; // Optional if created manually
    proveedor?: { id: number };
    documento_sustento?: {
        tipo_documento: string;
        numero_documento: string;
        fecha_emision: string;
        base_imponible_total: number;
        total_documento: number;
    };
    impuestos?: DetalleRetencion[]; // Reusing DetalleRetencion or similar structure
    fecha_emision?: string;
    detalles?: DetalleRetencion[]; // Legacy or alternative
}

export interface RetencionesResponse {
    success: boolean;
    count?: number;
    next?: string | null;
    previous?: string | null;
    results?: Retencion[];
}
