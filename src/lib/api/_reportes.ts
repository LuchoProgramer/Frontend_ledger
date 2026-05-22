import type { ApiClientBase } from './_base';

type Ctor<T = ApiClientBase> = new (...args: any[]) => T;

export function ReportesMixin<TBase extends Ctor>(Base: TBase) {
  return class extends Base {

    async getVentasChart(params: any = {}) {
      const q = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined) q.append(key, params[key]);
      });
      return this.request<any>(`/api/reportes/ventas-chart/?${q.toString()}`);
    }

    async getTopProductos(params: any = {}) {
      const q = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined) q.append(key, params[key]);
      });
      return this.request<any>(`/api/reportes/top-productos/?${q.toString()}`);
    }

    async getResumenGeneral(params: any = {}) {
      const q = new URLSearchParams();
      Object.keys(params).forEach(key => {
        // @ts-ignore
        if (params[key] !== undefined) q.append(key, params[key]);
      });
      return this.request<any>(`/api/reportes/resumen/?${q.toString()}`);
    }

    async getSalesReport(params: any = {}) {
      const q = new URLSearchParams();
      Object.keys(params).forEach(key => {
        // @ts-ignore
        if (params[key] !== undefined && params[key] !== '') q.append(key, params[key]);
      });
      return this.request<any>(`/api/reportes/ventas/?${q.toString()}`);
    }

    async exportSalesExcel(params: any = {}): Promise<Blob> {
      const q = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== '') q.append(key, params[key]);
      });
      const headers: Record<string, string> = {};
      if (this.tenant !== 'public') headers['X-Tenant'] = this.tenant;
      const response = await fetch(`${this.baseURL}/api/reportes/ventas/excel/?${q.toString()}`, {
        headers, credentials: 'include',
      });
      if (!response.ok) throw new Error('Error downloading excel');
      return response.blob();
    }
  };
}
