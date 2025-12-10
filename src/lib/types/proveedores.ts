export interface Proveedor {
    id: number;
    nombre: string;
    ruc: string;
    direccion: string;
    telefono?: string;
    email?: string;
    activo: boolean;
}

export interface ProveedorFormData {
    nombre: string;
    ruc: string;
    direccion: string;
    telefono: string;
    email: string;
}

export interface ProveedoresResponse {
    success: boolean;
    data?: Proveedor[];
    results?: Proveedor[]; // DRF pagination
    count?: number;
    error?: string;
}
