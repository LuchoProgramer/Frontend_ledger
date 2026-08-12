import type { RetencionRecibida, RetencionesRecibidasResponse } from '../types/retenciones';
import type { ApiClientBase } from './_base';

type Ctor<T = ApiClientBase> = new (...args: any[]) => T;

export function RetencionesMixin<TBase extends Ctor>(Base: TBase) {
  return class extends Base {

    async getRetencionesRecibidas(params: Record<string, any> = {}) {
      const q = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== '') q.append(key, params[key]);
      });
      return this.request<RetencionesRecibidasResponse>(`/api/ventas/retenciones-recibidas/?${q.toString()}`);
    }

    async importarRetencionRecibida(claveAcceso: string) {
      return this.request<RetencionRecibida>('/api/ventas/retenciones-recibidas/importar/', {
        method: 'POST',
        body: JSON.stringify({ clave_acceso: claveAcceso }),
      });
    }
  };
}
