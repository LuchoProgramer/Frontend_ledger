/**
 * Tipos para gestión de productos y categorías
 */

export interface Categoria {
    id: number;
    nombre: string;
    descripcion?: string;
}



export interface Producto {
    id: number;
    nombre: string;
    tipo: 'producto' | 'servicio';
    descripcion?: string;
    unidad_medida?: string;
    codigo_producto?: string;
    categoria_id?: number;
    categoria_nombre?: string;
    impuesto_id?: number;
    impuesto_nombre?: string;
    impuesto_porcentaje: number;
    stock_minimo: number;
    activo: boolean;
    created_at: string;
    slug?: string;
    mostrar_en_web?: boolean;
    es_premium?: boolean;
    meta_descripcion?: string;
    image?: string; // URL de la imagen si existe
    // Detalle
    presentaciones?: Presentacion[];
    sucursales_ids?: number[];
    stock?: number;
}

export interface ProductosListResponse {
    success: boolean;
    count?: number;
    next?: string | null;
    previous?: string | null;
    results?: Producto[]; // DRF Pagination
    data?: Producto[]; // Custom API
    error?: string;
}

export interface ProductoResponse {
    success: boolean;
    data?: Producto;
    error?: string;
}

export interface Impuesto {
    id: number;
    nombre: string;
    porcentaje: string;
    codigo: string;
}

export interface ImpuestosResponse {
    success: boolean;
    data?: Impuesto[];
    error?: string;
}

export interface Presentacion {
    id: number;
    nombre_presentacion: string;
    cantidad: number;
    precio: string;
    porcentaje_adicional?: string;
    sucursal_id?: number;
    sucursal_nombre?: string;
}

export interface PresentacionesResponse {
    success: boolean;
    data?: Presentacion[];
    error?: string;
}

export interface ProductoFormData {
    nombre: string;
    tipo: 'producto' | 'servicio';
    descripcion?: string;
    unidad_medida?: string;
    codigo_producto?: string;
    categoria_id?: number | '';
    impuesto_id?: number | '';
    stock_minimo: number;
    activo: boolean;
    precio_base?: string; // Para creación inicial
    mostrar_en_web?: boolean;
    es_premium?: boolean;
    meta_descripcion?: string;
    image?: File | null; // Nuevo campo para subida
}

export interface CategoriasResponse {
    success: boolean;
    data?: Categoria[];
    error?: string;
}
