import type { InventarioResponse, MovimientosResponse } from '../types/inventario';
import type { ApiClientBase } from './_base';

type Ctor<T = ApiClientBase> = new (...args: any[]) => T;

export function InventarioMixin<TBase extends Ctor>(Base: TBase) {
  return class extends Base {

    async getInventario(params?: {
      page?: number; search?: string; sucursal?: number; agrupado?: boolean;
    }) {
      const q = new URLSearchParams();
      if (params?.page) q.append('page', params.page.toString());
      if (params?.search) q.append('search', params.search);
      if (params?.sucursal) q.append('sucursal', params.sucursal.toString());
      if (params?.agrupado) q.append('agrupado', 'true');
      return this.request<InventarioResponse>(`/api/auth/inventario/${q.toString() ? `?${q}` : ''}`);
    }

    async ajusteInventario(data: {
      producto_id: number; sucursal_id: number;
      tipo: 'ENTRADA' | 'SALIDA'; cantidad: number; motivo: string;
    }) {
      return this.request<any>('/api/auth/inventario/ajuste/', { method: 'POST', body: JSON.stringify(data) });
    }

    async ajusteInventarioBulk(items: {
      producto_id: number; sucursal_id: number;
      tipo: 'ENTRADA' | 'SALIDA'; cantidad: number; motivo: string;
    }[]) {
      return this.request<any>('/api/auth/inventario/ajuste/bulk/', { method: 'POST', body: JSON.stringify(items) });
    }

    async transferenciaInventario(data: {
      producto_id: number; origen_id: number; destino_id: number; cantidad: number;
      generar_guia?: boolean;
      transportista?: { ruc: string; razon_social: string; placa?: string };
    }) {
      return this.request<any>('/api/auth/inventario/transferencia/', { method: 'POST', body: JSON.stringify(data) });
    }

    async trasladoBulk(data: {
      origen_id: number; destino_id: number;
      productos: { producto_id: number; cantidad: number }[];
      generar_guia: boolean;
      transportista?: { ruc: string; razon_social: string; placa?: string };
    }) {
      return this.request<{
        message: string; guia_numero: string | null; transferencias: number; advertencia?: string;
      }>('/api/auth/inventario/transferencia/bulk/', { method: 'POST', body: JSON.stringify(data) });
    }

    async uploadInventario(file: File, sucursalId: number) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sucursal_id', sucursalId.toString());
      return this.request<{ success: boolean; message: string; errors: string[] }>(
        '/api/auth/inventario/carga-masiva/', { method: 'POST', body: formData }
      );
    }

    async downloadPlantillaInventario(): Promise<Blob> {
      const url = `${this.baseURL}/api/auth/inventario/plantilla/`;
      const response = await fetch(url, {
        headers: { 'X-Tenant': this.tenant },
        credentials: 'include',
      });
      if (!response.ok) throw { message: 'Error descarga', status: response.status };
      return response.blob();
    }

    async exportarInventario(params?: {
      search?: string; sucursal?: number; agrupado?: boolean;
    }): Promise<Blob> {
      const q = new URLSearchParams();
      if (params?.search) q.append('search', params.search);
      if (params?.sucursal) q.append('sucursal', params.sucursal.toString());
      if (params?.agrupado) q.append('agrupado', 'true');
      const url = `${this.baseURL}/api/auth/inventario/export/${q.toString() ? `?${q}` : ''}`;
      const response = await fetch(url, {
        headers: { 'X-Tenant': this.tenant },
        credentials: 'include',
      });
      if (!response.ok) throw { message: 'Error export', status: response.status };
      return response.blob();
    }

    async getMovimientos(params?: {
      page?: number; producto?: number; sucursal?: number;
      tipo?: string; fecha_desde?: string; fecha_hasta?: string;
    }) {
      const q = new URLSearchParams();
      if (params?.page) q.append('page', params.page.toString());
      if (params?.producto) q.append('producto', params.producto.toString());
      if (params?.sucursal) q.append('sucursal', params.sucursal.toString());
      if (params?.tipo) q.append('tipo', params.tipo);
      if (params?.fecha_desde) q.append('fecha_desde', params.fecha_desde);
      if (params?.fecha_hasta) q.append('fecha_hasta', params.fecha_hasta);
      return this.request<MovimientosResponse>(`/api/auth/inventario/movimientos/${q.toString() ? `?${q}` : ''}`);
    }
  };
}
