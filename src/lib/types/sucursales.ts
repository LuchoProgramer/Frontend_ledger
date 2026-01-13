/**
 * Tipos para gestión de sucursales
 */

export interface Sucursal {
  id: number;
  nombre: string;
  direccion: string;
  telefono: string;
  codigo_establecimiento: string;
  punto_emision: string;
  es_matriz: boolean;
  secuencial_actual: string;
  latitud?: number | null;
  longitud?: number | null;
  mostrar_en_mapa?: boolean;
  usuarios_count?: number;
  usuarios?: Array<{
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
  }>;
}

export interface SucursalFormData {
  nombre: string;
  direccion: string;
  telefono: string;
  codigo_establecimiento: string;
  punto_emision: string;
  es_matriz: boolean;
  latitud?: number;
  longitud?: number;
  mostrar_en_mapa?: boolean;
}

export interface SucursalesListResponse {
  success: boolean;
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: Sucursal[];
  data?: Sucursal[];
  error?: string;
}

export interface SucursalResponse {
  success: boolean;
  data?: Sucursal;
  message?: string;
  error?: string;
}
