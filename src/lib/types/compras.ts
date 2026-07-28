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

export interface ImportLineaPreview {
    codigo: string;
    descripcion: string;
    cantidad_xml: string;
    precio: string;
    total: string;
    estado: 'ok' | 'sin_match';
    producto_sugerido: { id: number; nombre: string } | null;
    candidatos: { id: number; nombre: string }[];
    factor_empaque: string;
}

export interface ImportPreviewResponse {
    proveedor: {
        existe: boolean;
        id: number | null;
        ruc: string;
        razon_social: string;
    };
    cabecera: {
        numero_factura: string;
        fecha_emision: string;
        total_sin_impuestos: string;
        total_con_impuestos: string;
    };
    lineas: ImportLineaPreview[];
}

export type ImportAccion = 'mapear' | 'crear' | 'omitir';

export interface ImportLineaPayload {
    codigo: string;
    accion: ImportAccion;
    producto_id?: number;
    nuevo?: {
        nombre: string;
        categoria_id: number | null;
        impuesto_id: number | null;
        precio_venta: number;
    };
    cantidad: number;
    factor_empaque: number;
    guardar_codigo: boolean;
}

export interface ImportConfirmarPayload {
    clave_acceso: string;
    sucursal_id: number;
    lineas: ImportLineaPayload[];
}

export interface ImportConfirmarResponse {
    success: boolean;
    compra_id: number;
    resueltas: number;
    omitidas: number;
}
