import type {
  SucursalesListResponse,
  SucursalResponse,
  SucursalFormData,
} from '../types/sucursales';
import type { ApiClientBase } from './_base';

type Ctor<T = ApiClientBase> = new (...args: any[]) => T;

export function SucursalesMixin<TBase extends Ctor>(Base: TBase) {
  return class extends Base {

    async getSucursalesList(params?: {
      page?: number; page_size?: number; search?: string; es_matriz?: boolean;
    }) {
      const q = new URLSearchParams();
      if (params?.page) q.append('page', params.page.toString());
      if (params?.page_size) q.append('page_size', params.page_size.toString());
      if (params?.search) q.append('search', params.search);
      if (params?.es_matriz !== undefined) q.append('es_matriz', params.es_matriz.toString());
      return this.request<SucursalesListResponse>(`/api/auth/sucursales/${q.toString() ? `?${q}` : ''}`);
    }

    async getSucursal(id: number) {
      return this.request<SucursalResponse>(`/api/auth/sucursales/${id}/`);
    }

    async crearSucursal(data: SucursalFormData) {
      return this.request<SucursalResponse>('/api/auth/sucursales/', {
        method: 'POST', body: JSON.stringify(data),
      });
    }

    async actualizarSucursal(id: number, data: Partial<SucursalFormData>) {
      return this.request<SucursalResponse>(`/api/auth/sucursales/${id}/`, {
        method: 'PUT', body: JSON.stringify(data),
      });
    }

    async eliminarSucursal(id: number) {
      return this.request<{ success: boolean; message: string }>(`/api/auth/sucursales/${id}/`, {
        method: 'DELETE',
      });
    }
  };
}
