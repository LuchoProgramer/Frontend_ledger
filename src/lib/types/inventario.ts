
export interface InventarioItem {
    id: number;
    producto: number;
    producto_nombre: string;
    producto_codigo: string;
    sucursal: number;
    sucursal_nombre: string;
    cantidad: number; // Decimal string or number from backend
    fecha_actualizacion: string;
}

export interface InventarioResponse {
    results: InventarioItem[];
    count: number;
    num_pages: number;
    current_page: number;
    has_next: boolean;
    has_previous: boolean;
}

export interface MovimientoItem {
    id: number;
    producto: number;
    producto_nombre: string;
    sucursal: number;
    sucursal_nombre: string;
    tipo_movimiento: string;
    cantidad: number;
    motivo: string;
    usuario: number;
    usuario_nombre: string;
    fecha: string;
}

export interface MovimientosResponse {
    results: MovimientoItem[];
    count: number;
    num_pages: number;
    current_page: number;
}

// Auditoría Types
export interface AuditoriaItem {
    id: number;
    fecha_inicio: string;
    fecha_fin?: string;
    sucursal: string; // Nombre sucursal
    usuario: string; // Nombre usuario
    estado: 'BORRADOR' | 'FINALIZADA' | 'CANCELADA';
    total_items: number;
    observaciones?: string;
}

export interface DetalleAuditoriaItem {
    id: number;
    producto_id: number;
    producto_nombre: string;
    stock_sistema: number; // o string decimal
    conteo_fisico: number | null;
    diferencia: number | null;
    notas?: string;
}

export interface AuditoriaDetailResponse {
    id: number;
    sucursal_id: number;
    fecha_inicio: string;
    estado: string;
    items: DetalleAuditoriaItem[];
}
