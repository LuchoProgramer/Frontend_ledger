export interface Group {
  id: number;
  name: string;
}

export interface SucursalSimple {
  id: number;
  nombre: string;
  codigo_establecimiento?: string;
  es_matriz?: boolean;
}

export interface Usuario {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: string;
  last_login: string | null;
  grupos: Group[];
  sucursales: SucursalSimple[];
  sucursales_count?: number;
}

export interface UsuarioFormData {
  username: string;
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  grupos: number[];
  sucursales: number[];
}

export interface UsuariosResponse {
  results: Usuario[];
  count: number;
  next: string | null;
  previous: string | null;
}

// Response wrappers matching Backend API
export interface UsuarioDetailResponse {
  success: boolean;
  usuario: Usuario;
  error?: string;
}

export interface GruposResponse {
  success: boolean;
  grupos: Group[];
}

export interface SucursalesResponse {
  success: boolean;
  sucursales: SucursalSimple[];
}
