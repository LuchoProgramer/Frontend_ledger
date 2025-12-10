// Types for Catalogs (Categories, Taxes)

export interface Categoria {
    id: number;
    nombre: string;
    descripcion?: string;
}

export interface CategoriaFormData {
    nombre: string;
    descripcion?: string;
}

export interface Impuesto {
    id: number;
    nombre: string;
    porcentaje: string;
    codigo: string;
}

export interface ImpuestoFormData {
    nombre: string;
    porcentaje: string;
    codigo: string;
}

export interface GenericListResponse<T> {
    success: boolean;
    data?: T[];
    error?: string;
}

export interface GenericDetailResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}
