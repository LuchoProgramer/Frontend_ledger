import type { ApiClientBase } from './_base';

type Ctor<T = ApiClientBase> = new (...args: any[]) => T;

export interface Gasto {
  id: number;
  sucursal: number;
  categoria: 'RENTA' | 'INSUMOS' | 'SERVICIOS' | 'OTRO';
  monto: string;
  fecha: string;
  descripcion: string;
  activo: boolean;
  usuario_creacion: number | null;
}

export function GastosMixin<TBase extends Ctor>(Base: TBase) {
  return class extends Base {

    async getGastos(params: Record<string, any> = {}) {
      const q = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== '') q.append(key, params[key]);
      });
      return this.request<{ results: Gasto[]; count: number }>(`/api/gastos/?${q.toString()}`);
    }

    async crearGasto(data: Partial<Gasto>) {
      return this.request<Gasto>('/api/gastos/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }

    async anularGasto(id: number) {
      return this.request<Gasto>(`/api/gastos/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ activo: false }),
      });
    }

    async getReporteUtilidad(params: Record<string, any> = {}) {
      const q = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== '') q.append(key, params[key]);
      });
      return this.request<{
        ingresos: number;
        gastos_total: number;
        gastos_por_categoria: Record<string, number>;
        utilidad_neta: number;
      }>(`/api/reportes/utilidad/?${q.toString()}`);
    }
  };
}
