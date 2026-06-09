import type {
  ProductosListResponse,
  ProductoResponse,
  CategoriasResponse,
  PresentacionesResponse,
  ImpuestosResponse,
  BulkPresentacionesResponse,
} from '../types/productos';
import type { ApiClientBase } from './_base';

type Ctor<T = ApiClientBase> = new (...args: any[]) => T;

export function ProductosMixin<TBase extends Ctor>(Base: TBase) {
  return class extends Base {

    async getProductos(params?: {
      page?: number; search?: string; categoria?: number;
      activo?: boolean; page_size?: number; sucursal?: number;
    }) {
      const q = new URLSearchParams();
      if (params?.page) q.append('page', params.page.toString());
      if (params?.page_size) q.append('page_size', params.page_size.toString());
      if (params?.search) q.append('search', params.search);
      if (params?.categoria) q.append('categoria', params.categoria.toString());
      if (params?.activo !== undefined) q.append('activo', params.activo.toString());
      if (params?.sucursal) q.append('sucursal', params.sucursal.toString());
      return this.request<ProductosListResponse>(`/api/auth/productos/${q.toString() ? `?${q}` : ''}`);
    }

    async getProducto(id: number) {
      return this.request<ProductoResponse>(`/api/auth/productos/${id}/`);
    }

    async crearProducto(data: any) {
      return this.request<ProductoResponse>('/api/auth/productos/', {
        method: 'POST',
        body: data instanceof FormData ? data : JSON.stringify(data),
      });
    }

    async actualizarProducto(id: number, data: any) {
      return this.request<ProductoResponse>(`/api/auth/productos/${id}/`, {
        method: 'PUT',
        body: data instanceof FormData ? data : JSON.stringify(data),
      });
    }

    async eliminarProducto(id: number) {
      return this.request<{ success: boolean; message: string }>(`/api/auth/productos/${id}/`, {
        method: 'DELETE',
      });
    }

    async uploadProductsExcel(file: File) {
      const formData = new FormData();
      formData.append('file', file);
      return this.request<{ success: boolean; creados: number; actualizados: number; errores: string[] }>(
        '/core/productos/carga-masiva/', { method: 'POST', body: formData }
      );
    }

    async uploadPresentationsExcel(file: File) {
      const formData = new FormData();
      formData.append('file', file);
      return this.request<{ success: boolean; creados: number; actualizados: number; errores: string[] }>(
        '/core/productos/carga-masiva-presentaciones/', { method: 'POST', body: formData }
      );
    }

    downloadProductsTemplate() {
      window.open(`${this.baseURL}/core/productos/descargar-plantilla/`, '_blank');
    }

    downloadPresentationsTemplate() {
      window.open(`${this.baseURL}/core/productos/descargar-plantilla-presentaciones/`, '_blank');
    }

    // ── Presentaciones ────────────────────────────────────────────────────────

    async getPresentaciones(productoId: number, sucursalId?: number) {
      const query = sucursalId ? `?sucursal_id=${sucursalId}` : '';
      return this.request<PresentacionesResponse>(`/api/auth/productos/${productoId}/presentaciones/${query}`);
    }

    async getBulkPresentaciones(sucursalId: number) {
      return this.request<BulkPresentacionesResponse>(
        `/api/auth/productos/presentaciones/bulk/?sucursal_id=${sucursalId}`
      );
    }

    async crearPresentacion(productoId: number, data: any) {
      return this.request<any>(`/api/auth/productos/${productoId}/presentaciones/`, {
        method: 'POST', body: JSON.stringify(data),
      });
    }

    async actualizarPresentacion(productoId: number, presentacionId: number, data: any) {
      return this.request<any>(`/api/auth/productos/${productoId}/presentaciones/${presentacionId}/`, {
        method: 'PUT', body: JSON.stringify(data),
      });
    }

    async eliminarPresentacion(productoId: number, presentacionId: number) {
      return this.request<any>(`/api/auth/productos/${productoId}/presentaciones/${presentacionId}/`, {
        method: 'DELETE',
      });
    }

    // ── Categorías ────────────────────────────────────────────────────────────

    async getCategorias() {
      return this.request<CategoriasResponse>('/api/auth/categorias/');
    }

    async crearCategoria(data: any) {
      return this.request<any>('/api/auth/categorias/', { method: 'POST', body: JSON.stringify(data) });
    }

    async actualizarCategoria(id: number, data: any) {
      return this.request<any>(`/api/auth/categorias/${id}/`, { method: 'PUT', body: JSON.stringify(data) });
    }

    async eliminarCategoria(id: number) {
      return this.request<any>(`/api/auth/categorias/${id}/`, { method: 'DELETE' });
    }

    // ── Impuestos ─────────────────────────────────────────────────────────────

    async getImpuestos() {
      return this.request<ImpuestosResponse>('/api/auth/impuestos/');
    }

    async crearImpuesto(data: any) {
      return this.request<any>('/api/auth/impuestos/', { method: 'POST', body: JSON.stringify(data) });
    }

    async actualizarImpuesto(id: number, data: any) {
      return this.request<any>(`/api/auth/impuestos/${id}/`, { method: 'PUT', body: JSON.stringify(data) });
    }

    async eliminarImpuesto(id: number) {
      return this.request<any>(`/api/auth/impuestos/${id}/`, { method: 'DELETE' });
    }
  };
}
