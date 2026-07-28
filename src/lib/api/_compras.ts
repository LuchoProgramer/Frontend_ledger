import type {
  ComprasResponse, CreateCompraPayload,
  ImportPreviewResponse, ImportConfirmarPayload, ImportConfirmarResponse,
} from '../types/compras';
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

    async previewImportarCompra(claveAcceso: string, sucursalId: number) {
      return this.request<ImportPreviewResponse>('/api/compras/importar/preview/', {
        method: 'POST',
        body: JSON.stringify({ clave_acceso: claveAcceso, sucursal_id: sucursalId }),
      });
    }

    async confirmarImportarCompra(payload: ImportConfirmarPayload) {
      return this.request<ImportConfirmarResponse>('/api/compras/importar/confirmar/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }
  };
}
