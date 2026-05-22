import type { ComprasResponse, CreateCompraPayload } from '../types/compras';
import type { ApiClientBase } from './_base';

type Ctor<T = ApiClientBase> = new (...args: any[]) => T;

export function ComprasMixin<TBase extends Ctor>(Base: TBase) {
  return class extends Base {

    async getCompras(params: any = {}) {
      const q = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          q.append(key, params[key].toString());
        }
      });
      return this.request<ComprasResponse>(`/api/compras/?${q.toString()}`);
    }

    async createCompra(data: CreateCompraPayload) {
      return this.request<any>('/api/compras/nueva/', { method: 'POST', body: JSON.stringify(data) });
    }

    async getCompraDetail(id: number) {
      return this.request<any>(`/api/compras/${id}/`);
    }

    async uploadCompraXML(file: File, sucursalId: number) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sucursal_id', sucursalId.toString());
      return this.request<{ success: boolean; message: string; compra_id?: number; error?: string }>(
        '/api/compras/xml/', { method: 'POST', body: formData }
      );
    }
  };
}
