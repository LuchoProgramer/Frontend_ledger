import type {
  UsuariosResponse,
  UsuarioDetailResponse,
  UsuarioFormData,
  GruposResponse,
  SucursalesResponse,
} from '../types/usuarios';
import type { ApiClientBase } from './_base';

type Ctor<T = ApiClientBase> = new (...args: any[]) => T;

export function AuthMixin<TBase extends Ctor>(Base: TBase) {
  return class extends Base {

    async login(username: string, password: string) {
      return this.request<{
        success: boolean;
        user?: {
          id: number; username: string; email: string;
          first_name: string; last_name: string;
          is_staff: boolean; is_superuser: boolean; groups: string[];
        };
        error?: string;
      }>('/api/auth/login/', { method: 'POST', body: JSON.stringify({ username, password }) });
    }

    async logout() {
      return this.request<{ success: boolean; message?: string }>('/api/auth/logout/', { method: 'POST' });
    }

    async getCurrentUser() {
      return this.request<{
        success: boolean;
        user?: {
          id: number; username: string; email: string;
          first_name: string; last_name: string;
          is_staff: boolean; is_superuser: boolean; groups: string[];
        };
      }>('/api/auth/me/');
    }

    async getTurnoActivo() {
      try {
        console.log('Llamando a /api/auth/turno-activo/')
        console.log('BaseURL:', this.baseURL)
        console.log('Tenant:', this.tenant)
        const result = await this.request<{
          success: boolean;
          tiene_turno_activo: boolean;
          turno?: { id: number; hora_inicio: string; sucursal: string | null };
        }>('/api/auth/turno-activo/');
        console.log('Respuesta exitosa de turno-activo:', result)
        return result;
      } catch (error: any) {
        console.error('Error en getTurnoActivo:', {
          error, type: typeof error, message: error?.message || 'Sin mensaje',
          status: error?.status, data: error?.data,
          keys: Object.keys(error || {}), stringified: JSON.stringify(error),
          isApiError: !!(error?.status !== undefined)
        });
        return {
          success: false,
          tiene_turno_activo: false,
          error: error?.message || error?.data?.error || 'Error desconocido al verificar turno'
        };
      }
    }

    async getCsrfToken() {
      return this.request<{ success: boolean; message?: string }>('/api/auth/csrf/');
    }

    // ── Usuarios ──────────────────────────────────────────────────────────────

    async getUsuarios(params?: {
      page?: number; page_size?: number; search?: string;
      grupo?: number; sucursal?: number; is_active?: boolean;
    }) {
      const q = new URLSearchParams();
      if (params?.page) q.append('page', params.page.toString());
      if (params?.page_size) q.append('page_size', params.page_size.toString());
      if (params?.search) q.append('search', params.search);
      if (params?.grupo) q.append('grupo', params.grupo.toString());
      if (params?.sucursal) q.append('sucursal', params.sucursal.toString());
      if (params?.is_active !== undefined) q.append('is_active', params.is_active.toString());
      return this.request<UsuariosResponse>(`/api/auth/usuarios/${q.toString() ? `?${q}` : ''}`);
    }

    async getUsuario(id: number) {
      return this.request<UsuarioDetailResponse>(`/api/auth/usuarios/${id}/`);
    }

    async crearUsuario(data: UsuarioFormData) {
      return this.request<UsuarioDetailResponse>('/api/auth/usuarios/', {
        method: 'POST', body: JSON.stringify(data),
      });
    }

    async actualizarUsuario(id: number, data: Partial<UsuarioFormData>) {
      return this.request<UsuarioDetailResponse>(`/api/auth/usuarios/${id}/`, {
        method: 'PUT', body: JSON.stringify(data),
      });
    }

    async eliminarUsuario(id: number) {
      return this.request<{ success: boolean; message: string }>(`/api/auth/usuarios/${id}/`, {
        method: 'DELETE',
      });
    }

    async getGrupos() {
      return this.request<GruposResponse>('/api/auth/usuarios/grupos/');
    }

    async getSucursales() {
      return this.request<SucursalesResponse>('/api/auth/usuarios/sucursales/');
    }

    // Solo las sucursales asignadas al usuario autenticado (todas si es staff).
    // El POS usa esta en vez de getSucursales() para que el selector de turno no
    // ofrezca sucursales ajenas (incidente la_huequita 2026-06-20).
    async getMisSucursales() {
      return this.request<SucursalesResponse>('/api/auth/mis-sucursales/');
    }
  };
}
