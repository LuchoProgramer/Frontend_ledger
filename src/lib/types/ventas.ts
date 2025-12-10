export interface Factura {
    id: number;
    numero_autorizacion: string;
    fecha_emision: string;
    cliente_nombre: string;
    cliente: number;
    sucursal: number;
    usuario: number;
    tipo_comprobante: string;
    total_sin_impuestos: string;
    total_con_impuestos: string;
    valor_iva: string;
    estado: string;
    estado_pago: string;
    clave_acceso?: string;
    estado_sri?: 'PPR' | 'AUT' | 'NAT' | 'DEV';
    mensajes_sri?: string[];
    detalles?: DetalleFactura[];
}

export interface DetalleFactura {
    id: number;
    product_name: string;
    cantidad: number;
    precio_unitario: string;
    subtotal: string;
    valor_iva: string;
    total: string;
}

export interface FacturasResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: Factura[];
}

export interface FacturasParams {
    page?: number;
    page_size?: number;
    start_date?: string;
    end_date?: string;
    search?: string;
}
