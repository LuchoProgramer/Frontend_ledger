export interface Proveedor {
    id: number;
    nombre: string;
    ruc: string;
    email?: string;
}

export interface DetalleCompra {
    id: number;
    producto: number;
    codigo_principal: string;
    descripcion: string;
    cantidad: string;
    precio_unitario: string;
    total_por_producto: string;
}

export interface Compra {
    id: number;
    proveedor: number;
    proveedor_nombre: string;
    sucursal: number;
    sucursal_nombre: string;
    fecha_emision: string;
    numero_factura: string;
    numero_autorizacion: string;
    total_sin_impuestos: string;
    total_con_impuestos: string;
    estado: string;
    detalles?: DetalleCompra[];
}

export interface ComprasResponse {
    success: boolean; // Assuming standard API wrapper or DRF pagination
    count?: number;
    next?: string | null;
    previous?: string | null;
    results?: Compra[];
}

export interface CreateCompraPayload {
    sucursal_id: number;
    proveedor_id: number;
    fecha_emision: string;
    numero_factura: string;
    numero_autorizacion?: string;
    total_sin_impuestos: number;
    total_con_impuestos: number;
    items: {
        producto_id: number;
        cantidad: number;
        precio_unitario: number;
        impuesto?: number;
    }[];
}
