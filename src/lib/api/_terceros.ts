import type { ProveedoresResponse } from '../types/proveedores';
import type { ApiClientBase } from './_base';

type Ctor<T = ApiClientBase> = new (...args: any[]) => T;

export function TercerosMixin<TBase extends Ctor>(Base: TBase) {
  return class extends Base {

    // ── Clientes ──────────────────────────────────────────────────────────────

    async getClientes(params?: { page?: number; search?: string }) {
      const q = new URLSearchParams();
      if (params?.page) q.append('page', params.page.toString());
      if (params?.search) q.append('search', params.search);
      return this.request<any>(`/api/clientes/${q.toString() ? `?${q}` : ''}`);
    }

    async getCliente(id: number) {
      return this.request<any>(`/api/clientes/${id}/`);
    }

    async crearCliente(data: any) {
      return this.request<any>('/api/clientes/', { method: 'POST', body: JSON.stringify(data) });
    }

    /**
     * Consulta un RUC/cédula (caché de clientes → API oficial del SRI).
     * Devuelve los datos normalizados o null si no hay datos / error.
     */
    async consultarRuc(identificacion: string): Promise<{
      identificacion: string;
      razon_social: string;
      direccion: string;
      tipo_identificacion: string;
      email?: string;
      telefono?: string;
    } | null> {
      try {
        const res = await this.request<any>(
          `/api/auth/sri/consultar-ruc/?identificacion=${encodeURIComponent(identificacion)}`
        );
        const data = res?.data;
        // Validación runtime ligera (el repo no usa Zod): razon_social string no vacío.
        if (!data || typeof data.razon_social !== 'string' || data.razon_social.trim() === '') {
          return null;
        }
        return data;
      } catch {
        return null; // 404 / red / etc. → sin datos, no bloquea el llenado manual
      }
    }

    // ── Proveedores ───────────────────────────────────────────────────────────

    async getProveedores(params?: { search?: string; page_size?: number }) {
      const q = new URLSearchParams();
      if (params?.search) q.append('search', params.search);
      if (params?.page_size) q.append('page_size', params.page_size.toString());
      return this.request<ProveedoresResponse>(`/api/auth/proveedores/${q.toString() ? `?${q}` : ''}`);
    }

    async crearProveedor(data: any) {
      return this.request<any>('/api/auth/proveedores/', { method: 'POST', body: JSON.stringify(data) });
    }

    async actualizarProveedor(id: number, data: any) {
      return this.request<any>(`/api/auth/proveedores/${id}/`, { method: 'PUT', body: JSON.stringify(data) });
    }

    async eliminarProveedor(id: number) {
      return this.request<any>(`/api/auth/proveedores/${id}/`, { method: 'DELETE' });
    }
  };
}
